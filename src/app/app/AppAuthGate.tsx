"use client";

import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { useSession } from "@/lib/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isReady, logout } = useSession();

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAllowedAppUserId(session.userId)) {
      void (async () => {
        await logout();
        router.replace("/login?reason=forbidden");
      })();
    }
  }, [isReady, session, router, logout]);

  if (!isReady) {
    return (
      <div className="login-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontWeight: 800, color: "var(--gray-600)" }}>세션 확인 중…</div>
      </div>
    );
  }

  if (!session || !isAllowedAppUserId(session.userId)) {
    return null;
  }

  return <>{children}</>;
}
