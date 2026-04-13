import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensurePublicUserProfile } from "@/lib/ensure-public-user";
import { getOpenAI, ANALYSIS_SYSTEM_PROMPT } from "@/lib/openai";

export const runtime = "nodejs";

type ProblemType = "coding_single" | "mcq_single" | "exam";

/** DB INTEGER + CHECK(0..100) — 모델이 문자열·실수를 주면 INSERT가 실패할 수 있음 */
function normalizeScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function parseProblemType(problem: Record<string, unknown>): ProblemType {
  const t = problem.problem_type;
  if (t === "mcq_single" || t === "exam" || t === "coding_single") return t;
  return "coding_single";
}

function gradeNonCoding(
  problemType: ProblemType,
  payload: unknown,
  answerPayload: unknown
): { score: number; feedback: string; answerSummary: string } {
  if (problemType === "mcq_single") {
    const p = (payload || {}) as { options?: string[]; correctIndex?: number };
    const a = (answerPayload || {}) as { selectedIndex?: number };
    const isCorrect = typeof a.selectedIndex === "number" && a.selectedIndex === p.correctIndex;
    const score = isCorrect ? 100 : 0;
    return {
      score,
      feedback: isCorrect ? "정답입니다." : "오답입니다. 선택지를 다시 검토해 보세요.",
      answerSummary:
        typeof a.selectedIndex === "number"
          ? `객관식 선택: ${a.selectedIndex + 1}번`
          : "객관식 선택: 미응답",
    };
  }

  if (problemType === "exam") {
    const p = (payload || {}) as {
      questions?: Array<{ type?: string; correctIndex?: number; answer?: string }>;
    };
    const a = (answerPayload || {}) as {
      answers?: Array<{ selectedIndex?: number; text?: string }>;
    };
    const questions = Array.isArray(p.questions) ? p.questions : [];
    const answers = Array.isArray(a.answers) ? a.answers : [];
    if (!questions.length) {
      return { score: 0, feedback: "시험 문제 구성이 비어 있습니다.", answerSummary: "응답 없음" };
    }
    let correct = 0;
    const lines: string[] = [];
    questions.forEach((q, i) => {
      const ans = answers[i] || {};
      if (q.type === "mcq") {
        const ok =
          typeof q.correctIndex === "number" &&
          typeof ans.selectedIndex === "number" &&
          q.correctIndex === ans.selectedIndex;
        if (ok) correct += 1;
        lines.push(`${i + 1}. 객관식: ${typeof ans.selectedIndex === "number" ? `${ans.selectedIndex + 1}번` : "미응답"}`);
      } else {
        const expected = (q.answer || "").trim().toLowerCase();
        const actual = (ans.text || "").trim().toLowerCase();
        const ok = !!expected && !!actual && expected === actual;
        if (ok) correct += 1;
        lines.push(`${i + 1}. 주관식: ${ans.text?.trim() ? "응답 완료" : "미응답"}`);
      }
    });
    const score = Math.round((correct / questions.length) * 100);
    return {
      score,
      feedback: `총 ${questions.length}문항 중 ${correct}문항 정답입니다.`,
      answerSummary: lines.join("\n"),
    };
  }

  return {
    score: 0,
    feedback: "지원하지 않는 문제 유형입니다.",
    answerSummary: "응답 없음",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ensured = await ensurePublicUserProfile(supabase, user);
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.message }, { status: 500 });
    }

    let body: {
      problem_id?: string;
      code?: string;
      explanation?: string;
      answer_payload?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { problem_id, code, explanation, answer_payload } = body;
    if (!problem_id) {
      return NextResponse.json(
        { error: "problem_id가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("*")
      .eq("id", problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { error: problemError?.message || "Problem not found" },
        { status: 404 }
      );
    }

    const problemType = parseProblemType(problem as Record<string, unknown>);
    const serializedAnswer =
      problemType === "coding_single"
        ? (typeof code === "string" ? code : "")
        : JSON.stringify(answer_payload || {});
    const explanationText =
      problemType === "coding_single" ? explanation ?? "" : "비코딩 문항 제출";

    if (problemType === "coding_single" && !serializedAnswer.trim()) {
      return NextResponse.json({ error: "코드를 입력하세요." }, { status: 400 });
    }

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .insert({
        user_id: user.id,
        problem_id,
        code: serializedAnswer,
        explanation: explanationText,
        result: "pending",
      })
      .select()
      .single();

    if (subError) {
      return NextResponse.json(
        { error: subError.message, code: subError.code },
        { status: 500 }
      );
    }

    if (problemType !== "coding_single") {
      const { score, feedback, answerSummary } = gradeNonCoding(
        problemType,
        (problem as Record<string, unknown>).question_payload,
        answer_payload
      );
      const judged = score >= 70 ? "correct" : "incorrect";
      await supabase.from("submissions").update({ result: judged }).eq("id", submission.id);
      const { data: analysis, error: analysisError } = await supabase
        .from("analysis")
        .insert({
          submission_id: submission.id,
          error_type: judged === "correct" ? "없음" : "오답",
          thinking_pattern: answerSummary,
          feedback,
          score,
        })
        .select()
        .single();
      if (analysisError) {
        return NextResponse.json({ error: analysisError.message }, { status: 500 });
      }
      return NextResponse.json({
        submission: { ...submission, result: judged },
        analysis,
      });
    }

    try {
      const analysisPrompt = `
문제: ${problem.title}
문제 설명: ${problem.description}
정답 코드: ${problem.solution_code ?? ""}
테스트 케이스: ${JSON.stringify(problem.test_cases ?? [])}

학생 코드:
\`\`\`
${serializedAnswer}
\`\`\`

학생의 풀이 설명: ${explanation || "제공되지 않음"}

위 정보를 바탕으로 학생의 코드를 분석해주세요.`;

      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content || "{}";
      let analysisResult: Record<string, unknown>;
      try {
        analysisResult = JSON.parse(rawContent) as Record<string, unknown>;
      } catch {
        throw new Error("AI 응답이 올바른 JSON이 아닙니다.");
      }

      const score = normalizeScore(analysisResult.score);
      const { data: analysis, error: analysisError } = await supabase
        .from("analysis")
        .insert({
          submission_id: submission.id,
          error_type: safeText(analysisResult.error_type, "없음").slice(0, 500),
          thinking_pattern: safeText(analysisResult.thinking_pattern).slice(0, 8000),
          feedback: safeText(analysisResult.feedback).slice(0, 8000),
          score,
        })
        .select()
        .single();

      if (analysisError) {
        return NextResponse.json(
          { error: `분석 저장 실패: ${analysisError.message}`, code: analysisError.code },
          { status: 500 }
        );
      }

      const judged = score >= 70 ? "correct" : "incorrect";
      await supabase.from("submissions").update({ result: judged }).eq("id", submission.id);

      return NextResponse.json({
        submission: { ...submission, result: judged },
        analysis,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("submissions")
        .update({ result: "incorrect" })
        .eq("id", submission.id);

      const feedback =
        msg.includes("OPENAI_API_KEY") || msg.includes("설정되지 않았습니다")
          ? "서버에 OPENAI_API_KEY가 없어 AI 분석을 실행하지 못했습니다. Vercel 등 배포 환경 변수를 확인하세요."
          : `AI 분석 중 오류가 발생했습니다. 잠시 후 다시 제출해 보세요. (${msg})`;

      const { data: fallbackAnalysis, error: fallbackErr } = await supabase
        .from("analysis")
        .insert({
          submission_id: submission.id,
          error_type: "분석 불가",
          thinking_pattern: "",
          feedback,
          score: 0,
        })
        .select()
        .single();

      if (fallbackErr) {
        return NextResponse.json(
          {
            error: `제출은 저장되었으나 분석 기록을 남기지 못했습니다: ${fallbackErr.message}`,
            submission: { ...submission, result: "incorrect" },
            code: fallbackErr.code,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        submission: { ...submission, result: "incorrect" },
        analysis: fallbackAnalysis,
        warning: "ai_failed",
      });
    }
  } catch (outer) {
    const message = outer instanceof Error ? outer.message : String(outer);
    console.error("[api/submissions]", outer);
    return NextResponse.json(
      { error: `서버 오류: ${message}` },
      { status: 500 }
    );
  }
}
