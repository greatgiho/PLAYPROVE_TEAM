"use client";

import { useSession } from "@/lib/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isReady } = useSession();

  useEffect(() => {
    if (!isReady) return;
    if (!session) router.replace("/login");
  }, [isReady, session, router]);

  if (!isReady) {
    return (
      <div className="login-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontWeight: 800, color: "var(--gray-600)" }}>세션 확인 중…</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
