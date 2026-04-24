"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { ProfileAvatarSlots, type ProfileAvatarPayload } from "@/components/mypage/ProfileAvatarSlots";
import { MypagePlayerDashboard } from "@/components/mypage/MypagePlayerDashboard";
import { MypageStaffDashboard } from "@/components/mypage/MypageStaffDashboard";
import { useSession, useAllowableViewModes } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { MypageStaffContext } from "@/lib/types/mypageStaffContext";
import type { AttendanceRecord, InjuryReport, MonthlyDue, Player, TeamEvent } from "@/lib/types/entities";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { teamRoleLabel, viewModeLabel, type TeamRole } from "@/lib/types/roles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DB_TEAM_CODE = process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ?? "";

function isStaffTeamRole(role: TeamRole): boolean {
  return role === "manager" || role === "head_coach" || role === "part_coach";
}

export default function MyPage() {
  const { session, setViewMode } = useSession();
  const allowable = useAllowableViewModes();

  const [loading, setLoading] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<ProfileAvatarPayload | null>(null);
  const [profileFetchState, setProfileFetchState] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle");
  const [profileErrorHint, setProfileErrorHint] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dues, setDues] = useState<MonthlyDue[]>([]);
  const [injuries, setInjuries] = useState<InjuryReport[]>([]);

  const [staffContext, setStaffContext] = useState<MypageStaffContext | null>(null);
  const [staffState, setStaffState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffReloadToken, setStaffReloadToken] = useState(0);

  const showPlayerDash = session?.teamRole === "player" && Boolean(session.playerId);
  const showStaffDash = session && isStaffTeamRole(session.teamRole);

  const loadPlayer = useCallback(async () => {
    if (!session?.teamId || !session.playerId) {
      setPlayer(null);
      setEvents([]);
      setAttendance([]);
      setDues([]);
      setInjuries([]);
      return;
    }
    setLoading(true);
    try {
      const svc = getTeamDataServices();
      const [p, ev, att, du, inj] = await Promise.all([
        svc.players.get(session.teamId, session.playerId),
        svc.events.listByTeam(session.teamId),
        svc.attendance.listByTeam(session.teamId),
        svc.dues.listByTeam(session.teamId),
        svc.injuries.listByTeam(session.teamId),
      ]);
      setPlayer(p);
      setEvents(ev);
      setAttendance(att);
      setDues(du);
      setInjuries(inj);
    } finally {
      setLoading(false);
    }
  }, [session?.teamId, session?.playerId]);

  useEffect(() => {
    if (!showPlayerDash) {
      setPlayer(null);
      setEvents([]);
      setAttendance([]);
      setDues([]);
      setInjuries([]);
      return;
    }
    void loadPlayer();
  }, [loadPlayer, showPlayerDash]);

  useEffect(() => {
    if (!showStaffDash || !DB_TEAM_CODE) {
      setStaffContext(null);
      setStaffState("idle");
      setStaffError(null);
      return;
    }
    let cancelled = false;
    setStaffState("loading");
    setStaffError(null);
    void (async () => {
      const res = await fetch("/api/mypage/context", { cache: "no-store", credentials: "include" });
      if (cancelled) return;
      const j = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setStaffContext(null);
        setStaffState("error");
        setStaffError(apiErrorUserHint(res.status, j as ApiErrorBody));
        return;
      }
      setStaffContext(j as MypageStaffContext);
      setStaffState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [showStaffDash, session?.userId, staffReloadToken]);

  useEffect(() => {
    if (!DB_TEAM_CODE || !session?.userId) {
      setProfilePhotos(null);
      setProfileFetchState("idle");
      return;
    }
    let cancelled = false;
    setProfileFetchState("loading");
    void (async () => {
      setProfileErrorHint(null);
      const res = await fetch(`/api/profile/${session.userId}`, { cache: "no-store", credentials: "include" });
      if (cancelled) return;
      if (res.status === 404) {
        setProfileFetchState("missing");
        setProfilePhotos(null);
        return;
      }
      const j = (await res.json().catch(() => null)) as ProfileAvatarPayload | ApiErrorBody | null;
      if (!res.ok) {
        setProfileFetchState("error");
        setProfileErrorHint(apiErrorUserHint(res.status, j as ApiErrorBody));
        setProfilePhotos(null);
        return;
      }
      setProfileFetchState("ok");
      setProfilePhotos({
        avatarUrl: (j as ProfileAvatarPayload).avatarUrl ?? null,
        personalAvatarUrl: (j as ProfileAvatarPayload).personalAvatarUrl ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return (
    <AccessGuard page="mypage">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-user-circle"></i> 내 페이지
        </div>
      </div>

      {DB_TEAM_CODE && session?.userId ? (
        profileFetchState === "loading" ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: 16, color: "var(--gray-600)", fontSize: 14 }}>
              프로필 정보를 불러오는 중…
            </div>
          </div>
        ) : profileFetchState === "missing" ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ padding: 16, fontSize: 14, color: "var(--gray-700)" }}>
              DB에 해당 사용자의 <code>profiles</code> 행이 없습니다.{" "}
              <code style={{ fontSize: 12 }}>npx prisma db seed</code> 후 다시 시도해 주세요.
            </div>
          </div>
        ) : profileFetchState === "error" && profileErrorHint ? (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(180, 35, 24, 0.35)" }}>
            <div className="card-body" style={{ padding: 16, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--danger, #b42318)" }}>프로필 API</strong> — {profileErrorHint}
            </div>
          </div>
        ) : profilePhotos ? (
          <ProfileAvatarSlots userId={session.userId} initial={profilePhotos} onUpdated={setProfilePhotos} />
        ) : null
      ) : null}

      {showStaffDash && !DB_TEAM_CODE ? (
        <div className="card">
          <div className="card-body" style={{ padding: 20, fontSize: 14, color: "var(--gray-700)" }}>
            스태프 개인 페이지는 DB 팀 코드가 필요합니다. 환경 변수{" "}
            <code style={{ fontSize: 12 }}>NEXT_PUBLIC_PLAYPROVE_TEAM_CODE</code> 를 설정한 뒤 다시 열어 주세요.
          </div>
        </div>
      ) : showStaffDash ? (
        staffState === "loading" || staffState === "idle" ? (
          <div className="card">
            <div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--gray-600)" }}>
              스태프 정보를 불러오는 중…
            </div>
          </div>
        ) : staffState === "error" ? (
          <div className="card">
            <div className="card-body">
              <div className="empty-state" style={{ padding: "28px 16px" }}>
                <i className="fas fa-plug"></i>
                <p style={{ fontWeight: 700 }}>스태프 프로필을 불러오지 못했습니다</p>
                <p style={{ fontSize: 14, color: "var(--gray-600)", maxWidth: 440, margin: "0 auto 16px" }}>
                  {staffError}
                </p>
                <Link href="/app/dashboard" className="btn btn-primary">
                  대시보드로
                </Link>
              </div>
            </div>
          </div>
        ) : staffContext ? (
          <MypageStaffDashboard
            context={staffContext}
            onReload={() => {
              setStaffReloadToken((n) => n + 1);
            }}
          />
        ) : null
      ) : showPlayerDash ? (
        loading ? (
          <div className="card">
            <div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--gray-600)" }}>
              불러오는 중…
            </div>
          </div>
        ) : !player ? (
          <div className="empty-state">
            <i className="fas fa-user-slash"></i>
            <p>선수 정보를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <MypagePlayerDashboard
            player={player}
            events={events}
            attendance={attendance}
            dues={dues}
            injuries={injuries}
            rosterAvatarUrl={profilePhotos?.avatarUrl ?? null}
            personalAvatarUrl={profilePhotos?.personalAvatarUrl ?? null}
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
                {allowable.includes("player") && session ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setViewMode("player")}>
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
                  <strong>표시 이름:</strong> {session?.displayName ?? "—"}
                </div>
                <div>
                  <strong>팀 역할:</strong> {session ? teamRoleLabel(session.teamRole) : "—"}
                </div>
                <div>
                  <strong>현재 뷰:</strong> {session ? viewModeLabel(session.viewMode) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AccessGuard>
  );
}
