import {
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getOpenAI, PROBLEM_GENERATION_PROMPT } from "@/lib/openai";

export const runtime = "nodejs";

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  c: "C",
  cpp: "C++",
  php: "PHP",
  html_css: "HTML/CSS",
  react: "React",
};

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

function openAiErrorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) {
    return "OpenAI API 키가 잘못되었거나 만료되었습니다. Vercel의 OPENAI_API_KEY를 다시 확인하세요.";
  }
  if (err instanceof RateLimitError) {
    return "OpenAI 요청 한도에 걸렸습니다. 잠시 후 다시 시도하세요.";
  }
  if (err instanceof APIError) {
    const code = (err as APIError & { code?: string }).code;
    if (code === "insufficient_quota") {
      return "OpenAI 계정에 사용 가능한 크레딧이 없습니다. 결제·한도를 확인하세요.";
    }
    if (err.status === 400) {
      return `OpenAI 요청 형식 오류: ${err.message}`;
    }
    return err.message || "OpenAI API 요청에 실패했습니다.";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export async function POST(request: Request) {
  try {
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

    let body: {
      topic?: string;
      difficulty?: string;
      language?: string;
      mode?: "single" | "exam";
      singleType?: "coding" | "mcq";
      requirement?: string;
      example?: string;
      currentDraft?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
    }

    const { topic, difficulty } = body;
    const langKey = body.language && LANGUAGE_LABEL[body.language] ? body.language : "python";
    const language = LANGUAGE_LABEL[langKey];
    const mode = body.mode === "exam" ? "exam" : "single";
    const singleType = body.singleType === "mcq" ? "mcq" : "coding";
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "주제(topic)를 입력하세요." }, { status: 400 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PROBLEM_GENERATION_PROMPT },
        {
          role: "user",
          content: `언어: ${language}
주제: ${topic.trim()}
난이도: ${difficulty ?? "easy"}
생성 모드: ${mode === "exam" ? "시험 문제(다문항)" : singleType === "mcq" ? "단일 객관식(4지선다)" : "단일 코드 문제(주관식)"}
추가 요구사항: ${body.requirement?.trim() || "없음"}
참고 예시: ${body.example?.trim() || "없음"}
현재 작성 중인 초안(JSON): ${JSON.stringify(body.currentDraft || {}, null, 2)}

위 정보를 우선 반영해서 문제를 생성하세요.
- mode가 단일 객관식이면 description에 보기/정답 힌트를 포함하고, solution_code에는 정답 해설을 작성하세요.
- mode가 단일 코드 문제면 solution_code를 반드시 ${language}로 작성하세요.
- mode가 시험 문제면 description에 문항 번호를 나눠 작성하고, test_cases는 대표 케이스만 요약해서 넣으세요.`,
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
    console.error("[api/ai/generate-problem]", err);
    const message = openAiErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
