"use client";

import type { Dispatch, SetStateAction } from "react";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { AttendanceRecord, Player, TeamEvent } from "@/lib/types/entities";

type Props = {
  events: TeamEvent[];
  activeEvent: TeamEvent | null;
  setActiveEventId: (id: string) => void;
  players: Player[];
  map: Map<string, AttendanceRecord>;
  isPlayerView: boolean;
  myPlayerId: string | null | undefined;
  setAtt: Dispatch<SetStateAction<AttendanceRecord[]>>;
};

export function AttendanceLocalPanel({
  events,
  activeEvent,
  setActiveEventId,
  players,
  map,
  isPlayerView,
  myPlayerId,
  setAtt,
}: Props) {
  const { session } = useSession();

  return (
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
  );
}
