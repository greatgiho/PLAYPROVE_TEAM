"use client";

import { useSession, useAllowableViewModes } from "@/lib/context/SessionContext";
import { canAccessPage } from "@/lib/permissions/viewControl";
import type { AppPageId } from "@/lib/permissions/viewControl";
import { teamRoleLabel, viewModeLabel } from "@/lib/types/roles";
import type { ViewMode } from "@/lib/types/roles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { id: AppPageId; href: string; label: string; icon: string; tag?: string };

const MANAGEMENT: NavItem[] = [
  { id: "dashboard", href: "/app/dashboard", label: "팀 대시보드", icon: "fa-th-large" },
  { id: "roster", href: "/app/roster", label: "선수단 관리", icon: "fa-users" },
  { id: "attendance", href: "/app/attendance", label: "출결 관리", icon: "fa-calendar-check" },
  { id: "injury", href: "/app/injury", label: "부상·컨디션", icon: "fa-medkit" },
  { id: "dues", href: "/app/dues", label: "회비 관리", icon: "fa-won-sign", tag: "MGR" },
  { id: "depthchart", href: "/app/depthchart", label: "뎁스 차트", icon: "fa-sitemap" },
  { id: "practice_plan", href: "/app/practice_plan", label: "훈련 계획표", icon: "fa-clipboard-list", tag: "v3" },
];

const COACHING: NavItem[] = [
  { id: "performance", href: "/app/performance", label: "역량 평가", icon: "fa-star", tag: "v3" },
  { id: "simulator", href: "/app/simulator", label: "Roster 시뮬레이터", icon: "fa-dice-d20", tag: "v3" },
  { id: "rapidcheck", href: "/app/rapidcheck", label: "훈련 즉시평가", icon: "fa-bolt", tag: "v3" },
  { id: "iip_coach", href: "/app/iip_coach", label: "IIP 관리", icon: "fa-dumbbell", tag: "v3" },
  { id: "ai_tactical", href: "/app/ai_tactical", label: "AI 전술 어시스턴트", icon: "fa-robot", tag: "v3" },
  { id: "growth", href: "/app/growth", label: "성장 속도 분석", icon: "fa-chart-line", tag: "v3" },
  { id: "coach_plan", href: "/app/coach_plan", label: "훈련계획 작성", icon: "fa-pencil-ruler", tag: "v3" },
];

const MYSPACE: NavItem[] = [
  { id: "mypage", href: "/app/mypage", label: "내 페이지", icon: "fa-user-circle" },
  { id: "my_iip", href: "/app/my_iip", label: "나의 훈련 과제", icon: "fa-tasks", tag: "v3" },
  { id: "myfeed", href: "/app/myfeed", label: "My Feed", icon: "fa-rss" },
  { id: "notices", href: "/app/notices", label: "공지사항", icon: "fa-bullhorn" },
];

const MANAGER: NavItem[] = [{ id: "admin", href: "/app/admin", label: "가입 승인 관리", icon: "fa-user-check" }];

function filterNav(items: NavItem[], teamRole: import("@/lib/types/roles").TeamRole, viewMode: ViewMode) {
  return items.filter((it) => canAccessPage(teamRole, viewMode, it.id));
}

