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
  { id: "practice_plan", href: "/app/practice_plan", label: "훈련 계획", icon: "fa-clipboard-list", tag: "v3" },
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

  return (
    <div id="screen-app" className="screen active" style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} id="sidebar">
        <div className="sidebar-header">
          <div className="logo-wrap">
            <div className="logo-icon">p</div>
            <div className="logo-text">
              <span className="logo-brand">play</span>
              <span className="logo-brand2">prove</span>
              <span className="logo-sub">Next.js App Router</span>
            </div>
          </div>
          <button type="button" className="sidebar-close" id="sidebarClose" aria-label="메뉴 닫기" onClick={closeSidebar}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="view-switcher" id="viewSwitcher">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              className={`view-btn ${viewMode === m ? "active" : ""}`}
              data-view={m}
              onClick={() => {
                setViewMode(m);
                closeSidebar();
              }}
            >
              <i className={`fas ${m === "manager" ? "fa-shield-alt" : m === "coach" ? "fa-chalkboard-teacher" : "fa-running"}`}></i>{" "}
              {viewModeLabel(m)}
            </button>
          ))}
        </div>

        <div className="sidebar-team" id="sidebarTeam">
          <div className="team-badge">🏈</div>
          <div>
            <div className="team-name">{session.teamName}</div>
            <div className="team-season">2026 시즌</div>
          </div>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section-label">역할</div>
          <div style={{ padding: "0 14px 10px", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.75)" }}>
            {teamRoleLabel(teamRole)}
          </div>

          <div className="sidebar-section-label">MANAGEMENT</div>
          <nav className="sidebar-nav">
            {management.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${pathname.startsWith(it.href) ? "active" : ""}`}
                data-page={it.id}
                onClick={closeSidebar}
              >
                <i className={`fas ${it.icon}`}></i>
                <span>{it.label}</span>
                {it.tag ? (
                  <span className={it.tag === "MGR" ? "nav-tag-admin" : "nav-badge-new"}>{it.tag}</span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="sidebar-section-label" style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}>
            COACHING
          </div>
          <nav className="sidebar-nav">
            {coaching.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${pathname.startsWith(it.href) ? "active" : ""}`}
                data-page={it.id}
                onClick={closeSidebar}
              >
                <i className={`fas ${it.icon}`}></i>
                <span>{it.label}</span>
                {it.tag ? <span className="nav-badge-new">{it.tag}</span> : null}
              </Link>
            ))}
          </nav>

          {managerOnly.length ? (
            <>
              <div
                className="sidebar-section-label"
                style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}
              >
                MANAGER
              </div>
              <nav className="sidebar-nav">
                {managerOnly.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`nav-item ${pathname.startsWith(it.href) ? "active" : ""}`}
                    data-page={it.id}
                    onClick={closeSidebar}
                  >
                    <i className={`fas ${it.icon}`}></i>
                    <span>{it.label}</span>
                  </Link>
                ))}
              </nav>
            </>
          ) : null}

          <div className="sidebar-section-label" style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}>
            MY SPACE
          </div>
          <nav className="sidebar-nav">
            {myspace.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${pathname.startsWith(it.href) ? "active" : ""}`}
                data-page={it.id}
                onClick={closeSidebar}
              >
                <i className={`fas ${it.icon}`}></i>
                <span>{it.label}</span>
                {it.tag ? <span className="nav-badge-new">{it.tag}</span> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={() => logout()}
            style={{
              width: "100%",
              padding: 8,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "rgba(255,255,255,.7)",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <i className="fas fa-sign-out-alt"></i> 로그아웃
          </button>
          <div className="user-info" style={{ marginTop: 10 }}>
            <div className="user-avatar">{session.displayName.slice(-2)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{session.displayName}</div>
              <div className="user-role">{session.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`overlay${sidebarOpen ? " show" : ""}`}
        id="overlay"
        role="presentation"
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
      />

      <div className="main-wrap" id="mainWrap" style={{ flex: 1, minWidth: 0 }}>
        <header className="topbar">
          <button type="button" className="menu-btn" id="menuBtn" aria-label="메뉴 열기" onClick={openSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-right">
            <div className="view-mode-badge" id="viewModeBadge">
              <i className="fas fa-shield-alt"></i> <span id="viewModeLabel">{viewModeLabel(viewMode)}</span>
            </div>
            <span className="date-badge" id="todayDate">
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>
        <main className="page-content next-page-root" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
