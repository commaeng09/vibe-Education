import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getOpenAI, PROBLEM_GENERATION_PROMPT } from "@/lib/openai";

/** Edge가 아닌 Node에서 실행해 process.env를 안정적으로 읽습니다. */
export const runtime = "nodejs";

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      return JSON.parse(fence[1].trim()) as Record<string, unknown>;
    }
    throw new Error("AI 응답이 올바른 JSON 형식이 아닙니다.");
  }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "서버에서 OPENAI_API_KEY를 읽지 못했습니다. Vercel → Settings → Environment Variables에 OPENAI_API_KEY를 추가하고 Environment에 Production을 체크한 뒤 Redeploy 하세요. (.env.local은 배포에 포함되지 않습니다.) 로그인 후 /api/debug/openai-env 에서 인식 여부를 확인할 수 있습니다.",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "로그인 세션이 없습니다. 이메일로 로그인한 뒤 다시 시도하세요. (데모 빠른 로그인만 한 상태에서는 AI API를 호출할 수 없습니다.)",
      },
      { status: 401 }
    );
  }

  let body: { topic?: string; difficulty?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { topic, difficulty } = body;
  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return NextResponse.json({ error: "주제(topic)를 입력하세요." }, { status: 400 });
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PROBLEM_GENERATION_PROMPT },
        {
          role: "user",
          content: `주제: ${topic.trim()}\n난이도: ${difficulty ?? "easy"}\n\n위 주제와 난이도에 맞는 Python 프로그래밍 문제를 생성해주세요.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도하세요." },
        { status: 502 }
      );
    }

    const parsed = parseJsonObject(raw);
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "AI 응답에 title·description이 없습니다. 주제를 바꿔 다시 시도하세요.",
        },
        { status: 502 }
      );
    }

    const problem = {
      title: parsed.title,
      description: parsed.description,
      difficulty:
        parsed.difficulty === "medium" || parsed.difficulty === "hard"
          ? parsed.difficulty
          : "easy",
      solution_code:
        typeof parsed.solution_code === "string"
          ? parsed.solution_code
          : "# 코드를 입력하세요",
      test_cases: Array.isArray(parsed.test_cases)
        ? parsed.test_cases.map((tc: unknown) => {
            const t = tc as Record<string, unknown>;
            return {
              input: typeof t.input === "string" ? t.input : "",
              expected_output:
                typeof t.expected_output === "string"
                  ? t.expected_output
                  : String(t.expected_output ?? ""),
            };
          })
        : [],
    };

    return NextResponse.json({ problem });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? msg
          : "AI 문제 생성에 실패했습니다. API 키·크레딧·네트워크를 확인하세요.",
      },
      { status: 500 }
    );
  }
}
