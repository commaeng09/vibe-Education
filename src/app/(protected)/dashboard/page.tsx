import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BookOpen,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/badge";
import { DEMO_USERS, DEMO_PROBLEMS, DEMO_SUBMISSIONS } from "@/lib/demo-data";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default async function DashboardPage() {
  let profileName = "사용자";
  let isInstructor = false;
  let recentProblems: { id: string; title: string; difficulty: string; created_at: string }[] = [];
  let submissions: {
    id: string;
    result: string;
    created_at: string;
    problems?: { title: string };
    users?: { name: string; email: string };
  }[] = [];
  let totalProblems = 0;
  let totalSubmissions = 0;
  let correctSubmissions = 0;

  if (isDemo()) {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo-user")?.value || "student";
    const user = DEMO_USERS[demoRole] || DEMO_USERS.student;
    profileName = user.name;
    isInstructor = user.role === "instructor";
    recentProblems = DEMO_PROBLEMS.map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      created_at: p.created_at,
    }));
    submissions = DEMO_SUBMISSIONS;
    totalProblems = DEMO_PROBLEMS.length;
    totalSubmissions = DEMO_SUBMISSIONS.length;
    correctSubmissions = DEMO_SUBMISSIONS.filter((s) => s.result === "correct").length;
  } else {
    const { createClient } = await import("@/lib/supabase-server");
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) redirect("/");
    const userId = authUser!.id;

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    profileName = profile?.name || "사용자";
    isInstructor = profile?.role === "instructor";

    const { data: probs } = await supabase
      .from("problems")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    recentProblems = probs || [];

    const { data: subs } = isInstructor
      ? await supabase
          .from("submissions")
          .select("*, problems(title), users(name, email)")
          .order("created_at", { ascending: false })
          .limit(10)
      : await supabase
          .from("submissions")
          .select("*, problems(title), analysis(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
    submissions = subs || [];

    const { count: tp } = await supabase.from("problems").select("*", { count: "exact", head: true });
    totalProblems = tp || 0;

    const subQuery = isInstructor
      ? supabase.from("submissions").select("*", { count: "exact", head: true })
      : supabase.from("submissions").select("*", { count: "exact", head: true }).eq("user_id", userId);
    const { count: ts } = await subQuery;
    totalSubmissions = ts || 0;

    const correctQuery = isInstructor
      ? supabase.from("submissions").select("*", { count: "exact", head: true }).eq("result", "correct")
      : supabase.from("submissions").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("result", "correct");
    const { count: cs } = await correctQuery;
    correctSubmissions = cs || 0;
  }

  const stats = [
    {
      label: isInstructor ? "등록된 문제" : "전체 문제",
      value: totalProblems,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-indigo-50",
    },
    {
      label: isInstructor ? "전체 제출" : "내 제출",
      value: totalSubmissions,
      icon: Clock,
      color: "text-accent",
      bg: "bg-cyan-50",
    },
    {
      label: "정답 수",
      value: correctSubmissions,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-emerald-50",
    },
    {
      label: "정답률",
      value:
        totalSubmissions > 0
          ? `${Math.round((correctSubmissions / totalSubmissions) * 100)}%`
          : "0%",
      icon: TrendingUp,
      color: "text-warning",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            안녕하세요, {profileName}님! 👋
          </h1>
          <p className="text-muted mt-1">
            {isInstructor
              ? "교강사 대시보드에 오신 것을 환영합니다."
              : "오늘도 코딩 실력을 키워볼까요?"}
          </p>
        </div>
        {isInstructor && (
          <Link href="/instructor/create">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              문제 생성
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 문제</CardTitle>
              <Link href="/problems">
                <Button variant="ghost" size="sm">전체 보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentProblems.length > 0 ? (
              <div className="space-y-3">
                {recentProblems.map((problem) => (
                  <Link
                    key={problem.id}
                    href={`/problems/${problem.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors group"
                  >
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {problem.title}
                    </span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-8">등록된 문제가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isInstructor ? "최근 학생 제출" : "내 최근 제출"}</CardTitle>
              <BarChart3 className="w-5 h-5 text-muted" />
            </div>
          </CardHeader>
          <CardContent>
            {submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/analysis/${sub.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {sub.problems?.title || "문제"}
                      </p>
                      {isInstructor && sub.users?.name && (
                        <p className="text-xs text-muted">
                          제출자: {sub.users.name} ({sub.users.email})
                        </p>
                      )}
                      <p className="text-xs text-muted">
                        {new Date(sub.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        sub.result === "correct"
                          ? "bg-emerald-100 text-emerald-700"
                          : sub.result === "incorrect"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {sub.result === "correct" ? "정답" : sub.result === "incorrect" ? "오답" : "대기"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-8">제출 내역이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
