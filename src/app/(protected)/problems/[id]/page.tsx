"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/code-editor";
import { DEMO_PROBLEMS, DEMO_ANALYSIS } from "@/lib/demo-data";
import type { Problem } from "@/types/database";
import Link from "next/link";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const demo = isDemo();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("# 여기에 코드를 작성하세요\n\n");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [examAnswers, setExamAnswers] = useState<Array<{ selectedIndex?: number; text?: string }>>([]);
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submitErrorDetail, setSubmitErrorDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblem = async () => {
      if (demo) {
        const found = DEMO_PROBLEMS.find((p) => p.id === params.id);
        if (found) setProblem(found);
        setLoading(false);
        return;
      }

      const { createClient } = await import("@/lib/supabase-browser");
      const supabase = createClient();
      const { data } = await supabase
        .from("problems")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) setProblem(data as unknown as Problem);
      setLoading(false);
    };

    fetchProblem();
  }, [params.id, demo]);

  const handleSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    setResult(null);
    setSubmitErrorDetail(null);

    if (demo) {
      await new Promise((r) => setTimeout(r, 1500));
      const demoSubId = "demo-sub-002";
      setResult("success");
      setSubmitting(false);
      router.push(`/analysis/${demoSubId}`);
      return;
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          code,
          explanation,
          answer_payload:
            (problem.problem_type || "coding_single") === "mcq_single"
              ? { selectedIndex }
              : (problem.problem_type || "coding_single") === "exam"
                ? { answers: examAnswers }
                : undefined,
        }),
      });

      let data: {
        submission?: { id: string };
        analysis?: unknown;
        error?: string;
      } = {};
      try {
        data = await response.json();
      } catch {
        setSubmitErrorDetail("서버 응답을 읽을 수 없습니다.");
        setResult("error");
        return;
      }

      if (!response.ok) {
        setSubmitErrorDetail(
          typeof data.error === "string" ? data.error : `오류 (${response.status})`
        );
        setResult("error");
        return;
      }

      if (data.submission?.id) {
        setResult("success");
        router.push(`/analysis/${data.submission.id}`);
        return;
      }

      setSubmitErrorDetail(
        typeof data.error === "string" ? data.error : "제출 응답에 submission이 없습니다."
      );
      setResult("error");
    } catch {
      setSubmitErrorDetail("네트워크 오류가 발생했습니다.");
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse-slow text-muted">문제를 불러오는 중...</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-lg">문제를 찾을 수 없습니다.</p>
        <Link href="/problems">
          <Button variant="secondary" className="mt-4">문제 목록으로</Button>
        </Link>
      </div>
    );
  }

  const problemType = problem.problem_type || "coding_single";
  const payload = (problem.question_payload || {}) as {
    type?: string;
    options?: string[];
    questions?: Array<{
      type?: "coding" | "mcq";
      title?: string;
      description?: string;
      options?: string[];
    }>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/problems"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        문제 목록으로
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{problem.title}</CardTitle>
                <DifficultyBadge difficulty={problem.difficulty} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {problem.description}
              </div>
            </CardContent>
          </Card>

          {problem.test_cases && problem.test_cases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">테스트 케이스</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {problem.test_cases.map((tc, idx) => (
                    <div key={idx} className="bg-secondary rounded-lg p-3 font-mono text-sm">
                      <div>
                        <span className="text-muted">입력: </span>
                        <span>{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-muted">출력: </span>
                        <span>{tc.expected_output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {problemType === "coding_single" && (
            <>
              <Card className="p-0 overflow-hidden">
                <CodeEditor value={code} onChange={setCode} />
              </Card>

              <Card>
                <Textarea
                  label="풀이 설명"
                  placeholder="코드를 작성하면서 어떻게 생각했는지, 접근 방식을 설명해주세요..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="min-h-[120px]"
                />
              </Card>
            </>
          )}

          {problemType === "mcq_single" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">객관식 답안</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(payload.options || []).map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={selectedIndex === idx}
                      onChange={() => setSelectedIndex(idx)}
                    />
                    <span>{idx + 1}. {opt}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {problemType === "exam" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">시험 답안</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(payload.questions || []).map((q, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                    <p className="font-medium">{idx + 1}. {q.title || "문항"}</p>
                    {q.description && <p className="text-sm text-muted whitespace-pre-wrap">{q.description}</p>}
                    {q.type === "mcq" ? (
                      <div className="space-y-1">
                        {(q.options || []).map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              checked={examAnswers[idx]?.selectedIndex === oi}
                              onChange={() => {
                                const next = [...examAnswers];
                                next[idx] = { ...next[idx], selectedIndex: oi };
                                setExamAnswers(next);
                              }}
                            />
                            <span>{oi + 1}. {opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="주관식 답안을 입력하세요"
                        value={examAnswers[idx]?.text || ""}
                        onChange={(e) => {
                          const next = [...examAnswers];
                          next[idx] = { ...next[idx], text: e.target.value };
                          setExamAnswers(next);
                        }}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              loading={submitting}
              onClick={handleSubmit}
              disabled={
                problemType === "coding_single"
                  ? !code.trim()
                  : problemType === "mcq_single"
                    ? selectedIndex === null
                    : false
              }
            >
              <Send className="w-4 h-4 mr-2" />
              {problemType === "coding_single" ? "제출 및 AI 분석" : "제출하기"}
            </Button>
          </div>

          {result === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-wrap">
              <p className="font-medium">제출에 실패했습니다.</p>
              {submitErrorDetail ? (
                <p className="mt-2 text-red-800/90">{submitErrorDetail}</p>
              ) : (
                <p className="mt-2">다시 시도해 주세요.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
