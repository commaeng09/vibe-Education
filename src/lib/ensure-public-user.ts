import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * submissions 등 FK가 public.users 를 참조하므로, 없으면 세션 사용자로 한 줄 만듭니다.
 * (트리거 미적용·과거 가입자·이메일 인증만 된 경우 등)
 */
export async function ensurePublicUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { ok: true };
  }

  const email = user.email?.trim();
  if (!email) {
    return {
      ok: false,
      message:
        "프로필을 만들 이메일 정보가 없습니다. 로그아웃 후 다시 로그인해 주세요.",
    };
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const nameFromMeta =
    typeof meta?.name === "string" && meta.name.trim()
      ? meta.name.trim()
      : email.split("@")[0] || "사용자";
  const roleRaw = meta?.role;
  const role =
    roleRaw === "instructor" || roleRaw === "student" ? roleRaw : "student";

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email,
      name: nameFromMeta,
      role,
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, message: `프로필 생성 실패: ${error.message}` };
  }

  return { ok: true };
}
