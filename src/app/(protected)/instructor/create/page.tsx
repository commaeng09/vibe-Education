"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface McqOption {
  text: string;
}

interface ExamQuestion {
  type: "coding" | "mcq";
  title: string;
  description: string;
  options: McqOption[];
  correctIndex: number;
  answer: string;
}

const AI_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "php", label: "PHP" },
  { value: "html_css", label: "HTML/CSS" },
  { value: "react", label: "React" },
];

export default function CreateProblemPage() {
  const router = useRouter();
  const [createMode, setCreateMode] = useState<"single" | "exam">("single");
  const [singleType, setSingleType] = useState<"coding" | "mcq">("coding");
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
  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { text: "" },
    { text: "" },
    { text: "" },
    { text: "" },
  ]);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState(0);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([
    {
      type: "coding",
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      correctIndex: 0,
      answer: "",
    },
  ]);
  const [aiLanguage, setAiLanguage] = useState<string>("python");
  const [newExamQuestionType, setNewExamQuestionType] = useState<"coding" | "mcq">("coding");
  const [aiRequirement, setAiRequirement] = useState("");
  const [aiExample, setAiExample] = useState("");

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
      const response = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}/api/ai/generate-problem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            topic: aiTopic,
            difficulty,
            language: aiLanguage,
            mode: createMode,
            singleType,
            requirement: aiRequirement,
            example: aiExample,
            currentDraft: {
              title,
              description,
              testCases,
              mcqOptions,
              mcqCorrectIndex,
              examQuestions,
            },
          }),
        }
      );

      const raw = await response.text();
      let data: {
        problem?: {
          title: string;
          description: string;
          difficulty: string;
          solution_code: string;
          test_cases?: { input: string; expected_output: string }[];
        };
        error?: string;
      } = {};

      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        alert(
          `서버 응답을 해석할 수 없습니다 (HTTP ${response.status}). 로그인이 풀렸다면 다시 로그인 후 시도하세요.`
        );
        return;
      }

      if (!response.ok) {
        alert(data.error || `요청 실패 (${response.status})`);
        return;
      }

      if (data.problem) {
        setTitle(data.problem.title);
        setDescription(data.problem.description);
        setDifficulty(data.problem.difficulty);
        setSolutionCode(data.problem.solution_code);
        if (data.problem.test_cases?.length) {
          setTestCases(data.problem.test_cases);
        }
      } else {
        alert(data.error || "문제 데이터를 받지 못했습니다.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      alert(`요청 중 오류: ${msg}`);
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

    let supabase;
    try {
      const { createClient } = await import("@/lib/supabase-browser");
      supabase = createClient();
    } catch {
      alert(
        "Supabase 연결 설정을 확인하세요. (.env.local 또는 Vercel의 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
      );
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      setSaving(false);
      return;
    }

    const payload =
      createMode === "single" && singleType === "mcq"
        ? {
            type: "mcq",
            options: mcqOptions.map((o) => o.text),
            correctIndex: mcqCorrectIndex,
          }
        : createMode === "exam"
          ? {
              questions: examQuestions.map((q) => ({
                type: q.type,
                title: q.title,
                description: q.description,
                options: q.options.map((o) => o.text),
                correctIndex: q.correctIndex,
                answer: q.answer,
              })),
            }
          : {};

    const { error } = await supabase.from("problems").insert({
      title,
      description,
      difficulty,
      problem_type:
        createMode === "exam"
          ? "exam"
          : singleType === "mcq"
            ? "mcq_single"
            : "coding_single",
      question_payload: payload,
      solution_code: singleType === "coding" ? solutionCode : "",
      test_cases:
        singleType === "coding"
          ? testCases.filter((tc) => tc.input || tc.expected_output)
          : [],
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
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
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
            <Select
              value={createMode}
              onChange={(e) => setCreateMode(e.target.value as "single" | "exam")}
              options={[
                { value: "single", label: "단일 문제" },
                { value: "exam", label: "시험 문제(다문항)" },
              ]}
              className="w-48"
            />
            {createMode === "single" && (
              <Select
                value={singleType}
                onChange={(e) => setSingleType(e.target.value as "coding" | "mcq")}
                options={[
                  { value: "coding", label: "코드 문제(주관식)" },
                  { value: "mcq", label: "객관식(4지선다)" },
                ]}
                className="w-44"
              />
            )}
            <Input
              placeholder="예: 이진 탐색, 재귀 함수, 정렬 알고리즘..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1"
            />
            <Select
              value={aiLanguage}
              onChange={(e) => setAiLanguage(e.target.value)}
              options={AI_LANGUAGES}
              className="w-36"
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
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Textarea
              label="AI 참고 조건 (선택)"
              placeholder="예: OOP 문법 포함, 난이도는 기초~중급, 배열/반복문 중심"
              value={aiRequirement}
              onChange={(e) => setAiRequirement(e.target.value)}
              className="min-h-[90px]"
            />
            <Textarea
              label="예시 문제/스타일 (선택)"
              placeholder="예: '두 정수 합' 스타일처럼 입출력 예시를 2개 넣어주세요."
              value={aiExample}
              onChange={(e) => setAiExample(e.target.value)}
              className="min-h-[90px]"
            />
          </div>
          <p className="text-xs text-muted mt-2">
            언어·주제·난이도를 선택하면 AI가 자동으로 문제, 정답 코드, 테스트 케이스를 생성합니다.
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

      {createMode === "single" && singleType === "coding" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>정답 코드</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeEditor value={solutionCode} onChange={setSolutionCode} height="300px" />
            </CardContent>
          </Card>

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
        </>
      )}

      {createMode === "single" && singleType === "mcq" && (
        <Card>
          <CardHeader>
            <CardTitle>객관식 설정 (4지선다)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mcqOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mcqCorrectIndex === idx}
                  onChange={() => setMcqCorrectIndex(idx)}
                />
                <Input
                  placeholder={`${idx + 1}번 선택지`}
                  value={opt.text}
                  onChange={(e) => {
                    const next = [...mcqOptions];
                    next[idx].text = e.target.value;
                    setMcqOptions(next);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {createMode === "exam" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>시험 문제 구성 (Google Form 스타일)</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={newExamQuestionType}
                  onChange={(e) =>
                    setNewExamQuestionType(e.target.value as "coding" | "mcq")
                  }
                  options={[
                    { value: "coding", label: "주관식" },
                    { value: "mcq", label: "객관식" },
                  ]}
                  className="w-32"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setExamQuestions([
                      ...examQuestions,
                      {
                        type: newExamQuestionType,
                        title: "",
                        description: "",
                        options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
                        correctIndex: 0,
                        answer: "",
                      },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  문항 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {examQuestions.map((q, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">문항 {idx + 1}</p>
                  {examQuestions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExamQuestions(examQuestions.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="w-4 h-4 text-danger" />
                    </Button>
                  )}
                </div>
                <Select
                  value={q.type}
                  onChange={(e) => {
                    const next = [...examQuestions];
                    next[idx].type = e.target.value as "coding" | "mcq";
                    setExamQuestions(next);
                  }}
                  options={[
                    { value: "coding", label: "주관식" },
                    { value: "mcq", label: "객관식(4지선다)" },
                  ]}
                />
                <Input
                  placeholder="문항 제목"
                  value={q.title}
                  onChange={(e) => {
                    const next = [...examQuestions];
                    next[idx].title = e.target.value;
                    setExamQuestions(next);
                  }}
                />
                <Textarea
                  placeholder="문항 설명"
                  value={q.description}
                  onChange={(e) => {
                    const next = [...examQuestions];
                    next[idx].description = e.target.value;
                    setExamQuestions(next);
                  }}
                />
                {q.type === "mcq" ? (
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={q.correctIndex === oi}
                          onChange={() => {
                            const next = [...examQuestions];
                            next[idx].correctIndex = oi;
                            setExamQuestions(next);
                          }}
                        />
                        <Input
                          placeholder={`${oi + 1}번 선택지`}
                          value={o.text}
                          onChange={(e) => {
                            const next = [...examQuestions];
                            next[idx].options[oi].text = e.target.value;
                            setExamQuestions(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    placeholder="주관식 정답(정확 일치 채점)"
                    value={q.answer}
                    onChange={(e) => {
                      const next = [...examQuestions];
                      next[idx].answer = e.target.value;
                      setExamQuestions(next);
                    }}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
