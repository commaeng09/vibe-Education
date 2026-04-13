"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  AlertTriangle,
  MessageSquare,
  Award,
  Code2,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/code-editor";
import { DEMO_SUBMISSIONS, DEMO_ANALYSIS, DEMO_PROBLEMS } from "@/lib/demo-data";
import type { Analysis, Submission, Problem } from "@/types/database";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default function AnalysisPage() {
  const params = useParams();
  const demo = isDemo();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (demo) {
        const sub = DEMO_SUBMISSIONS.find((s) => s.id === params.submissionId);
        if (sub) {
          setSubmission(sub);
          const prob = DEMO_PROBLEMS.find((p) => p.id === sub.problem_id);
          if (prob) setProblem(prob);
          if (sub.id === DEMO_ANALYSIS.submission_id) {
            setAnalysis(DEMO_ANALYSIS);
          }
        }
        setLoading(false);
        return;
      }

      const { createClient } = await import("@/lib/supabase-browser");
      const supabase = createClient();

      const { data: sub } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", params.submissionId)
        .single();

      if (sub) {
        setSubmission(sub as unknown as Submission);

        const { data: prob } = await supabase
          .from("problems")
          .select("*")
          .eq("id", sub.problem_id)
          .single();
        if (prob) setProblem(prob as unknown as Problem);

        const { data: anal } = await supabase
          .from("analysis")
          .select("*")
          .eq("submission_id", sub.id)
          .single();
        if (anal) setAnalysis(anal as unknown as Analysis);
      }

      setLoading(false);
    };

    fetchData();
  }, [params.submissionId, demo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse-slow" />
          <p className="text-muted">분석 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-lg">제출 내역을 찾을 수 없습니다.</p>
        <Link href="/dashboard">
          <Button variant="secondary" className="mt-4">대시보드로</Button>
        </Link>
      </div>
    );
  }

  const scoreColor =
    (analysis?.score ?? 0) >= 80
      ? "text-success"
      : (analysis?.score ?? 0) >= 50
        ? "text-warning"
        : "text-danger";

  const scoreBg =
    (analysis?.score ?? 0) >= 80
      ? "bg-emerald-50 border-emerald-200"
      : (analysis?.score ?? 0) >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Link
        href="/problems"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        문제 목록으로
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 분석 결과</h1>
          {problem && <p className="text-muted mt-1">문제: {problem.title}</p>}
        </div>
        <Badge
          variant={
            submission.result === "correct"
              ? "success"
              : submission.result === "incorrect"
                ? "danger"
                : "default"
          }
        >
          {submission.result === "correct"
            ? "정답"
            : submission.result === "incorrect"
              ? "오답"
              : "대기"}
        </Badge>
      </div>

      {analysis && (
        <Card className={`${scoreBg} border`}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <Award className={`w-8 h-8 ${scoreColor} mx-auto mb-1`} />
              <p className={`text-4xl font-bold ${scoreColor}`}>{analysis.score}</p>
              <p className="text-sm text-muted">점수</p>
            </div>
            <div className="flex-1 border-l border-current/10 pl-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">오류 유형</span>
              </div>
              <p className="text-sm">{analysis.error_type}</p>
            </div>
          </div>
        </Card>
      )}

      {analysis && (
        <div className="grid gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-5 h-5 text-primary" />
                사고 패턴 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed bg-indigo-50 p-4 rounded-lg">
                {analysis.thinking_pattern}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-5 h-5 text-accent" />
                피드백
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {analysis.feedback}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!analysis && (
        <Card>
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">AI 분석 결과가 아직 없습니다.</p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="w-5 h-5" />
            제출한 코드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeEditor value={submission.code} onChange={() => {}} readOnly height="300px" />
        </CardContent>
      </Card>

      {problem?.solution_code && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="w-5 h-5" />
              정답 코드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeEditor
              value={problem.solution_code}
              onChange={() => {}}
              readOnly
              height="300px"
            />
          </CardContent>
        </Card>
      )}

      {submission.explanation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" />
              풀이 설명
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed bg-secondary p-4 rounded-lg">
              {submission.explanation}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pb-8">
        {problem && (
          <Link href={`/problems/${problem.id}`}>
            <Button variant="primary">다시 풀어보기</Button>
          </Link>
        )}
        <Link href="/problems">
          <Button variant="secondary">다른 문제 풀기</Button>
        </Link>
      </div>
    </div>
  );
}
