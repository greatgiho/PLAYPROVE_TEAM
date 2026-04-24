import { NextResponse } from "next/server";

const COOKIE = "pp_demo_uid";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, secure });
  return res;
}
