import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getOpenAI, INSIGHT_SYSTEM_PROMPT } from "@/lib/openai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { problem_id } = body;

  const { data: analyses } = await supabase
    .from("analysis")
    .select("*, submissions!inner(problem_id, code, explanation)")
    .eq("submissions.problem_id", problem_id);

  if (!analyses || analyses.length === 0) {
    return NextResponse.json(
      { error: "No submissions to analyze" },
      { status: 400 }
    );
  }

  try {
    const summaryData = analyses.map((a) => ({
      error_type: a.error_type,
      thinking_pattern: a.thinking_pattern,
      score: a.score,
      feedback: a.feedback,
    }));

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INSIGHT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음은 특정 문제에 대한 ${analyses.length}개의 학생 제출 분석 결과입니다:\n\n${JSON.stringify(summaryData, null, 2)}\n\n이 데이터를 기반으로 문제 인사이트를 생성해주세요.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const insight = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    const { data: existingInsight } = await supabase
      .from("problem_insights")
      .select("id")
      .eq("problem_id", problem_id)
      .single();

    if (existingInsight) {
      await supabase
        .from("problem_insights")
        .update({
          common_errors: insight.common_errors || [],
          confusion_points: insight.confusion_points || [],
          difficulty_score: insight.difficulty_score || 50,
        })
        .eq("id", existingInsight.id);
    } else {
      await supabase.from("problem_insights").insert({
        problem_id,
        common_errors: insight.common_errors || [],
        confusion_points: insight.confusion_points || [],
        difficulty_score: insight.difficulty_score || 50,
      });
    }

    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json(
      { error: "Insight generation failed" },
      { status: 500 }
    );
  }
}
