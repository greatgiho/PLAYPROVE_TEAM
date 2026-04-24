"use client";

import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { useSession } from "@/lib/context/SessionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function HomeGate() {
  const router = useRouter();
  const { session, isReady, logout } = useSession();

  if (!isReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <div style={{ fontWeight: 800, color: "var(--gray-600)" }}>세션 확인 중…</div>
      </div>
    );
  }

  const loggedIn = session && isAllowedAppUserId(session.userId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        minHeight: "50vh",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      {loggedIn ? (
        <>
          <p style={{ fontSize: 15, color: "var(--gray-600)", lineHeight: 1.6, maxWidth: 380 }}>
            <strong style={{ color: "var(--gray-900)" }}>{session.displayName}</strong> 데모 계정으로 로그인되어
            있습니다. (브라우저에 데모 쿠키 <code style={{ fontSize: 12 }}>pp_demo_uid</code> 가 있으면 세션이 유지됩니다.)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link
              href="/app/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 20px",
                borderRadius: 12,
                background: "var(--login-primary, #70201f)",
                color: "#fff",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              팀 대시보드로
            </Link>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await logout();
                  router.refresh();
                })();
              }}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "1.5px solid var(--gray-300)",
                background: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              로그아웃
            </button>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 20px",
                borderRadius: 12,
                color: "var(--gray-600)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              로그인 화면
            </Link>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, color: "var(--gray-600)", maxWidth: 360 }}>
            팀 앱(<code style={{ fontSize: 12 }}>/app</code>)은 데모 로그인 후 이용할 수 있습니다.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 20px",
              borderRadius: 12,
              background: "var(--login-primary, #70201f)",
              color: "#fff",
              fontWeight: 800,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            로그인으로
          </Link>
        </>
      )}
    </div>
  );
}
