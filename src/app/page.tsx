"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, GraduationCap, Brain, BarChart3, Mail, Lock, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { UserRole } from "@/types/database";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default function HomePage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const demo = isDemo();

  const handleDemoLogin = (demoRole: "student" | "instructor") => {
    setLoading(true);
    document.cookie = `demo-user=${demoRole}; path=/; max-age=86400`;
    router.push("/dashboard");
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) {
      handleDemoLogin("student");
      return;
    }
    setLoading(true);
    setError("");

    const { createClient } = await import("@/lib/supabase-browser");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) {
      handleDemoLogin(role);
      return;
    }
    setLoading(true);
    setError("");

    const { createClient } = await import("@/lib/supabase-browser");
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name,
        role,
      });

      if (profileError) {
        setError("프로필 생성에 실패했습니다.");
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  const features = [
    {
      icon: GraduationCap,
      title: "맞춤형 코딩 교육",
      description: "교강사가 직접 만든 문제로 체계적인 학습",
    },
    {
      icon: Brain,
      title: "AI 사고 분석",
      description: "학생의 코드와 풀이 과정을 AI가 심층 분석",
    },
    {
      icon: BarChart3,
      title: "데이터 기반 인사이트",
      description: "반복되는 오류 패턴과 학습 포인트를 자동 추출",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <Code2 className="w-10 h-10 text-white" />
            <span className="text-2xl font-bold text-white">
              VibeEducation
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            AI가 분석하는
            <br />
            코딩 교육 플랫폼
          </h1>
          <p className="text-lg text-indigo-100 mb-12 max-w-md">
            학생의 사고 과정을 분석하고, 왜 틀렸는지를 알려주는 차세대 코딩
            교육 플랫폼
          </p>
        </div>

        <div className="space-y-6">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{feature.title}</h3>
                <p className="text-indigo-200 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Code2 className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">VibeEducation</span>
          </div>

          {/* Demo Quick Login */}
          {demo && (
            <Card className="p-6 mb-4 border-primary/20 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">데모 모드 - 빠른 로그인</h3>
              </div>
              <p className="text-xs text-muted mb-4">
                Supabase가 설정되지 않아 데모 데이터로 실행됩니다.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDemoLogin("student")}
                  loading={loading}
                >
                  🎓 학생으로 로그인
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleDemoLogin("instructor")}
                  loading={loading}
                >
                  👨‍🏫 교강사로 로그인
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-8">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted hover:text-foreground"
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  mode === "signup"
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted hover:text-foreground"
                }`}
              >
                회원가입
              </button>
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === "signup" && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                    <Input
                      placeholder="이름"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required={!demo}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">역할 선택</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          role === "student"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:border-primary/30"
                        }`}
                      >
                        🎓 학생
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("instructor")}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          role === "instructor"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:border-primary/30"
                        }`}
                      >
                        👨‍🏫 교강사
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required={!demo}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required={!demo}
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-danger bg-red-50 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {mode === "login" ? "로그인" : "회원가입"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
