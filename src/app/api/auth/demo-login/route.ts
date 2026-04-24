import { DEMO_PERSONA_IDS, isDemoPersona } from "@/lib/auth/demoLoginPersonas";
import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { NextResponse } from "next/server";

const COOKIE = "pp_demo_uid";
const MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const persona = (body as { persona?: string }).persona;
  if (!isDemoPersona(persona)) {
    return NextResponse.json({ error: "invalid_persona" }, { status: 400 });
  }

  const row = DEMO_PERSONA_IDS[persona];
  if (!isAllowedAppUserId(row.userId)) {
    return NextResponse.json({ error: "misconfigured_allowlist" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, userId: row.userId });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE, row.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure,
  });
  return res;
}
