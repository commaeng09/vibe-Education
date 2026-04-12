import { NextResponse, type NextRequest } from "next/server";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

export async function middleware(request: NextRequest) {
  if (isDemo()) {
    const demoUser = request.cookies.get("demo-user")?.value;
    const path = request.nextUrl.pathname;
    const isAuthPage = path === "/";
    const isApiRoute = path.startsWith("/api/");

    if (!demoUser && !isAuthPage && !isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (demoUser && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  const { updateSession } = await import("@/lib/supabase-middleware");
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
