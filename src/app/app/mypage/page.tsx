"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { MypagePlayerDashboard } from "@/components/mypage/MypagePlayerDashboard";
import { useSession, useAllowableViewModes } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { AttendanceRecord, InjuryReport, MonthlyDue, Player, TeamEvent } from "@/lib/types/entities";
import { teamRoleLabel, viewModeLabel } from "@/lib/types/roles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function MyPage() {
  const { session, setViewMode } = useSession();
  const allowable = useAllowableViewModes();

  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dues, setDues] = useState<MonthlyDue[]>([]);
  const [injuries, setInjuries] = useState<InjuryReport[]>([]);

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  return (
    <AccessGuard page="mypage">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-user-circle"></i> 내 페이지
        </div>
      </div>

      {!session?.playerId ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <i className="fas fa-user-slash"></i>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>연결된 선수 프로필이 없습니다</p>
              <p style={{ fontSize: 14, color: "var(--gray-600)", maxWidth: 420, margin: "0 auto 20px" }}>
                레거시와 같이 개인 대시보드는 <strong>로스터에 연결된 선수</strong> 기준으로 표시됩니다. 데모에서는{" "}
                <strong>선수(박진우)</strong> 계정으로 로그인하거나, 코치/매니저 계정에서 선수 뷰로 전환할 때도 선수
                ID가 있어야 합니다.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                <Link href="/" className="btn btn-primary">
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
      ) : loading ? (
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
        />
      )}
    </AccessGuard>
  );
}
