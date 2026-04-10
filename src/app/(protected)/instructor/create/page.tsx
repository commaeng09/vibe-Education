"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Sparkles, Save, Plus, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CodeEditor } from "@/components/code-editor";
import Link from "next/link";

interface TestCase {
  input: string;
  expected_output: string;
}

export default function CreateProblemPage() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<string>("easy");
  const [solutionCode, setSolutionCode] = useState("# 정답 코드를 입력하세요\n\n");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expected_output: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expected_output: "" }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, difficulty }),
      });

      const data = await response.json();

      if (data.problem) {
        setTitle(data.problem.title);
        setDescription(data.problem.description);
        setDifficulty(data.problem.difficulty);
        setSolutionCode(data.problem.solution_code);
        if (data.problem.test_cases?.length > 0) {
          setTestCases(data.problem.test_cases);
        }
      }
    } catch {
      alert("AI 문제 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert("제목과 설명을 입력해주세요.");
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("problems").insert({
      title,
      description,
      difficulty,
      solution_code: solutionCode,
      test_cases: testCases.filter((tc) => tc.input || tc.expected_output),
      created_by: user.id,
    });

    if (error) {
      alert("문제 저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    router.push("/problems");
    router.refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        대시보드로
      </Link>

      <div>
        <h1 className="text-2xl font-bold">문제 생성</h1>
        <p className="text-muted mt-1">
          새로운 코딩 문제를 생성하거나 AI에게 생성을 맡기세요.
        </p>
      </div>

      {/* AI Generation */}
      <Card className="border-primary/20 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 문제 자동 생성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="예: 이진 탐색, 재귀 함수, 정렬 알고리즘..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1"
            />
            <Select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: "easy", label: "쉬움" },
                { value: "medium", label: "보통" },
                { value: "hard", label: "어려움" },
              ]}
              className="w-32"
            />
            <Button
              onClick={handleGenerateAI}
              loading={generating}
              disabled={!aiTopic.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI 생성
            </Button>
          </div>
          <p className="text-xs text-muted mt-2">
            주제와 난이도를 선택하면 AI가 자동으로 문제, 정답 코드, 테스트 케이스를 생성합니다.
          </p>
        </CardContent>
      </Card>

      {/* Problem Form */}
      <Card>
        <CardHeader>
          <CardTitle>문제 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="문제 제목"
            placeholder="예: 두 수의 합 구하기"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="문제 설명"
            placeholder="문제 설명, 입출력 형식, 예시, 제약 조건 등을 입력하세요..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[200px]"
          />

          <Select
            label="난이도"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            options={[
              { value: "easy", label: "쉬움" },
              { value: "medium", label: "보통" },
              { value: "hard", label: "어려움" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Solution Code */}
      <Card>
        <CardHeader>
          <CardTitle>정답 코드</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeEditor value={solutionCode} onChange={setSolutionCode} height="300px" />
        </CardContent>
      </Card>

      {/* Test Cases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>테스트 케이스</CardTitle>
            <Button variant="secondary" size="sm" onClick={addTestCase}>
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {testCases.map((tc, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  placeholder="입력값"
                  value={tc.input}
                  onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                />
                <Input
                  placeholder="기대 출력값"
                  value={tc.expected_output}
                  onChange={(e) =>
                    updateTestCase(idx, "expected_output", e.target.value)
                  }
                />
              </div>
              {testCases.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTestCase(idx)}
                  className="mt-1"
                >
                  <X className="w-4 h-4 text-danger" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/dashboard">
          <Button variant="secondary" size="lg">
            취소
          </Button>
        </Link>
        <Button size="lg" loading={saving} onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          문제 저장
        </Button>
      </div>
    </div>
  );
}
