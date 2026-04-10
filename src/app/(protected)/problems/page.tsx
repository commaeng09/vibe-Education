import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/badge";
import { DEMO_PROBLEMS } from "@/lib/demo-data";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; search?: string }>;
}) {
  const params = await searchParams;
  let problems: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    created_at: string;
    users?: { name: string } | null;
    created_by?: string;
  }[] = [];

  if (isDemo()) {
    problems = DEMO_PROBLEMS.map((p) => ({
      ...p,
      users: { name: "김교수" },
    }));

    if (params.difficulty && params.difficulty !== "all") {
      problems = problems.filter((p) => p.difficulty === params.difficulty);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      problems = problems.filter((p) => p.title.toLowerCase().includes(q));
    }
  } else {
    const { createClient } = await import("@/lib/supabase-server");
    const supabase = await createClient();

    let query = supabase
      .from("problems")
      .select("*, users!problems_created_by_fkey(name)")
      .order("created_at", { ascending: false });

    if (params.difficulty && params.difficulty !== "all") {
      query = query.eq("difficulty", params.difficulty);
    }
    if (params.search) {
      query = query.ilike("title", `%${params.search}%`);
    }

    const { data } = await query;
    problems = data || [];
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">문제 목록</h1>
        <p className="text-muted mt-1">풀어볼 코딩 문제를 선택하세요.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1" action="/problems" method="GET">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input
            name="search"
            defaultValue={params.search || ""}
            placeholder="문제 검색..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {params.difficulty && (
            <input type="hidden" name="difficulty" value={params.difficulty} />
          )}
        </form>
        <div className="flex gap-2">
          {["all", "easy", "medium", "hard"].map((d) => (
            <Link
              key={d}
              href={`/problems?difficulty=${d}${params.search ? `&search=${params.search}` : ""}`}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                (params.difficulty || "all") === d
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border text-muted hover:border-primary/30"
              }`}
            >
              {d === "all" ? "전체" : d === "easy" ? "쉬움" : d === "medium" ? "보통" : "어려움"}
            </Link>
          ))}
        </div>
      </div>

      {problems.length > 0 ? (
        <div className="grid gap-4">
          {problems.map((problem) => (
            <Link key={problem.id} href={`/problems/${problem.id}`}>
              <Card hover>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{problem.title}</h3>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </div>
                    <p className="text-sm text-muted line-clamp-2">
                      {problem.description.replace(/[#*`]/g, "").substring(0, 150)}...
                    </p>
                    <p className="text-xs text-muted mt-2">
                      출제자: {(problem.users as Record<string, string>)?.name || "알 수 없음"} ·{" "}
                      {new Date(problem.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-muted text-lg">등록된 문제가 없습니다.</p>
            <p className="text-muted text-sm mt-1">교강사가 문제를 등록하면 여기에 표시됩니다.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
