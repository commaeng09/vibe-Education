import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai, ANALYSIS_SYSTEM_PROMPT } from "@/lib/openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { problem_id, code, explanation } = body;

  const { data: problem } = await supabase
    .from("problems")
    .select("*")
    .eq("id", problem_id)
    .single();

  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .insert({
      user_id: user.id,
      problem_id,
      code,
      explanation,
      result: "pending",
    })
    .select()
    .single();

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  try {
    const analysisPrompt = `
문제: ${problem.title}
문제 설명: ${problem.description}
정답 코드: ${problem.solution_code}
테스트 케이스: ${JSON.stringify(problem.test_cases)}

학생 코드:
\`\`\`
${code}
\`\`\`

학생의 풀이 설명: ${explanation || "제공되지 않음"}

위 정보를 바탕으로 학생의 코드를 분석해주세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysisResult = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    const { data: analysis, error: analysisError } = await supabase
      .from("analysis")
      .insert({
        submission_id: submission.id,
        error_type: analysisResult.error_type || "없음",
        thinking_pattern: analysisResult.thinking_pattern || "",
        feedback: analysisResult.feedback || "",
        score: analysisResult.score || 0,
      })
      .select()
      .single();

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500 });
    }

    const result = analysisResult.score >= 70 ? "correct" : "incorrect";
    await supabase
      .from("submissions")
      .update({ result })
      .eq("id", submission.id);

    return NextResponse.json({ submission: { ...submission, result }, analysis });
  } catch (err) {
    await supabase
      .from("submissions")
      .update({ result: "incorrect" })
      .eq("id", submission.id);

    return NextResponse.json(
      {
        submission: { ...submission, result: "incorrect" },
        analysis: null,
        error: "AI analysis failed",
      },
      { status: 200 }
    );
  }
}
