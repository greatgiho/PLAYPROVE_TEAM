"use client";

import type { DemoPersona } from "@/lib/auth/sessionTypes";
import { useSession } from "@/lib/context/SessionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const CARDS: { persona: DemoPersona; title: string; sub: string; icon: string; cls: string }[] = [
  {
    persona: "manager",
    title: "매니저",
    sub: "회비·승인·전체 운영",
    icon: "fa-shield-alt",
    cls: "owner",
  },
  {
    persona: "head_coach",
    title: "헤드 코치",
    sub: "코칭·평가·훈련 기획",
    icon: "fa-chalkboard-teacher",
    cls: "coach",
  },
  {
    persona: "part_coach",
    title: "파트 코치",
    sub: "코칭(일부 메뉴 제한)",
    icon: "fa-user-tie",
    cls: "coach",
  },
  {
    persona: "player",
    title: "선수",
    sub: "개인 뷰·출결(본인)",
    icon: "fa-running",
    cls: "player",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { session, isReady, loginDemo } = useSession();

  useEffect(() => {
    if (!isReady) return;
    if (session) router.replace("/app/dashboard");
  }, [isReady, session, router]);

  return (
    <div className="login-body">
      <div className="login-bg">
        <div className="bg-circle c1"></div>
        <div className="bg-circle c2"></div>
        <div className="bg-circle c3"></div>
      </div>
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">p</div>
            <div>
              <div className="login-brand">
                playprove
              </div>
              <div className="login-sub">Team ERP · Next.js</div>
            </div>
          </div>
          <h2 className="login-title">데모로 시작하기</h2>
          <p className="login-desc">
            admin/owner 개념은 <strong>매니저(manager)</strong>로 통일했습니다.
            <br />
            헤드 코치 / 파트 코치 / 선수 페르소나를 선택하세요.
          </p>
          <div className="demo-grid">
            {CARDS.map((c) => (
              <button
                key={c.persona}
                type="button"
                className={`demo-btn ${c.cls}`}
                onClick={() => {
                  loginDemo(c.persona, "google");
                  router.push("/app/dashboard");
                }}
              >
                <i className={`fas ${c.icon}`}></i>
                <div className="demo-btn-label">{c.title}</div>
                <div className="demo-btn-sub">{c.sub}</div>
              </button>
            ))}
          </div>
          <p className="login-terms" style={{ marginTop: 18 }}>
            레거시 HTML 버전은 저장소의 <code>index.html</code> 을 참고하세요.
          </p>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <Link href="/" className="login-footer-link">
              홈
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
