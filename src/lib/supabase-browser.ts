import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === "your_supabase_url_here") {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
