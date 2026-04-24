"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import type { AttendanceRecord, Player, TeamEvent } from "@/lib/types/entities";
import { useCallback, useEffect, useMemo, useState } from "react";

const DB_TEAM_CODE = process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ?? "";

type DbAttendanceRow = {
  player_id: string;
  player_name: string;
  primary_position: string | null;
  player_status: string;
  attendance_id: string | null;
  status: "attending" | "absent" | "undecided";
  absence_reason: string | null;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventCardEmoji(ev: TeamEventDto): string {
  return ev.session_kind === "seminar" ? "📋" : "🏈";
}

function eventCardCssClass(ev: TeamEventDto): string {
  return ev.session_kind === "seminar" ? "meeting" : "practice";
}

export default function AttendancePage() {
  return (
    <AccessGuard page="attendance">
      <AttendanceInner />
    </AccessGuard>
  );
}

function AttendanceInner() {
  const { session } = useSession();
  const useDb = Boolean(DB_TEAM_CODE);

  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [att, setAtt] = useState<AttendanceRecord[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const [dbEvents, setDbEvents] = useState<TeamEventDto[]>([]);
  const [dbRows, setDbRows] = useState<DbAttendanceRow[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbErr, setDbErr] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState<null | { mode: "create" } | { mode: "edit"; event: TeamEventDto }>(
    null,
  );

  const isManager = session?.teamRole === "manager";
  const isPlayerView = session?.viewMode === "player";
  const myPlayerId = session?.playerId;

  const loadLocal = async () => {
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

  const loadDbEvents = useCallback(async () => {
    const res = await fetch(
      `/api/team/events?teamCode=${encodeURIComponent(DB_TEAM_CODE)}&withAttendanceCounts=1`,
      { credentials: "include", cache: "no-store" },
    );
    const j = (await res.json().catch(() => ({}))) as { events?: TeamEventDto[]; error?: string };
    if (!res.ok) {
      throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
    }
    const list = j.events ?? [];
    setDbEvents(list);
    setActiveEventId((cur) => {
      if (cur && list.some((x) => x.id === cur)) return cur;
      return list[0]?.id ?? null;
    });
  }, []);

  const loadDbAttendance = useCallback(async (eventId: string) => {
    const res = await fetch(
      `/api/team/attendance?teamCode=${encodeURIComponent(DB_TEAM_CODE)}&eventId=${encodeURIComponent(eventId)}`,
      { credentials: "include", cache: "no-store" },
    );
    const j = (await res.json().catch(() => ({}))) as { rows?: DbAttendanceRow[]; error?: string };
    if (!res.ok) {
      throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
    }
    setDbRows(j.rows ?? []);
  }, []);

  const loadDb = useCallback(async () => {
    if (!DB_TEAM_CODE) return;
    setDbLoading(true);
    setDbErr(null);
    try {
      await loadDbEvents();
    } catch (e) {
      setDbErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setDbLoading(false);
    }
  }, [loadDbEvents]);

  useEffect(() => {
    if (useDb) void loadDb();
    else void loadLocal();
  }, [session, useDb, loadDb]);

  useEffect(() => {
    if (!useDb || !activeEventId) {
      setDbRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadDbAttendance(activeEventId);
      } catch (e) {
        if (!cancelled) setDbErr(e instanceof Error ? e.message : "출결 불러오기 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useDb, activeEventId, loadDbAttendance]);

  const activeEvent = useMemo(() => events.find((x) => x.id === activeEventId) ?? null, [events, activeEventId]);
  const activeDbEvent = useMemo(() => dbEvents.find((x) => x.id === activeEventId) ?? null, [dbEvents, activeEventId]);

  const map = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    if (!activeEvent) return m;
    for (const r of att) {
      if (r.event_id === activeEvent.id) m.set(r.player_id, r);
    }
    return m;
  }, [att, activeEvent]);

  const visibleDbRows = useMemo(() => {
    return dbRows.filter((r) => r.player_status === "active" || r.player_status === "injured");
  }, [dbRows]);

  const dbStats = useMemo(() => {
    const pool = dbRows.filter((r) => r.player_status === "active" || r.player_status === "injured");
    const attending = pool.filter((r) => r.status === "attending").length;
    const absent = pool.filter((r) => r.status === "absent").length;
    const undecided = pool.length - attending - absent;
    return { attending, absent, undecided, total: pool.length };
  }, [dbRows]);

  const refreshDbEventCounts = useCallback(async () => {
    try {
      await loadDbEvents();
    } catch {
      /* ignore */
    }
  }, [loadDbEvents]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-calendar-check"></i> 출결 관리
        </div>
        {useDb && isManager ? (
          <button type="button" className="btn btn-primary" onClick={() => setScheduleModal({ mode: "create" })}>
            <i className="fas fa-plus"></i> 일정 추가
          </button>
        ) : null}
      </div>

      {useDb && dbErr ? (
        <div style={{ color: "var(--danger, #b42318)", marginBottom: 12, fontSize: 13 }}>{dbErr}</div>
      ) : null}

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
          <i className="fas fa-info-circle"></i> <strong>본인 출결만 변경</strong>할 수 있습니다. 타인 출결은 읽기
          전용입니다.
        </div>
      ) : null}

      {useDb && dbLoading && !dbEvents.length ? (
        <p style={{ color: "var(--gray-600)" }}>불러오는 중…</p>
      ) : null}

      {useDb ? (
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
                                `/api/team/events/${encodeURIComponent(activeDbEvent.id)}?teamCode=${encodeURIComponent(DB_TEAM_CODE)}`,
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
                                              `/api/team/attendance?teamCode=${encodeURIComponent(DB_TEAM_CODE)}`,
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
              teamCode={DB_TEAM_CODE}
              modal={scheduleModal}
              onClose={() => setScheduleModal(null)}
              onSaved={async () => {
                setScheduleModal(null);
                await loadDb();
              }}
            />
          ) : null}
        </>
      ) : (
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
      )}
    </div>
  );
}

function EventScheduleModal({
  teamCode,
  modal,
  onClose,
  onSaved,
}: {
  teamCode: string;
  modal: { mode: "create" } | { mode: "edit"; event: TeamEventDto };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ev = modal.mode === "edit" ? modal.event : null;
  const [title, setTitle] = useState(ev?.title ?? "");
  const [sessionKind, setSessionKind] = useState<"training" | "seminar">(ev?.session_kind ?? "training");
  const [seminarSubtype, setSeminarSubtype] = useState(ev?.seminar_subtype ?? "rule");
  const [startsLocal, setStartsLocal] = useState(ev ? toDatetimeLocalValue(ev.starts_at) : "");
  const [endsLocal, setEndsLocal] = useState(ev?.ends_at ? toDatetimeLocalValue(ev.ends_at) : "");
  const [location, setLocation] = useState(ev?.location ?? "");
  const [isMandatory, setIsMandatory] = useState(ev?.is_mandatory ?? true);
  const [notes, setNotes] = useState(ev?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !startsLocal) {
      alert("제목과 시작 일시는 필수입니다.");
      return;
    }
    const starts_at = new Date(startsLocal).toISOString();
    const ends_at_iso = endsLocal.trim() ? new Date(endsLocal).toISOString() : null;
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const res = await fetch(`/api/team/events?teamCode=${encodeURIComponent(teamCode)}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            starts_at,
            ends_at: ends_at_iso,
            session_kind: sessionKind,
            seminar_subtype: sessionKind === "seminar" ? seminarSubtype : null,
            location: location.trim() || null,
            is_mandatory: isMandatory,
            notes: notes.trim() || null,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
        if (!res.ok) {
          alert(apiErrorUserHint(res.status, j));
          return;
        }
      } else {
        const res = await fetch(
          `/api/team/events/${encodeURIComponent(modal.event.id)}?teamCode=${encodeURIComponent(teamCode)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              starts_at,
              ends_at: ends_at_iso,
              session_kind: sessionKind,
              seminar_subtype: sessionKind === "seminar" ? seminarSubtype : null,
              location: location.trim() || null,
              is_mandatory: isMandatory,
              notes: notes.trim() || null,
            }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
        if (!res.ok) {
          alert(apiErrorUserHint(res.status, j));
          return;
        }
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop show"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{modal.mode === "create" ? "일정 추가" : "일정 수정"}</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="정기 훈련 / 룰 세미나 등"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">유형</label>
              <select
                className="form-control"
                value={sessionKind}
                onChange={(e) => setSessionKind(e.target.value === "seminar" ? "seminar" : "training")}
              >
                <option value="training">훈련</option>
                <option value="seminar">세미나</option>
              </select>
            </div>
            {sessionKind === "seminar" ? (
              <div className="form-group">
                <label className="form-label">세미나 종류</label>
                <select
                  className="form-control"
                  value={seminarSubtype}
                  onChange={(e) => setSeminarSubtype(e.target.value)}
                >
                  <option value="rule">룰 세미나</option>
                  <option value="video">비디오 세미나</option>
                  <option value="mixed">복합</option>
                  <option value="other">기타</option>
                </select>
              </div>
            ) : null}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">시작 일시 *</label>
              <input
                className="form-control"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">종료 일시</label>
              <input
                className="form-control"
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">장소</label>
            <input
              className="form-control"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="구장 / 강의실"
            />
          </div>
          <div className="form-group">
            <label className="form-label">필수 참석</label>
            <select
              className="form-control"
              value={isMandatory ? "true" : "false"}
              onChange={(e) => setIsMandatory(e.target.value === "true")}
            >
              <option value="true">필수</option>
              <option value="false">선택</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특이사항…"
            />
          </div>
        </div>
        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