function viewModeBadgeClass(mode: ViewMode): string {
  if (mode === "coach") return "bg-blue-100 text-blue-800";
  if (mode === "player") return "bg-emerald-100 text-emerald-800";
  return "bg-red-100 text-[#5a1010]";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout, setViewMode } = useSession();
  const modes = useAllowableViewModes();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!session) return null;

  const viewMode = session.viewMode;
  const teamRole = session.teamRole;

  const management = filterNav(MANAGEMENT, teamRole, viewMode);
  const coaching = filterNav(COACHING, teamRole, viewMode);
  const myspace = filterNav(MYSPACE, teamRole, viewMode);
  const managerOnly = teamRole === "manager" ? filterNav(MANAGER, teamRole, viewMode) : [];

  const pageTitle =
    [...MANAGEMENT, ...COACHING, ...MYSPACE, ...MANAGER].find((n) => pathname.startsWith(n.href))?.label ??
    "PlayProve";

  const navLinkClass = (href: string) => {
    const active = pathname.startsWith(href);
    return [
      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-white font-bold text-[#5a1010] shadow-sm"
        : "text-white/65 hover:bg-white/10 hover:text-white",
    ].join(" ");
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f9f9f9] text-neutral-900">
      {/* 모바일 오버레이 */}
      <div
        role="presentation"
        aria-hidden={!sidebarOpen}
        className={`fixed inset-0 z-[150] bg-black/45 transition-opacity md:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={[
          "fixed left-0 top-0 z-[200] flex h-screen w-[260px] flex-col bg-[#5a1010] text-white shadow-lg",
          "transition-transform duration-[220ms] ease-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white font-['Bebas_Neue',sans-serif] text-[22px] font-black leading-none text-[#5a1010]">
              p
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[17px] font-extrabold tracking-tight text-white">play</span>
              <span className="-mt-0.5 text-[17px] font-extrabold tracking-tight text-[#e8a0a0]">prove</span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">Next.js App Router</span>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-lg text-white/60 hover:text-white md:hidden"
            aria-label="메뉴 닫기"
            onClick={closeSidebar}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="mx-3.5 mt-2.5 mb-1 flex flex-row gap-0.5 rounded-lg bg-black/25 p-1">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              className={[
                "flex flex-1 flex-row items-center justify-center gap-1 rounded-md border-0 px-1 py-1.5 text-[11px] font-bold transition-colors",
                viewMode === m ? "bg-white text-[#5a1010] shadow-sm" : "bg-transparent text-white/50 hover:text-white/80",
              ].join(" ")}
              onClick={() => {
                setViewMode(m);
                closeSidebar();
              }}
            >
              <i
                className={`fas ${m === "manager" ? "fa-shield-alt" : m === "coach" ? "fa-chalkboard-teacher" : "fa-running"}`}
              />{" "}
              {viewModeLabel(m)}
            </button>
          ))}
        </div>

        <div className="mx-4 mb-2 mt-4 flex items-center gap-2.5 rounded-lg bg-white/10 px-3.5 py-3">
          <span className="text-2xl">🏈</span>
          <div>
            <div className="text-sm font-bold text-white">{session.teamName}</div>
            <div className="mt-0.5 text-[11px] text-white/50">2026 시즌</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          <div className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-wide text-white/45">역할</div>
          <div className="px-3.5 pb-2.5 text-xs font-extrabold text-white/75">{teamRoleLabel(teamRole)}</div>

          <div className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-wide text-white/45">MANAGEMENT</div>
          <nav className="flex flex-col gap-0.5 px-3 py-1">
            {management.map((it) => (
              <Link key={it.href} href={it.href} className={navLinkClass(it.href)} onClick={closeSidebar}>
                <i className={`fas ${it.icon} w-[18px] text-center text-[15px]`} />
                <span>{it.label}</span>
                {it.tag ? (
                  <span className={it.tag === "MGR" ? "nav-tag-admin" : "nav-badge-new"}>{it.tag}</span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-2.5 border-t border-white/10 px-3 pb-2 pt-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">
            COACHING
          </div>
          <nav className="flex flex-col gap-0.5 px-3 py-1">
            {coaching.map((it) => (
              <Link key={it.href} href={it.href} className={navLinkClass(it.href)} onClick={closeSidebar}>
                <i className={`fas ${it.icon} w-[18px] text-center text-[15px]`} />
                <span>{it.label}</span>
                {it.tag ? <span className="nav-badge-new">{it.tag}</span> : null}
              </Link>
            ))}
          </nav>

          {managerOnly.length ? (
            <>
              <div className="mt-2.5 border-t border-white/10 px-3 pb-2 pt-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">
                MANAGER
              </div>
              <nav className="flex flex-col gap-0.5 px-3 py-1">
                {managerOnly.map((it) => (
                  <Link key={it.href} href={it.href} className={navLinkClass(it.href)} onClick={closeSidebar}>
                    <i className={`fas ${it.icon} w-[18px] text-center text-[15px]`} />
                    <span>{it.label}</span>
                  </Link>
                ))}
              </nav>
            </>
          ) : null}

          <div className="mt-2.5 border-t border-white/10 px-3 pb-2 pt-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">
            MY SPACE
          </div>
          <nav className="flex flex-col gap-0.5 px-3 py-1">
            {myspace.map((it) => (
              <Link key={it.href} href={it.href} className={navLinkClass(it.href)} onClick={closeSidebar}>
                <i className={`fas ${it.icon} w-[18px] text-center text-[15px]`} />
                <span>{it.label}</span>
                {it.tag ? <span className="nav-badge-new">{it.tag}</span> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full cursor-pointer rounded-md border border-white/15 bg-white/[0.08] py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/15"
          >
            <i className="fas fa-sign-out-alt" /> 로그아웃
          </button>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e8a0a0] text-xs font-extrabold text-[#5a1010]">
              {session.displayName.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">{session.displayName}</div>
              <div className="truncate text-[11px] text-white/50">{session.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col md:pl-[260px]">
        <header className="sticky top-0 z-[100] flex h-[60px] w-full flex-shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)] sm:gap-4 sm:px-5 md:px-7">
          <button
            type="button"
            className="rounded p-1 text-xl text-neutral-700 hover:bg-neutral-100 md:hidden"
            aria-label="메뉴 열기"
            onClick={openSidebar}
          >
            <i className="fas fa-bars" />
          </button>
          <div className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-neutral-900 sm:text-[17px] md:text-lg">
            {pageTitle}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${viewModeBadgeClass(viewMode)}`}
            >
              <i className="fas fa-shield-alt" /> <span>{viewModeLabel(viewMode)}</span>
            </div>
            <span className="hidden rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#7B1818] sm:inline">
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>
        <main
          className="next-page-root w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5 md:px-8 md:py-7 lg:px-10"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
