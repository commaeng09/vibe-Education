"use client";

import { useCallback, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
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

/** 내부 테스트용 고정 비밀번호 로그인 (NEXT_PUBLIC_ENABLE_TEST_LOGIN=true 일 때만 UI 표시) */
const TEST_LOGIN_PASSWORD = "qwer1234";

function isTestQuickLoginEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true";
}

function getTestLoginEmails() {
  return {
    student: normalizeAuthEmail(
      process.env.NEXT_PUBLIC_TEST_STUDENT_EMAIL ||
        "student-test@vibe-education.app"
    ),
    instructor: normalizeAuthEmail(
      process.env.NEXT_PUBLIC_TEST_INSTRUCTOR_EMAIL ||
        "instructor-test@vibe-education.app"
    ),
  };
}

/** 브라우저 type="email" 은 .local 등 일부 주소를 거부하므로, 텍스트 입력 후 여기서만 검사 */
function isPlausibleEmail(value: string) {
  const t = value.trim();
  if (!t.includes("@")) return false;
  const [local, ...rest] = t.split("@");
  const domain = rest.join("@");
  return local.length > 0 && domain.length > 0 && domain.includes(".");
}

/** Supabase Auth는 이메일을 소문자로 다루는 경우가 많아 로그인/가입 시 통일 */
function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

