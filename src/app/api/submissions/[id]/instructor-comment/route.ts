import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("users")
    .select("id, role, name")
    .eq("id", user.id)
    .single();
  if (!me || me.role !== "instructor") {
    return NextResponse.json({ error: "강사만 코멘트를 저장할 수 있습니다." }, { status: 403 });
  }

  let body: { comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const comment = (body.comment || "").trim();
  if (!comment) {
    return NextResponse.json({ error: "코멘트를 입력하세요." }, { status: 400 });
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      instructor_comment: comment,
      instructor_comment_by: user.id,
      instructor_commented_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
