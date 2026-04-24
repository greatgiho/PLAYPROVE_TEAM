"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventCoachPlanDto, TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { CoachPlanTimetableGrid } from "@/components/training/CoachPlanTimetableGrid";
import { TrainingAttendancePanel } from "@/components/training/TrainingAttendancePanel";
import {
  COACH_PLAN_UNIT_META,
  COACH_ROLE_TITLE_OPTIONS,
  coachPlanStatusLabel,
  type CoachPlanUnit,
} from "@/lib/team/coachPlanMetadata";
import { canConfirmCoachPlanRole, canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export const COACH_PLAN_DB_TEAM_CODE = process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ?? "";

type DraftForm = {
  unit: CoachPlanUnit;
  role_pick: string;
  role_custom: string;
  slot_start: string;
  slot_end: string;
  /** 전체 휴식 — 훈련 계획표에서 가로 전폭 */
  team_wide_break: boolean;
};

const defaultDraft = (): DraftForm => ({
  unit: "offense",
  role_pick: COACH_ROLE_TITLE_OPTIONS[0] ?? "오펜스 코디네이터",
  role_custom: "",
  slot_start: "",
  slot_end: "",
  team_wide_break: false,
});

/** 집계 화면 기본 선택: 오늘 0시 이후 시작하는 훈련 중 가장 빠른 일정, 없으면 목록 첫 일정 */
function pickDefaultTrainingEventId(sortedTraining: TeamEventDto[]): string | null {
  if (sortedTraining.length === 0) return null;
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const t0 = today0.getTime();
  const upcoming = sortedTraining.find((e) => new Date(e.starts_at).getTime() >= t0);
  return (upcoming ?? sortedTraining[0]!).id;
}

/** team_members 공식 직함 → 코치 계획 직함 선택 UI 초기값 */
function roleDraftFromHint(hint: string | null): Pick<DraftForm, "role_pick" | "role_custom"> {
  if (!hint?.trim()) {
    return { role_pick: COACH_ROLE_TITLE_OPTIONS[0] ?? "오펜스 코디네이터", role_custom: "" };
  }
  const h = hint.trim();
  if (COACH_ROLE_TITLE_OPTIONS.includes(h)) return { role_pick: h, role_custom: "" };
  return { role_pick: "__custom__", role_custom: h };
}

type Mode = "write" | "aggregate";

export function CoachPlanPageContent({
  mode,
  teamRole,
  userId,
}: {
  mode: Mode;
  teamRole: string | undefined;
  userId: string | undefined;
}) {
  const isAggregate = mode === "aggregate";
  const [events, setEvents] = useState<TeamEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [newTitleByEvent, setNewTitleByEvent] = useState<Record<string, string>>({});
  const [newContentByEvent, setNewContentByEvent] = useState<Record<string, string>>({});
  const [draftByEvent, setDraftByEvent] = useState<Record<string, DraftForm>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [coachPlansSchemaMissing, setCoachPlansSchemaMissing] = useState(false);
  /** undefined: 아직 로드 전 · 코치 계획 직함 시드용 */
  const [roleTitleHint, setRoleTitleHint] = useState<string | null | undefined>(undefined);
  /** 집계 모드: 훈련(session_kind=training) 일정 중 하나만 표시 */
  const [selectedTrainingEventId, setSelectedTrainingEventId] = useState<string | null>(null);

  const allowWrite = !isAggregate && canWriteCoachPlanRole(teamRole);
  const isManager = teamRole === "manager";
  const canConfirm = canConfirmCoachPlanRole(teamRole);
  const showStaffActions = allowWrite && !coachPlansSchemaMissing;
  const showManagerDeleteOnBoard = isAggregate && isManager && !coachPlansSchemaMissing;

  const draftFor = useCallback(
    (evId: string): DraftForm => {
      const saved = draftByEvent[evId];
      if (saved) return saved;
      if (roleTitleHint === undefined) return defaultDraft();
      return { ...defaultDraft(), ...roleDraftFromHint(roleTitleHint) };
    },
    [draftByEvent, roleTitleHint],
  );

  const setDraftField = useCallback((evId: string, patch: Partial<DraftForm>) => {
    setDraftByEvent((m) => ({
      ...m,
      [evId]: { ...defaultDraft(), ...m[evId], ...patch },
    }));
  }, []);

  const load = useCallback(async () => {
    if (!COACH_PLAN_DB_TEAM_CODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/team/events?teamCode=${encodeURIComponent(COACH_PLAN_DB_TEAM_CODE)}&expand=coach_plans`,
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

  useEffect(() => {
    if (!COACH_PLAN_DB_TEAM_CODE || !allowWrite) {
      setRoleTitleHint(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/team/me/coach-context?teamCode=${encodeURIComponent(COACH_PLAN_DB_TEAM_CODE)}`,
          { credentials: "include", cache: "no-store" },
        );
        const j = (await res.json().catch(() => ({}))) as { role_title_hint?: string };
        if (cancelled) return;
        const raw = typeof j.role_title_hint === "string" ? j.role_title_hint.trim() : "";
        setRoleTitleHint(raw || null);
      } catch {
        if (!cancelled) setRoleTitleHint(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowWrite]);

  const trainingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.session_kind === "training")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events]);

  useEffect(() => {
    if (!isAggregate) return;
    if (trainingEvents.length === 0) {
      setSelectedTrainingEventId(null);
      return;
    }
    setSelectedTrainingEventId((prev) => {
      if (prev && trainingEvents.some((e) => e.id === prev)) return prev;
      return pickDefaultTrainingEventId(trainingEvents);
    });
  }, [isAggregate, trainingEvents]);

  const selectedTrainingEvent =
    selectedTrainingEventId != null
      ? trainingEvents.find((e) => e.id === selectedTrainingEventId) ?? null
      : null;

  const patchPlan = async (eventId: string, planId: string, body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(COACH_PLAN_DB_TEAM_CODE)}`,
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

  const postPlan = async (eventId: string, plan_status: "draft" | "submitted") => {
    const title = (newTitleByEvent[eventId] ?? "").trim();
    const content = (newContentByEvent[eventId] ?? "").trim();
    if (!title) {
      alert("세부 계획 제목을 입력해 주세요.");
      return;
    }
    const d = draftFor(eventId);
    if (d.team_wide_break && (!d.slot_start.trim() || !d.slot_end.trim())) {
      alert("전체 휴식은 시작·종료 시간을 모두 입력해 주세요.");
      return;
    }
    const role_title =
      d.role_pick === "__custom__" ? d.role_custom.trim() || null : d.role_pick.trim() || null;
    setSavingEventId(eventId);
    try {
      const res = await fetch(
        `/api/team/events/${encodeURIComponent(eventId)}/coach-plans?teamCode=${encodeURIComponent(COACH_PLAN_DB_TEAM_CODE)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content: content || null,
            unit: d.team_wide_break ? "team" : d.unit,
            role_title,
            slot_start: d.slot_start.trim() || null,
            slot_end: d.slot_end.trim() || null,
            plan_status,
            team_wide_break: d.team_wide_break,
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
      if (!res.ok) {
        alert(apiErrorUserHint(res.status, j));
        return;
      }
      setNewTitleByEvent((m) => ({ ...m, [eventId]: "" }));
      setNewContentByEvent((m) => ({ ...m, [eventId]: "" }));
      const roleTail = roleTitleHint === undefined ? {} : roleDraftFromHint(roleTitleHint);
      setDraftByEvent((m) => ({ ...m, [eventId]: { ...defaultDraft(), ...roleTail } }));
      await load();
    } finally {
      setSavingEventId(null);
    }
  };

  const deletePlan = async (eventId: string, planId: string) => {
    if (!confirm("이 세부 계획을 삭제할까요?")) return;
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(eventId)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(COACH_PLAN_DB_TEAM_CODE)}`,
      { method: "DELETE", credentials: "include" },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await load();
  };

  if (!COACH_PLAN_DB_TEAM_CODE) {
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
          <i className={`fas ${isAggregate ? "fa-calendar-alt" : "fa-pencil-ruler"}`}></i>{" "}
          {isAggregate ? "훈련 계획표" : "훈련계획 작성"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAggregate ? (
            canWriteCoachPlanRole(teamRole) ? (
              <Link href="/app/coach_plan" className="btn btn-sm btn-primary">
                <i className="fas fa-pen"></i> 코치 메뉴 · 계획 작성
              </Link>
            ) : null
          ) : (
            <Link href="/app/practice_plan" className="btn btn-sm">
              <i className="fas fa-clipboard-list"></i> 매니지먼트 · 취합 보드
            </Link>
          )}
          <Link href="/app/attendance" className="btn btn-sm">
            출결·일정
          </Link>
        </div>
      </div>

      {isAggregate ? (
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 20, maxWidth: 900 }}>
          출결에서 확정된 일정을 기준으로, 코치가 <strong>훈련계획 작성</strong>에서 넣은 카드가 취합됩니다. 아래는{" "}
          <strong>시간(세로) × 파트(가로)</strong> 타임테이블이며, 빈 칸은 해당 시간·파트에 계획이 없음을 뜻합니다.{" "}
          <strong>전체 휴식</strong>은 모든 파트에 걸쳐 한 줄로 표시됩니다.
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 20, maxWidth: 900 }}>
          유닛(팀/오펜스/디펜스/스페셜)·직함·시간대를 지정해 카드를 만듭니다.{" "}
          <strong>코치 직함</strong>은 로스터에 등록된 공식 직함(<code style={{ fontSize: 11 }}>team_members</code>
          )을 불러와 목록·기타 입력에 맞게 자동 반영합니다. 작성 후 <strong>감독에게 제출</strong>하면 훈련 계획표에서
          컨펌할 수 있습니다. <strong>전체 휴식</strong>으로 넣은 카드는 계획표에서 모든 파트에 걸친 한 줄로 취합됩니다.
        </p>
      )}

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
          <i className="fas fa-calendar"></i>
          <p>등록된 일정이 없습니다. 출결 관리에서 일정을 추가해 주세요.</p>
        </div>
      ) : null}

      {isAggregate && events.length > 0 && trainingEvents.length === 0 ? (
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

      {isAggregate && trainingEvents.length > 0 ? (
        <>
          <div
            role="tablist"
            aria-label="훈련 일정"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
              alignItems: "center",
            }}
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
              teamCode={COACH_PLAN_DB_TEAM_CODE}
              showManagerDelete={showManagerDeleteOnBoard}
              canConfirm={canConfirm}
              userId={userId}
              onDelete={(planId) => void deletePlan(selectedTrainingEvent.id, planId)}
              onPatch={(planId, body) => void patchPlan(selectedTrainingEvent.id, planId, body)}
            />
          ) : null}
        </>
      ) : null}

      {!isAggregate
        ? events.map((ev) => (
            <EventPlanWriteCard
              key={ev.id}
              ev={ev}
              draft={draftFor(ev.id)}
              setDraftField={(patch) => setDraftField(ev.id, patch)}
              showStaffActions={showStaffActions}
              isManager={isManager}
              canConfirm={canConfirm}
              actorUserId={userId}
              newTitle={newTitleByEvent[ev.id] ?? ""}
              newContent={newContentByEvent[ev.id] ?? ""}
              saving={savingEventId === ev.id}
              onTitleChange={(v) => setNewTitleByEvent((m) => ({ ...m, [ev.id]: v }))}
              onContentChange={(v) => setNewContentByEvent((m) => ({ ...m, [ev.id]: v }))}
              onSaveDraft={() => void postPlan(ev.id, "draft")}
              onSubmitToHead={() => void postPlan(ev.id, "submitted")}
              onDeletePlan={(planId) => void deletePlan(ev.id, planId)}
              onPatchPlan={(planId, body) => void patchPlan(ev.id, planId, body)}
            />
          ))
        : null}
    </div>
  );
}

function sortPlansBySlot(a: TeamEventCoachPlanDto, b: TeamEventCoachPlanDto): number {
  const ta = a.slot_start || "99:99";
  const tb = b.slot_start || "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.title.localeCompare(b.title, "ko");
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

function PlanCard({
  plan,
  compact,
  showDelete,
  showAuthorActions,
  canConfirm,
  userId,
  onDelete,
  onPatch,
}: {
  plan: TeamEventCoachPlanDto;
  compact?: boolean;
  showDelete: boolean;
  showAuthorActions: boolean;
  canConfirm: boolean;
  userId: string | undefined;
  onDelete: () => void;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const meta = COACH_PLAN_UNIT_META[plan.unit] ?? COACH_PLAN_UNIT_META.team;
  const st = plan.plan_status;
  const mine = userId && plan.coach_user_id === userId;
  const border = plan.team_wide_break ? "#6366f1" : meta.border;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: compact ? "10px 10px" : "12px 12px",
        marginBottom: 8,
        borderLeft: `3px solid ${border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {plan.slot_start || plan.slot_end ? (
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gray-500)", marginBottom: 4 }}>
              {plan.slot_start ?? "?"} — {plan.slot_end ?? "?"}
            </div>
          ) : null}
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gray-900)" }}>
            {plan.title}
            {plan.team_wide_break ? (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#4338ca" }}>전체 휴식</span>
            ) : null}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>
            {plan.coach_name}
            {plan.role_title ? ` · ${plan.role_title}` : ""}
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 4,
              background: st === "confirmed" ? "#dcfce7" : st === "submitted" ? "#fef3c7" : "#f3f4f6",
              color: st === "confirmed" ? "#166534" : st === "submitted" ? "#92400e" : "#4b5563",
            }}
          >
            {coachPlanStatusLabel(st)}
          </span>
          {plan.content ? (
            <pre
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                color: "var(--gray-700)",
              }}
            >
              {plan.content}
            </pre>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {showDelete ? (
            <button type="button" className="btn btn-sm" style={{ fontSize: 10, color: "var(--red)" }} onClick={onDelete}>
              삭제
            </button>
          ) : null}
          {showAuthorActions && mine && st === "draft" ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ fontSize: 10 }}
              onClick={() => onPatch({ plan_status: "submitted" })}
            >
              제출
            </button>
          ) : null}
          {canConfirm && st === "submitted" ? (
            <>
              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: 10, background: "#166534", color: "#fff", border: "none" }}
                onClick={() => onPatch({ plan_status: "confirmed" })}
              >
                컨펌
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: 10, color: "var(--red)" }}
                onClick={() => onPatch({ plan_status: "rejected" })}
              >
                반려
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EventPlanWriteCard({
  ev,
  draft,
  setDraftField,
  showStaffActions,
  isManager,
  canConfirm,
  actorUserId,
  newTitle,
  newContent,
  saving,
  onTitleChange,
  onContentChange,
  onSaveDraft,
  onSubmitToHead,
  onDeletePlan,
  onPatchPlan,
}: {
  ev: TeamEventDto;
  draft: DraftForm;
  setDraftField: (patch: Partial<DraftForm>) => void;
  showStaffActions: boolean;
  isManager: boolean;
  canConfirm: boolean;
  actorUserId: string | undefined;
  newTitle: string;
  newContent: string;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onSaveDraft: () => void;
  onSubmitToHead: () => void;
  onDeletePlan: (planId: string) => void;
  onPatchPlan: (planId: string, body: Record<string, unknown>) => void;
}) {
  const plans = [...(ev.coach_plans ?? [])].sort(sortPlansBySlot);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{ev.title}</div>
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
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-500)", alignSelf: "center" }}>
          계획 카드 {plans.length}건
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--gray-100)", margin: "14px 0" }} />

      {plans.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--gray-500)", margin: "0 0 12px" }}>등록된 카드가 없습니다.</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              showDelete={showStaffActions && (actorUserId === p.coach_user_id || isManager)}
              showAuthorActions={showStaffActions}
              canConfirm={canConfirm}
              userId={actorUserId}
              onDelete={() => onDeletePlan(p.id)}
              onPatch={(body) => onPatchPlan(p.id, body)}
            />
          ))}
        </div>
      )}

      {showStaffActions ? (
        <div style={{ background: "var(--gray-50)", padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "var(--gray-600)" }}>새 카드 추가</div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 700,
              color: "#4338ca",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={draft.team_wide_break}
              onChange={(e) => setDraftField({ team_wide_break: e.target.checked })}
            />
            전체 휴식 (훈련 계획표에서 TIME~4파트 전폭)
          </label>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                유닛
              </label>
              <select
                className="form-control"
                value={draft.unit}
                disabled={draft.team_wide_break}
                onChange={(e) => setDraftField({ unit: e.target.value as CoachPlanUnit })}
              >
                <option value="team">TEAM OVERALL</option>
                <option value="offense">OFFENSE</option>
                <option value="defense">DEFENSE</option>
                <option value="special">SPECIAL</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                시작
              </label>
              <input
                className="form-control"
                type="time"
                value={draft.slot_start}
                onChange={(e) => setDraftField({ slot_start: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                종료
              </label>
              <input
                className="form-control"
                type="time"
                value={draft.slot_end}
                onChange={(e) => setDraftField({ slot_end: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                코치 직함
              </label>
              <select
                className="form-control"
                value={draft.role_pick === "__custom__" || !COACH_ROLE_TITLE_OPTIONS.includes(draft.role_pick) ? "__custom__" : draft.role_pick}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") setDraftField({ role_pick: "__custom__" });
                  else setDraftField({ role_pick: v, role_custom: "" });
                }}
              >
                {COACH_ROLE_TITLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="__custom__">기타 (직접 입력)</option>
              </select>
            </div>
            {(draft.role_pick === "__custom__" || !COACH_ROLE_TITLE_OPTIONS.includes(draft.role_pick)) && (
              <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: 11 }}>
                  직함 직접 입력
                </label>
                <input
                  className="form-control"
                  placeholder="예: 니켈 패키지 코치"
                  value={draft.role_custom}
                  onChange={(e) => setDraftField({ role_pick: "__custom__", role_custom: e.target.value })}
                />
              </div>
            )}
          </div>
          <input
            className="form-control"
            style={{ marginBottom: 8 }}
            placeholder="카드 제목 (예: 패스 프로, 7대7)"
            value={newTitle}
            onChange={(e) => onTitleChange(e.target.value)}
          />
          <textarea
            className="form-control"
            rows={3}
            placeholder="내용 (드릴·인원·코칭 포인트)"
            value={newContent}
            onChange={(e) => onContentChange(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={onSaveDraft} disabled={saving}>
              {saving ? "…" : "초안 저장"}
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmitToHead} disabled={saving}>
              {saving ? "…" : "감독에게 제출"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
