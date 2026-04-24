import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE = "pp_demo_uid";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const uid = request.cookies.get(COOKIE)?.value ?? null;

  if (!uid || !isAllowedAppUserId(uid)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized", message: "로그인이 필요합니다." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "auth_required");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/api/roster/:path*",
    "/api/profile/:path*",
    "/api/mypage/:path*",
    "/api/team/:path*",
    "/dev/:path*",
  ],
};