/** Supabase가 주는 영문 메시지 + 자주 겪는 경우 한국어 안내 */
function formatSignInError(err: {
  message: string;
  status?: number;
  code?: string;
}): string {
  const raw = err.message.trim();
  const lower = raw.toLowerCase();
  const code = (err.code || "").toLowerCase();

  // 콘솔의 429 Too Many Requests — Auth·이메일 등 짧은 시간 다중 요청 한도
  if (
    err.status === 429 ||
    code === "too_many_requests" ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    return `${raw}

• Supabase는 짧은 시간에 로그인 시도가 많으면 429를 반환합니다. 몇 분 쉬었다가 다시 시도하세요.
• 로그인 버튼 연타·자동 새로고침 확장 프로그램이 반복 요청을 만들지 않는지 확인하세요.`;
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    code === "invalid_credentials"
  ) {
    return `${raw}

• Supabase Dashboard → Authentication → Users에 위 이메일 계정이 있는지 확인하세요. 없으면 Add user로 같은 이메일·비밀번호를 지정해 만드세요.
• 비밀번호가 계정에 설정한 값과 일치하는지 확인하세요(테스트 계정은 보통 qwer1234).`;
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return `${raw}

• Authentication → Providers → Email에서「Confirm email」을 끄거나, 가입 확인 메일의 링크로 인증한 뒤 다시 로그인하세요.`;
  }

  if (
    code === "captcha_failed" ||
    lower.includes("captcha") ||
    lower.includes("hcaptcha") ||
    lower.includes("turnstile")
  ) {
    return `${raw}

• Supabase에서 CAPTCHA(봇 방지)를 켠 경우, 로그인 요청에 캡차 토큰이 없으면 400이 납니다.
• 해결: Dashboard → Authentication → Bot and Abuse Protection에서 CAPTCHA를 끄거나, Cloudflare Turnstile 사이트 키를 NEXT_PUBLIC_TURNSTILE_SITE_KEY로 넣고 아래 캡차를 표시하세요. (문서: https://supabase.com/docs/guides/auth/auth-captcha)`;
  }

  // 콘솔의 400 on .../token?grant_type=password — 잘못된 자격 증명·캡차·정책
  if (err.status === 400) {
    return `${raw}

• 이메일·비밀번호가 틀렸거나, Users에 해당 계정이 없을 때 자주 납니다.
• Authentication에서 CAPTCHA를 켰다면 위와 같이 토큰이 필요합니다.
• Vercel의 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 해당 Supabase 프로젝트와 같은지 확인하세요.`;
  }

  return raw;
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
  const testQuickLogin = isTestQuickLoginEnabled() && !demo;
  const testEmails = getTestLoginEmails();

  /** Supabase CAPTCHA 사용 시: Cloudflare Turnstile 사이트 키 (Dashboard의 CAPTCHA와 같은 Turnstile 위젯) */
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const resetTurnstile = useCallback(() => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  }, []);

  const onTurnstileSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleTestQuickLogin = async (kind: "student" | "instructor") => {
    setLoading(true);
    setError("");
    if (turnstileSiteKey && !captchaToken) {
      setError("아래 인증(캡차)을 완료한 뒤 다시 시도해 주세요.");
      setLoading(false);
      return;
    }
    try {
      const { createClient } = await import("@/lib/supabase-browser");
      const supabase = createClient();
      const email =
        kind === "student" ? testEmails.student : testEmails.instructor;
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password: TEST_LOGIN_PASSWORD,
        options:
          turnstileSiteKey && captchaToken
            ? { captchaToken }
            : undefined,
      });
      if (signError) {
        setError(formatSignInError(signError));
        if (turnstileSiteKey) resetTurnstile();
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("테스트 로그인 요청에 실패했습니다.");
      if (turnstileSiteKey) resetTurnstile();
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: "student" | "instructor") => {
    setLoading(true);
    document.cookie = `demo-user=${demoRole}; path=/; max-age=86400`;
    router.push("/dashboard");
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) {
      setError(
        "데모 모드에서는 이메일·비밀번호로 로그인할 수 없습니다. 위쪽 「학생으로 로그인」 또는 「교강사로 로그인」 버튼을 사용하세요. 실제 로그인은 .env.local과 Vercel에 Supabase URL/키를 넣은 뒤 이용할 수 있습니다."
      );
      return;
    }
    setLoading(true);
    setError("");

    const emailTrim = email.trim();
    if (!isPlausibleEmail(emailTrim)) {
      setError("이메일은 example@domain.com 형식으로 입력해 주세요.");
      setLoading(false);
      return;
    }
    const emailNorm = normalizeAuthEmail(emailTrim);

    if (turnstileSiteKey && !captchaToken) {
      setError("아래 인증(캡차)을 완료한 뒤 다시 시도해 주세요.");
      setLoading(false);
      return;
    }

    const { createClient } = await import("@/lib/supabase-browser");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
      options:
        turnstileSiteKey && captchaToken
          ? { captchaToken }
          : undefined,
    });

    if (error) {
      setError(formatSignInError(error));
      if (turnstileSiteKey) resetTurnstile();
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) {
      setError(
        "데모 모드에서는 회원가입 대신 위쪽 빠른 로그인 버튼을 사용하세요. 실제 회원가입은 Supabase를 연결한 뒤 가능합니다."
      );
      return;
    }
    setLoading(true);
    setError("");

    const emailTrim = email.trim();
    if (!isPlausibleEmail(emailTrim)) {
      setError("이메일은 example@domain.com 형식으로 입력해 주세요.");
      setLoading(false);
      return;
    }
    const emailNorm = normalizeAuthEmail(emailTrim);

    if (turnstileSiteKey && !captchaToken) {
      setError("아래 인증(캡차)을 완료한 뒤 다시 시도해 주세요.");
      setLoading(false);
      return;
    }

    const { createClient } = await import("@/lib/supabase-browser");
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        data: {
          name,
          role,
        },
        ...(turnstileSiteKey && captchaToken
          ? { captchaToken }
          : {}),
      },
    });

    if (authError) {
      setError(formatSignInError(authError));
      if (turnstileSiteKey) resetTurnstile();
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setLoading(false);
      return;
    }

    // 이메일 인증을 켜 두면 가입 직후 세션이 없음 → RLS로 public.users insert 불가
    if (!authData.session) {
      setLoading(false);
      setError(
        "가입 확인 메일을 보냈습니다. 메일함에서 링크를 눌러 인증한 뒤, 아래 로그인에서 같은 이메일로 로그인해주세요."
      );
      return;
    }

    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: authData.user.id,
        email: emailNorm,
        name,
        role,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      setError(
        `프로필 저장 실패: ${profileError.message}`
      );
      setLoading(false);
      return;
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

          {testQuickLogin && (
            <Card className="p-6 mb-4 border-amber-200 bg-amber-50/90">
              <h3 className="font-semibold text-sm text-amber-900 mb-2">
                내부 테스트 로그인
              </h3>
              <p className="text-[11px] text-amber-800 mb-3 font-mono break-all">
                {testEmails.student}
                <br />
                {testEmails.instructor}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 border-amber-300"
                  onClick={() => handleTestQuickLogin("student")}
                  loading={loading}
                >
                  테스트 학생 로그인
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 border-amber-300"
                  onClick={() => handleTestQuickLogin("instructor")}
                  loading={loading}
                >
                  테스트 교강사 로그인
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
              {demo && (
                <p className="text-xs text-muted bg-secondary/80 p-3 rounded-lg">
                  데모 모드에서는 아래 입력란이 비활성화됩니다. 실제 계정은 Supabase 연결 후 사용하세요.
                </p>
              )}
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
                      disabled={demo}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">역할 선택</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        disabled={demo}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          role === "student"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:border-primary/30"
                        } ${demo ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        🎓 학생
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("instructor")}
                        disabled={demo}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                          role === "instructor"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:border-primary/30"
                        } ${demo ? "opacity-50 cursor-not-allowed" : ""}`}
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
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="이메일 (예: name@example.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required={!demo}
                  disabled={demo}
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
                  disabled={demo}
                />
              </div>

              {!demo && turnstileSiteKey && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-muted-foreground text-center">
                    Supabase에서 CAPTCHA를 켠 경우 필요합니다. 키는 .env의
                    NEXT_PUBLIC_TURNSTILE_SITE_KEY
                  </p>
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    onSuccess={onTurnstileSuccess}
                    onExpire={resetTurnstile}
                    options={{ language: "ko" }}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-danger bg-red-50 p-3 rounded-lg whitespace-pre-wrap break-words">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
                disabled={demo}
              >
                {mode === "login" ? "로그인" : "회원가입"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
