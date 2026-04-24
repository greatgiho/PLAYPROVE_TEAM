"use client";

import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import type { DemoPersona } from "@/lib/auth/sessionTypes";
import { PlayproveLogo } from "@/components/playprove/PlayproveLogo";
import { PlayproveTheme } from "@/components/playprove/PlayproveTheme";
import { PLAYPROVE_DESKTOP_LOGIN_HERO } from "@/components/playprove/pathSlides";
import pp from "@/components/playprove/playprove.module.css";
import { useSession } from "@/lib/context/SessionContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CARDS: { persona: DemoPersona; title: string; sub: string; icon: string; cls: string }[] = [
  {
    persona: "manager",
    title: "매니저",
    sub: "전체 권한",
    icon: "fa-shield-alt",
    cls: "owner",
  },
  {
    persona: "head_coach",
    title: "헤드 코치",
    sub: "코칭·평가·훈련",
    icon: "fa-chalkboard-teacher",
    cls: "coach",
  },
  {
    persona: "part_coach",
    title: "파트 코치",
    sub: "제한된 코칭 뷰",
    icon: "fa-user-tie",
    cls: "part",
  },
  {
    persona: "player",
    title: "선수",
    sub: "개인 뷰",
    icon: "fa-running",
    cls: "player",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { session, isReady, loginDemo, logout } = useSession();
  const [busyPersona, setBusyPersona] = useState<DemoPersona | null>(null);

  const loggedIn = isReady && session && isAllowedAppUserId(session.userId);

  return (
    <PlayproveTheme>
      <div className={pp.ppLoginPage}>
        <div className={pp.ppLoginTopLinks}>
          <Link href="/">홈</Link>
        </div>

        <div className={pp.ppLoginCard}>
          <div className={pp.ppLoginHero}>
            <Image
              src={PLAYPROVE_DESKTOP_LOGIN_HERO}
              alt=""
              fill
              priority
              sizes="(max-width: 860px) 100vw, 55vw"
            />
          </div>

          <div className={pp.ppLoginFormCol}>
            <PlayproveLogo size="sm" />

            {loggedIn && session && (
              <div
                role="status"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(112, 32, 31, 0.08)",
                  border: "1px solid rgba(112, 32, 31, 0.2)",
                  fontSize: 13,
                  color: "var(--pp-muted, #4a4a4a)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--pp-text, #1a1a1a)" }}>{session.displayName}</strong> 로 로그인된
                상태입니다. 다른 역할로 바꾸려면 아래 데모 버튼을 누르거나,{" "}
                <button
                  type="button"
                  onClick={() => void logout()}
                  style={{
                    marginLeft: 4,
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: "var(--pp-primary, #70201f)",
                    fontWeight: 800,
                    cursor: "pointer",
                    font: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  로그아웃
                </button>
                후 다시 선택하세요.{" "}
                <Link href="/app/dashboard" style={{ fontWeight: 800, color: "var(--pp-primary, #70201f)" }}>
                  대시보드로 →
                </Link>
              </div>
            )}

            <div>
              <h2 className="login-title">시작하기</h2>
              <p className="login-desc" style={{ marginBottom: 0 }}>
                팀 운영 플랫폼에 오신 걸 환영합니다. 실제 서비스에서는 소셜 계정으로 로그인하고, 지금은{" "}
                <strong>허용된 데모 계정</strong>으로 앱을 체험할 수 있습니다.
              </p>
            </div>

            <div>
              <button
                type="button"
                className="social-btn google"
                onClick={() => window.alert("Google 로그인은 아직 연결되지 않았습니다. 아래 데모 체험을 이용해 주세요.")}
              >
                <svg className="social-icon" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google 계정으로 계속하기
              </button>
              <button
                type="button"
                className="social-btn apple"
                onClick={() => window.alert("Apple 로그인은 아직 연결되지 않았습니다. 아래 데모 체험을 이용해 주세요.")}
              >
                <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple 계정으로 계속하기
              </button>
            </div>

            <div className="divider">
              <span>또는</span>
            </div>

            <div className="demo-section">
              <div className="demo-title">
                <i className="fas fa-flask" aria-hidden />
                데모 체험
                <span className="demo-badge">프로토타입</span>
              </div>
              <div className="demo-grid">
                {CARDS.map((c) => (
                  <button
                    key={c.persona}
                    type="button"
                    className={`demo-btn ${c.cls}`}
                    disabled={busyPersona !== null}
                    onClick={async () => {
                      setBusyPersona(c.persona);
                      try {
                        await loginDemo(c.persona, "google");
                        router.push("/app/dashboard");
                      } finally {
                        setBusyPersona(null);
                      }
                    }}
                  >
                    <i className={`fas ${c.icon}`} aria-hidden />
                    <div className="demo-btn-label">{busyPersona === c.persona ? "입장 중…" : c.title}</div>
                    <div className="demo-btn-sub">{c.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <p className="login-terms">
              계속 진행하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하는 것으로 간주됩니다. 데모는
              허용된 테스트 계정만 서버 쿠키로 인증됩니다.
            </p>
          </div>
        </div>
      </div>
    </PlayproveTheme>
  );
}
