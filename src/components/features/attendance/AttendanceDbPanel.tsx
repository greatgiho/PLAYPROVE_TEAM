"use client";

import type { Dispatch, SetStateAction } from "react";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { eventCardCssClass, eventCardEmoji } from "./attendanceUtils";
import { EventScheduleModal } from "./EventScheduleModal";
import type { DbAttendanceRow } from "./types";

type ScheduleModal = null | { mode: "create" } | { mode: "edit"; event: TeamEventDto };

type Props = {
  teamCode: string;
  dbEvents: TeamEventDto[];
  setActiveEventId: (id: string) => void;
  activeDbEvent: TeamEventDto | null;
  visibleDbRows: DbAttendanceRow[];
  dbStats: { attending: number; absent: number; undecided: number; total: number };
  isManager: boolean;
  isPlayerView: boolean;
  myPlayerId: string | null | undefined;
  setDbRows: Dispatch<SetStateAction<DbAttendanceRow[]>>;
  loadDb: () => Promise<void>;
  refreshDbEventCounts: () => Promise<void>;
  scheduleModal: ScheduleModal;
  setScheduleModal: Dispatch<SetStateAction<ScheduleModal>>;
};

export function AttendanceDbPanel({
  teamCode,
  dbEvents,
  setActiveEventId,
  activeDbEvent,
  visibleDbRows,
  dbStats,
  isManager,
  isPlayerView,
  myPlayerId,
  setDbRows,
  loadDb,
  refreshDbEventCounts,
  scheduleModal,
  setScheduleModal,
}: Props) {
  return (
    <>
      <div className="grid-2 mb-24">
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--gray-500)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            일정 목록
          </div>
          {dbEvents.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-calendar"></i>
              <p>일정을 추가하세요</p>
            </div>
          ) : (
            dbEvents.map((ev) => (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                className={`event-card ${eventCardCssClass(ev)} ${activeDbEvent?.id === ev.id ? "selected-event" : ""}`}
                style={{
                  borderWidth: activeDbEvent?.id === ev.id ? 3 : 1,
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onClick={() => setActiveEventId(ev.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveEventId(ev.id);
                  }
                }}
              >
                <div className="event-type-icon">{eventCardEmoji(ev)}</div>
                <div className="event-meta" style={{ flex: 1, minWidth: 0 }}>
                  <div className="event-title">{ev.title}</div>
                  <div className="event-info">
                    <span>
                      <i className="far fa-clock"></i>
                      {new Date(ev.starts_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ev.location ? (
                      <span>
                        <i className="fas fa-map-marker-alt"></i>
                        {ev.location}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.attending_count ?? 0}명 참석</div>
                  <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
                    {ev.kind_label}
                    {ev.is_mandatory ? " · 필수" : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {activeDbEvent ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{activeDbEvent.title}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
                      {new Date(activeDbEvent.starts_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                      {activeDbEvent.location ? ` · ${activeDbEvent.location}` : ""}
                    </div>
                  </div>
                  {isManager ? (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => setScheduleModal({ mode: "edit", event: activeDbEvent })}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ fontSize: 12, color: "var(--red)" }}
                        onClick={async () => {
                          if (!confirm("이 일정을 삭제할까요? 출결 기록은 유지되지 않을 수 있습니다.")) return;
                          const res = await fetch(
                            `/api/team/events/${encodeURIComponent(activeDbEvent.id)}?teamCode=${encodeURIComponent(teamCode)}`,
                            { method: "DELETE", credentials: "include" },
                          );
                          if (!res.ok) {
                            const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
                            alert(apiErrorUserHint(res.status, j));
                            return;
                          }
                          await loadDb();
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <div
                    style={{
                      background: "var(--green-bg)",
                      color: "var(--green)",
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    참석 {dbStats.attending}
                  </div>
                  <div
                    style={{
                      background: "var(--red-bg)",
                      color: "var(--red)",
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    불참 {dbStats.absent}
                  </div>
                  <div
                    style={{
                      background: "var(--gray-100)",
                      color: "var(--gray-500)",
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    미정 {dbStats.undecided}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="tbl-wrap">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>선수</th>
                        <th>포지션</th>
                        <th>출결</th>
                        <th>사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDbRows.map((row) => {
                        const canEdit = !isPlayerView || row.player_id === myPlayerId;
                        const isMine = isPlayerView && row.player_id === myPlayerId;
                        return (
                          <tr
                            key={row.player_id}
                            style={
                              isMine
                                ? { background: "rgba(26,92,168,.04)", borderLeft: "3px solid #1a5ca8" }
                                : undefined
                            }
                          >
                            <td style={{ fontWeight: 800 }}>
                              {row.player_name}
                              {isMine ? (
                                <span style={{ fontSize: 10, color: "#1a5ca8", fontWeight: 700 }}> (나)</span>
                              ) : null}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }}>{row.primary_position?.trim() || "-"}</span>
                            </td>
                            <td>
                              {canEdit ? (
                                <div className="att-btn-group">
                                  {(["attending", "absent", "undecided"] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      className={`att-btn ${row.status === st ? st : ""}`}
                                      onClick={async () => {
                                        const reason =
                                          st === "absent" ? window.prompt("불참 사유 (선택)") ?? "" : "";
                                        if (st === "absent" && reason === null) return;
                                        const res = await fetch(
                                          `/api/team/attendance?teamCode=${encodeURIComponent(teamCode)}`,
                                          {
                                            method: "PATCH",
                                            credentials: "include",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              event_id: activeDbEvent.id,
                                              player_id: row.player_id,
                                              status: st,
                                              absence_reason: reason,
                                            }),
                                          },
                                        );
                                        const j = (await res.json().catch(() => ({}))) as {
                                          row?: {
                                            status: string;
                                            absence_reason: string | null;
                                            attendance_id: string | null;
                                          };
                                          error?: string;
                                        };
                                        if (!res.ok) {
                                          alert(apiErrorUserHint(res.status, j as ApiErrorBody));
                                          return;
                                        }
                                        if (j.row) {
                                          setDbRows((prev) =>
                                            prev.map((p) =>
                                              p.player_id === row.player_id
                                                ? {
                                                    ...p,
                                                    status: j.row!.status as DbAttendanceRow["status"],
                                                    absence_reason: j.row!.absence_reason,
                                                    attendance_id: j.row!.attendance_id ?? p.attendance_id,
                                                  }
                                                : p,
                                            ),
                                          );
                                          void refreshDbEventCounts();
                                        }
                                      }}
                                    >
                                      {st === "attending" ? "참석" : st === "absent" ? "불참" : "미정"}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span>
                                  {row.status === "attending"
                                    ? "✓ 참석"
                                    : row.status === "absent"
                                      ? "✗ 불참"
                                      : "— 미정"}
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{row.absence_reason ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <i className="fas fa-mouse-pointer"></i>
              <p>왼쪽에서 일정을 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {scheduleModal ? (
        <EventScheduleModal
          teamCode={teamCode}
          modal={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onSaved={async () => {
            setScheduleModal(null);
            await loadDb();
          }}
        />
      ) : null}
    </>
  );
}
