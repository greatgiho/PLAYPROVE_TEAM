"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { AttendanceRecord, Player, TeamEvent } from "@/lib/types/entities";
import { useEffect, useMemo, useState } from "react";

export default function AttendancePage() {
  return (
    <AccessGuard page="attendance">
      <AttendanceInner />
    </AccessGuard>
  );
}

function AttendanceInner() {
  const { session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [att, setAtt] = useState<AttendanceRecord[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    const [p, e, a] = await Promise.all([
      svc.players.listByTeam(session.teamId),
      svc.events.listByTeam(session.teamId),
      svc.attendance.listByTeam(session.teamId),
    ]);
    setPlayers(p.filter((x) => x.player_status === "active" || x.player_status === "injured"));
    setEvents([...e].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    setAtt(a);
    setActiveEventId((cur) => {
      if (cur && e.some((x) => x.id === cur)) return cur;
      return e[0]?.id ?? null;
    });
  };

  useEffect(() => {
    void load();
  }, [session]);

  const activeEvent = useMemo(() => events.find((x) => x.id === activeEventId) ?? null, [events, activeEventId]);
  const map = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    if (!activeEvent) return m;
    for (const r of att) {
      if (r.event_id === activeEvent.id) m.set(r.player_id, r);
    }
    return m;
  }, [att, activeEvent]);

  const isPlayerView = session?.viewMode === "player";
  const myPlayerId = session?.playerId;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-calendar-check"></i> 출결 관리
        </div>
      </div>

      {isPlayerView ? (
        <div
          style={{
            background: "var(--blue-bg)",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "#1e40af",
          }}
        >
          <i className="fas fa-info-circle"></i> <strong>본인 출결만 변경</strong>할 수 있습니다.
        </div>
      ) : null}

      <div className="grid-2 mb-24">
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-500)", marginBottom: 10 }}>일정</div>
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className={`event-card practice ${activeEvent?.id === ev.id ? "selected-event" : ""}`}
              style={{
                width: "100%",
                textAlign: "left",
                borderWidth: activeEvent?.id === ev.id ? 3 : 1,
                marginBottom: 8,
                cursor: "pointer",
              }}
              onClick={() => setActiveEventId(ev.id)}
            >
              <div className="event-meta">
                <div className="event-title">{ev.title}</div>
                <div className="event-info">
                  <span>{new Date(ev.starts_at).toLocaleString("ko-KR")}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="card">
          <div className="tbl-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>선수</th>
                  <th>출결</th>
                </tr>
              </thead>
              <tbody>
                {activeEvent ? (
                  players.map((p) => {
                    const row = map.get(p.id);
                    const canEdit = !isPlayerView || p.id === myPlayerId;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 800 }}>{p.full_name}</td>
                        <td>
                          {canEdit ? (
                            <div className="att-btn-group">
                              {(["attending", "absent", "undecided"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  className={`att-btn ${row?.status === st ? st : ""}`}
                                  onClick={async () => {
                                    if (!session || !activeEvent) return;
                                    const reason =
                                      st === "absent" ? window.prompt("불참 사유 (선택)") ?? "" : "";
                                    const svc = getTeamDataServices();
                                    const saved = await svc.attendance.upsert(
                                      session.teamId,
                                      row?.id ?? null,
                                      {
                                        event_id: activeEvent.id,
                                        player_id: p.id,
                                        status: st,
                                        absence_reason: reason,
                                      },
                                      session.userId,
                                    );
                                    setAtt((prev) => {
                                      const others = prev.filter((x) => x.id !== saved.id);
                                      return [...others, saved];
                                    });
                                  }}
                                >
                                  {st === "attending" ? "참석" : st === "absent" ? "불참" : "미정"}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span>{row?.status ?? "undecided"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2}>
                      <div className="empty-state">일정이 없습니다</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
