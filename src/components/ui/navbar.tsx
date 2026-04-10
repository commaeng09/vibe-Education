"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, LogOut, LayoutDashboard, BookOpen, PlusCircle } from "lucide-react";
import { Button } from "./button";
import type { User } from "@/types/database";

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isDemo = !url || url.includes("placeholder");

    if (isDemo) {
      document.cookie = "demo-user=; path=/; max-age=0";
    } else {
      const { createClient } = await import("@/lib/supabase-browser");
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Code2 className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold text-foreground">
              Vibe<span className="text-primary">Education</span>
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  대시보드
                </Button>
              </Link>
              <Link href="/problems">
                <Button variant="ghost" size="sm">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  문제
                </Button>
              </Link>
              {user.role === "instructor" && (
                <Link href="/instructor/create">
                  <Button variant="ghost" size="sm">
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    문제 생성
                  </Button>
                </Link>
              )}
              <div className="ml-2 pl-2 border-l border-border flex items-center gap-2">
                <span className="text-sm text-muted">
                  {user.name}{" "}
                  <span className="text-xs">
                    ({user.role === "instructor" ? "교강사" : "학생"})
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
