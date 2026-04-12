import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getOpenAI, PROBLEM_GENERATION_PROMPT } from "@/lib/openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { topic, difficulty } = body;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PROBLEM_GENERATION_PROMPT },
        {
          role: "user",
          content: `주제: ${topic}\n난이도: ${difficulty}\n\n위 주제와 난이도에 맞는 Python 프로그래밍 문제를 생성해주세요.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const problem = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    return NextResponse.json({ problem });
  } catch {
    return NextResponse.json(
      { error: "AI 문제 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
