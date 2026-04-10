import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import type { User } from "@/types/database";
import { DEMO_USERS } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User;

  if (isDemo()) {
    const cookieStore = await cookies();
    const demoRole = cookieStore.get("demo-user")?.value;
    if (!demoRole) redirect("/");
    user = DEMO_USERS[demoRole] || DEMO_USERS.student;
  } else {
    const { createClient } = await import("@/lib/supabase-server");
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) redirect("/");

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    user = profile || {
      id: authUser.id,
      email: authUser.email || "",
      name: authUser.email?.split("@")[0] || "User",
      role: "student" as const,
      created_at: new Date().toISOString(),
    };
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
