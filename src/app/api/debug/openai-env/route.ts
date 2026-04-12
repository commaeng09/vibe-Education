import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * 배포 환경에서 OPENAI_API_KEY가 서버에 보이는지 확인합니다.
 * 브라우저에서 로그인한 뒤 이 주소로 접속하세요: /api/debug/openai-env
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        loggedIn: false,
        message: "먼저 사이트에 이메일로 로그인한 뒤 이 페이지를 새로고침하세요.",
      },
      { status: 401 }
    );
  }

  const raw = process.env.OPENAI_API_KEY;
  const configured = Boolean(raw && raw.trim().length > 0);

  return NextResponse.json({
    loggedIn: true,
    openaiKeyConfigured: configured,
    hint: configured
      ? "서버에서 API 키는 인식됩니다. AI 생성이 실패하면 OpenAI 콘솔의 결제·한도·키 유효성을 확인하세요."
      : "Vercel → 프로젝트 → Settings → Environment Variables에서 Key 이름이 정확히 OPENAI_API_KEY 인지, Environment에 Production이 체크됐는지 확인한 뒤 Redeploy 하세요. (로컬 .env.local은 배포 서버에 적용되지 않습니다.)",
  });
}
