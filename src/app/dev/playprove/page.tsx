"use client";

import {
  PLAYPROVE_PATH_SLIDES_GROWTH_MALE,
  PlayproveDesktopRoleHub,
  PlayproveMobileOnboardingScreen,
  PlayproveSplitLoginScreen,
} from "@/components/playprove";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

type Tab = "mobile" | "login" | "desktop";

function PlayprovePreviewInner() {
  const searchParams = useSearchParams();
  const tab = useMemo((): Tab => {
    const t = searchParams.get("tab");
    if (t === "login" || t === "desktop") return t;
    return "mobile";
  }, [searchParams]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e5e5",
          background: "#fff",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <strong style={{ fontSize: 14 }}>Playprove UI preview</strong>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href="/dev/playprove?tab=mobile"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              background: tab === "mobile" ? "#70201f" : "#f0f0f0",
              color: tab === "mobile" ? "#fff" : "#333",
            }}
          >
            Mobile onboarding
          </Link>
          <Link
            href="/dev/playprove?tab=login"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              background: tab === "login" ? "#70201f" : "#f0f0f0",
              color: tab === "login" ? "#fff" : "#333",
            }}
          >
            Split login
          </Link>
          <Link
            href="/dev/playprove?tab=desktop"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              background: tab === "desktop" ? "#70201f" : "#f0f0f0",
              color: tab === "desktop" ? "#fff" : "#333",
            }}
          >
            Desktop setup
          </Link>
        </nav>
        <Link href="/" style={{ fontSize: 13, color: "#666" }}>
          ← Home
        </Link>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "mobile" && (
          <PlayproveMobileOnboardingScreen
            slides={PLAYPROVE_PATH_SLIDES_GROWTH_MALE}
            pageTitle="Select your path"
            pageTitleVariant="dark"
            onContinue={(s) => console.info("[preview] continue:", s.id)}
          />
        )}
        {tab === "login" && (
          <PlayproveSplitLoginScreen
            onLogIn={(p) => console.info("[preview] login:", p.email)}
            onCreateAccount={() => console.info("[preview] create account")}
          />
        )}
        {tab === "desktop" && <PlayproveDesktopRoleHub userName="David" />}
      </div>
    </div>
  );
}

export default function PlayprovePreviewPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>Loading preview…</div>
      }
    >
      <PlayprovePreviewInner />
    </Suspense>
  );
}
