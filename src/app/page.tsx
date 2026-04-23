"use client";

import { useSession } from "@/lib/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const { session, isReady } = useSession();

  useEffect(() => {
    if (!isReady) return;
    router.replace(session ? "/app/dashboard" : "/login");
  }, [isReady, session, router]);

  return (
    <div className="login-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontWeight: 800, color: "var(--gray-600)" }}>이동 중…</div>
    </div>
  );
}
