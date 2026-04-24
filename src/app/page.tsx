import { prisma } from "@/lib/prisma";
import { HomeGate } from "./HomeGate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type Banner =
    | { kind: "ok"; name: string }
    | { kind: "partial" }
    | { kind: "error"; message: string };

  let banner: Banner;
  try {
    const profile = await prisma.profile.findFirst({
      where: {
        displayName: "김주성",
        deletedAt: null,
        metadata: { path: ["seed_role"], equals: "MANAGER" },
      },
    });
    const name = profile?.displayName?.trim();
    if (name) {
      banner = { kind: "ok", name };
    } else {
      banner = { kind: "partial" };
    }
  } catch (e) {
    banner = {
      kind: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return (
    <div className="login-body">
      <div
        style={{
          padding: "1rem",
          textAlign: "center",
          background: "var(--gray-100)",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 600,
        }}
      >
        {banner.kind === "ok" && (
          <>
            성공적으로 DB와 연결되었습니다. [{banner.name}] 매니저님 환영합니다!
          </>
        )}
        {banner.kind === "partial" && (
          <>
            DB에 연결되었으나 &quot;김주성&quot; 매니저 프로필을 찾지 못했습니다.{" "}
            <code style={{ fontSize: "0.85em" }}>npx prisma db seed</code> 실행 후 다시 확인해 주세요.
          </>
        )}
        {banner.kind === "error" && <>DB 연결 확인 실패: {banner.message}</>}
      </div>
      <HomeGate />
    </div>
  );
}
