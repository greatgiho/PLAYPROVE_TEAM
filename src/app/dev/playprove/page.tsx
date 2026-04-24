"use client";

import {
  PLAYPROVE_PATH_SLIDES_GROWTH_MALE,
  PlayproveDesktopRoleHub,
  PlayproveMobileOnboardingScreen,
  PlayproveSplitLoginScreen,
} from "@/components/playprove";
import { Card } from "@/components/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

type Tab = "mobile" | "login" | "desktop";

function tabLinkClass(active: boolean): string {
  return [
    "rounded-full px-3.5 py-2 text-[13px] font-semibold no-underline",
    active ? "bg-[#70201f] text-white" : "bg-neutral-200 text-neutral-800",
  ].join(" ");
}

function PlayprovePreviewInner() {
  const searchParams = useSearchParams();
  const tab = useMemo((): Tab => {
    const t = searchParams.get("tab");
    if (t === "login" || t === "desktop") return t;
    return "mobile";
  }, [searchParams]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-app-surface-muted">
      <Card
        className="rounded-none border-x-0 border-t-0 border-b-app-border shadow-none rounded-b-app"
        padded
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong className="text-sm font-extrabold text-app-text">Playprove UI preview</strong>
          <nav className="flex flex-wrap gap-2">
            <Link href="/dev/playprove?tab=mobile" className={tabLinkClass(tab === "mobile")}>
              Mobile onboarding
            </Link>
            <Link href="/dev/playprove?tab=login" className={tabLinkClass(tab === "login")}>
              Split login
            </Link>
            <Link href="/dev/playprove?tab=desktop" className={tabLinkClass(tab === "desktop")}>
              Desktop setup
            </Link>
          </nav>
          <Link href="/" className="text-[13px] text-app-text-muted">
            ← Home
          </Link>
        </div>
      </Card>

      <div className="min-h-0 flex-1">
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
        <div className="p-6 font-sans text-app-text-muted">Loading preview…</div>
      }
    >
      <PlayprovePreviewInner />
    </Suspense>
  );
}
