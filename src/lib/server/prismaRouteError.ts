import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Prisma/DB 실패 → Route Handler용 JSON. 매핑되지 않으면 null (일반 500 처리).
 */
export function nextResponseForPrismaOrDbError(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (
      e.code === "P1000" ||
      e.code === "P1001" ||
      e.code === "P1002" ||
      e.code === "P1003" ||
      e.code === "P1008" ||
      e.code === "P1010" ||
      e.code === "P1011" ||
      e.code === "P1013" ||
      e.code === "P1014" ||
      e.code === "P1016" ||
      e.code === "P1017"
    ) {
      return NextResponse.json(
        {
          error: "database_unavailable",
          message: "DB에 연결할 수 없습니다. DATABASE_URL(호스트·비밀번호·포트)와 Supabase `Settings → Database` 연결 정보를 확인하세요.",
        },
        { status: 503 },
      );
    }
    if (e.code === "P2021" || e.code === "P2022" || e.code === "P2010" || e.code === "P2011") {
      return NextResponse.json(
        {
          error: "schema_out_of_date",
          message: e.message,
        },
        { status: 503 },
      );
    }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error: "database_unavailable",
        message: e.message,
      },
      { status: 503 },
    );
  }

  if (e instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json(
      { error: "database_error", message: "Prisma 엔진 오류" },
      { status: 503 },
    );
  }

  return null;
}
