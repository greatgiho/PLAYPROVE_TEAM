import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "pp_demo_uid";

/** 로컬 스토리지 세션과 쿠키 동기화용 (쿠키 없으면 클라이언트가 세션 삭제) */
export async function GET() {
  const uid = (await cookies()).get(COOKIE)?.value ?? null;
  return NextResponse.json({ userId: uid });
}
