"use client";

import { ProfileAvatarSlots } from "@/components/mypage/ProfileAvatarSlots";
import { MypagePlayerDashboard } from "@/components/mypage/MypagePlayerDashboard";
import { MypageStaffDashboard } from "@/components/mypage/MypageStaffDashboard";
import { teamRoleLabel, viewModeLabel } from "@/lib/types/roles";
import Link from "next/link";
import { useMypagePageState } from "./useMypagePageState";

export function MypagePageView() {
  const s = useMypagePageState();

  return (
    <>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-user-circle"></i> 내 페이지
        </div>
      </div>

      {s.teamCode && s.session?.userId ? (
        s.profileFetchState === "loading" ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: 16, color: "var(--gray-600)", fontSize: 14 }}>
              프로필 정보를 불러오는 중…
            </div>
          </div>
        ) : s.profileFetchState === "missing" ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: 16, fontSize: 14, color: "var(--gray-700)" }}>
              DB에 해당 사용자의 <code>profiles</code> 행이 없습니다.{" "}
              <code style={{ fontSize: 12 }}>npx prisma db seed</code> 후 다시 시도해 주세요.
            </div>
          </div>
        ) : s.profileFetchState === "error" && s.profileErrorHint ? (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(180, 35, 24, 0.35)" }}>
            <div className="card-body" style={{ padding: 16, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--danger, #b42318)" }}>프로필 API</strong> — {s.profileErrorHint}
            </div>
          </div>
        ) : s.profilePhotos ? (
          <ProfileAvatarSlots
            userId={s.session.userId}
            initial={s.profilePhotos}
            onUpdated={s.setProfilePhotos}
          />
        ) : null
      ) : null}

      {s.showStaffDash && !s.teamCode ? (
        <div className="card">
          <div className="card-body" style={{ padding: 20, fontSize: 14, color: "var(--gray-700)" }}>
            스태프 개인 페이지는 DB 팀 코드가 필요합니다. 환경 변수{" "}
            <code style={{ fontSize: 12 }}>NEXT_PUBLIC_PLAYPROVE_TEAM_CODE</code> 를 설정한 뒤 다시 열어 주세요.
          </div>
        </div>
      ) : s.showStaffDash ? (
        s.staffState === "loading" || s.staffState === "idle" ? (
          <div className="card">
            <div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--gray-600)" }}>
              스태프 정보를 불러오는 중…
            </div>
          </div>
        ) : s.staffState === "error" ? (
          <div className="card">
            <div className="card-body">
              <div className="empty-state" style={{ padding: "28px 16px" }}>
                <i className="fas fa-plug"></i>
                <p style={{ fontWeight: 700 }}>스태프 프로필을 불러오지 못했습니다</p>
                <p style={{ fontSize: 14, color: "var(--gray-600)", maxWidth: 440, margin: "0 auto 16px" }}>
                  {s.staffError}
                </p>
                <Link href="/app/dashboard" className="btn btn-primary">
                  대시보드로
                </Link>
              </div>
            </div>
          </div>
        ) : s.staffContext ? (
          <MypageStaffDashboard
            context={s.staffContext}
            onReload={() => {
              s.setStaffReloadToken((n) => n + 1);
            }}
          />
        ) : null
      ) : s.showPlayerDash ? (
        s.loading ? (
          <div className="card">
            <div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--gray-600)" }}>
              불러오는 중…
            </div>
          </div>
        ) : !s.player ? (
          <div className="empty-state">
            <i className="fas fa-user-slash"></i>
            <p>선수 정보를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <MypagePlayerDashboard
            player={s.player}
            events={s.events}
            attendance={s.attendance}
            dues={s.dues}
            injuries={s.injuries}
            rosterAvatarUrl={s.profilePhotos?.avatarUrl ?? null}
            personalAvatarUrl={s.profilePhotos?.personalAvatarUrl ?? null}
          />
        )
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <i className="fas fa-user-slash"></i>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>표시할 개인 대시보드 컨텍스트가 없습니다</p>
              <p style={{ fontSize: 14, color: "var(--gray-600)", maxWidth: 420, margin: "0 auto 20px" }}>
                선수 계정은 로스터에 연결된 <code>playerId</code> 가 있어야 합니다. 스태프는 팀 멤버십이 DB에 있어야 합니다.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                <Link href="/login" className="btn btn-primary">
                  <i className="fas fa-sign-in-alt"></i> 로그인 화면으로
                </Link>
                {s.allowable.includes("player") && s.session ? (
                  <button type="button" className="btn btn-secondary" onClick={() => s.setViewMode("player")}>
                    <i className="fas fa-eye"></i> 선수 뷰로 전환
                  </button>
                ) : null}
              </div>
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: "1px solid var(--gray-100)",
                  fontSize: 13,
                  color: "var(--gray-600)",
                  textAlign: "left",
                  maxWidth: 480,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <div>
                  <strong>표시 이름:</strong> {s.session?.displayName ?? "—"}
                </div>
                <div>
                  <strong>팀 역할:</strong> {s.session ? teamRoleLabel(s.session.teamRole) : "—"}
                </div>
                <div>
                  <strong>현재 뷰:</strong> {s.session ? viewModeLabel(s.session.viewMode) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
