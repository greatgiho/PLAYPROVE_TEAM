"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventCoachPlanDto, TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { CoachPlanTimetableGrid } from "@/components/training/CoachPlanTimetableGrid";
import { sortPlansBySlot } from "@/components/training/coachPlanUtils";
import { TrainingAttendancePanel } from "@/components/training/TrainingAttendancePanel";
import { getPlayproveTeamCode, hasPlayproveTeamCode } from "@/lib/config";
import { canConfirmCoachPlanRole, canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const teamCode = getPlayproveTeamCode();

function pickDefaultTrainingEventId(sortedTraining: TeamEventDto[]): string | null {
  if (sortedTraining.length === 0) return null;
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const t0 = today0.getTime();
  const upcoming = sortedTraining.find((e) => new Date(e.starts_at).getTime() >= t0);
  return (upcoming ?? sortedTraining[0]!).id;
}

/** @deprecated write 모드는 CoachPlanWriteSchedulePage + L3 라우트 사용 */
export function CoachPlanPageContent({
  mode: _mode,
  teamRole,
  userId,
}: {
  mode?: "write" | "aggregate";
  teamRole: string | undefined;
  userId: string | undefined;
}) {
  const [events, setEvents] = useState<TeamEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [coachPlansSchemaMissing, setCoachPlansSchemaMissing] = useState(false);
  const [selectedTrainingEventId, setSelectedTrainingEventId] = useState<string | null>(null);

  const isManager = teamRole === "manager";
  const canConfirm = canConfirmCoachPlanRole(teamRole);
  const showManagerDeleteOnBoard = isManager && !coachPlansSchemaMissing;

  const load = useCallback(async () => {
    if (!hasPlayproveTeamCode()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/team/events?teamCode=${encodeURIComponent(teamCode)}&expand=coach_plans`,
        { credentials: "include", cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        events?: TeamEventDto[];
        coach_plans_schema_missing?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
      }
      setEvents(j.events ?? []);
      setCoachPlansSchemaMissing(Boolean(j.coach_plans_schema_missing));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trainingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.session_kind === "training")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events]);

  useEffect(() => {
    if (trainingEvents.length === 0) {
      setSelectedTrainingEventId(null);
      return;
    }
    setSelectedTrainingEventId((prev) => {
      if (prev && trainingEvents.some((e) => e.id === prev)) return prev;
      return pickDefaultTrainingEventId(trainingEvents);
    });
  }, [trainingEvents]);

  const selectedTrainingEvent =
    selectedTrainingEventId != null
      ? trainingEvents.find((e) => e.id === selectedTrainingEventId) ?? null
      : null;

  const patchPlan = async (eventId: string, planId: string, body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await load();
  };

  const deletePlan = async (eventId: string, planId: string) => {
    if (!confirm("이 세부 계획을 삭제할까요?")) return;
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
      { method: "DELETE", credentials: "include" },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await load();
  };

  if (!teamCode) {
    return (
      <div className="empty-state">
        이 화면은 DB 연동 모드에서만 사용할 수 있습니다.{" "}
        <code style={{ fontSize: 12 }}>NEXT_PUBLIC_PLAYPROVE_TEAM_CODE</code> 를 설정한 뒤 다시 열어 주세요.
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-calendar-alt" /> 훈련 계획표
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canWriteCoachPlanRole(teamRole) ? (
            <Link href="/app/coach_plan" className="btn btn-sm btn-primary">
              <i className="fas fa-pen" /> 코치 메뉴 · 계획 작성
            </Link>
          ) : null}
          <Link href="/app/attendance" className="btn btn-sm">
            출결·일정
          </Link>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 20, maxWidth: 900 }}>
        출결에서 확정된 일정을 기준으로, 코치가 <strong>훈련계획 작성</strong>에서 넣은 카드가 취합됩니다. 아래는{" "}
        <strong>시간(세로) × 파트(가로)</strong> 타임테이블이며, 빈 칸은 해당 시간·파트에 계획이 없음을 뜻합니다.{" "}
        <strong>전체 휴식</strong>은 모든 파트에 걸쳐 한 줄로 표시됩니다.
      </p>

      {coachPlansSchemaMissing ? (
        <div
          style={{
            background: "var(--yellow-bg, #fff8e6)",
            border: "1px solid #e9c46a",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--gray-800)",
            maxWidth: 900,
          }}
        >
          <strong>DB에 training.event_coach_plans 테이블이 없습니다.</strong>{" "}
          <code style={{ fontSize: 11 }}>database/training_event_coach_plans.sql</code> 또는{" "}
          <code style={{ fontSize: 11 }}>npx prisma migrate deploy</code> 후 새로고침하세요.
        </div>
      ) : null}

      {err ? <div style={{ color: "var(--danger, #b42318)", marginBottom: 12, fontSize: 13 }}>{err}</div> : null}
      {loading ? <p style={{ color: "var(--gray-600)" }}>불러오는 중…</p> : null}

      {!loading && events.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-calendar" />
          <p>등록된 일정이 없습니다. 출결 관리에서 일정을 추가해 주세요.</p>
        </div>
      ) : null}

      {events.length > 0 && trainingEvents.length === 0 ? (
        <div
          style={{
            background: "var(--gray-50, #f6f6f6)",
            border: "1px solid var(--gray-200, #e5e5e5)",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--gray-700)",
            maxWidth: 900,
          }}
        >
          <strong>훈련(session_kind=training) 일정이 없습니다.</strong> 출결에서 훈련으로 등록된 일정이 있어야 계획표가 표시됩니다.
        </div>
      ) : null}

      {trainingEvents.length > 0 ? (
        <>
          <div
            role="tablist"
            aria-label="훈련 일정"
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}
          >
            {trainingEvents.map((ev) => {
              const sel = ev.id === selectedTrainingEventId;
              const d = new Date(ev.starts_at);
              const dateStr = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
              return (
                <button
                  key={ev.id}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  className={sel ? "btn btn-sm btn-primary" : "btn btn-sm"}
                  style={sel ? undefined : { opacity: 0.92 }}
                  onClick={() => setSelectedTrainingEventId(ev.id)}
                >
                  {dateStr} · {ev.title.length > 22 ? `${ev.title.slice(0, 22)}…` : ev.title}
                </button>
              );
            })}
          </div>
          {selectedTrainingEvent ? (
            <EventAggregateBoard
              key={selectedTrainingEvent.id}
              ev={selectedTrainingEvent}
              teamCode={teamCode}
              showManagerDelete={showManagerDeleteOnBoard}
              canConfirm={canConfirm}
              userId={userId}
              onDelete={(planId) => void deletePlan(selectedTrainingEvent.id, planId)}
              onPatch={(planId, body) => void patchPlan(selectedTrainingEvent.id, planId, body)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function EventAggregateBoard({
  ev,
  teamCode,
  showManagerDelete,
  canConfirm,
  userId,
  onDelete,
  onPatch,
}: {
  ev: TeamEventDto;
  teamCode: string;
  showManagerDelete: boolean;
  canConfirm: boolean;
  userId: string | undefined;
  onDelete: (planId: string) => void;
  onPatch: (planId: string, body: Record<string, unknown>) => void;
}) {
  const plans = [...(ev.coach_plans ?? [])].sort(sortPlansBySlot);

  return (
    <div className="card" style={{ marginBottom: 22, padding: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>{ev.title}</div>
        <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
          {new Date(ev.starts_at).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          {ev.kind_label}
          {ev.location ? ` · ${ev.location}` : ""}
        </div>
      </div>

      <TrainingAttendancePanel teamCode={teamCode} eventId={ev.id} />

      <CoachPlanTimetableGrid
        plans={plans}
        showManagerDelete={showManagerDelete}
        canConfirm={canConfirm}
        userId={userId}
        onDelete={onDelete}
        onPatch={onPatch}
      />
    </div>
  );
}

