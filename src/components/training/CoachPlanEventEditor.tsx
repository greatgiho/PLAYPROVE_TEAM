"use client";

import { PlanCard } from "@/components/training/PlanCard";
import {
  defaultCoachPlanDraft,
  roleDraftFromHint,
  type CoachPlanDraftForm,
} from "@/components/training/coachPlanFormTypes";
import { formatEventStartsAt, sortPlansBySlot } from "@/components/training/coachPlanUtils";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { getPlayproveTeamCode } from "@/lib/config";
import {
  COACH_PLAN_UNIT_META,
  COACH_ROLE_TITLE_OPTIONS,
  type CoachPlanUnit,
} from "@/lib/team/coachPlanMetadata";
import {
  canEditCoachPlanEvent,
  COACH_PLAN_EDIT_LOCKED_MESSAGE,
} from "@/lib/team/coachPlanEditWindow";
import { canConfirmCoachPlanRole, canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const teamCode = getPlayproveTeamCode();

type Props = {
  ev: TeamEventDto;
  teamRole: string | undefined;
  userId: string | undefined;
  coachPlansSchemaMissing: boolean;
  roleTitleHint: string | null | undefined;
  onReload: () => Promise<void>;
};

export function CoachPlanEventEditor({
  ev,
  teamRole,
  userId,
  coachPlansSchemaMissing,
  roleTitleHint,
  onReload,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<CoachPlanDraftForm>(() => {
    if (roleTitleHint === undefined) return defaultCoachPlanDraft();
    return { ...defaultCoachPlanDraft(), ...roleDraftFromHint(roleTitleHint) };
  });
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const allowWrite = canWriteCoachPlanRole(teamRole) && !coachPlansSchemaMissing;
  const isManager = teamRole === "manager";
  const canConfirm = canConfirmCoachPlanRole(teamRole);
  const editable = canEditCoachPlanEvent(ev.starts_at);
  const showStaffActions = allowWrite && editable;

  const myPlans = [...(ev.coach_plans ?? [])]
    .filter((p) => p.coach_user_id === userId)
    .sort(sortPlansBySlot);

  useEffect(() => {
    if (roleTitleHint === undefined) return;
    setDraft((d) => ({ ...d, ...roleDraftFromHint(roleTitleHint) }));
  }, [roleTitleHint]);

  const setDraftField = useCallback((patch: Partial<CoachPlanDraftForm>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const patchPlan = async (planId: string, body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(ev.id)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
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
    await onReload();
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("이 세부 계획을 삭제할까요?")) return;
    const res = await fetch(
      `/api/team/events/${encodeURIComponent(ev.id)}/coach-plans/${encodeURIComponent(planId)}?teamCode=${encodeURIComponent(teamCode)}`,
      { method: "DELETE", credentials: "include" },
    );
    const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (!res.ok) {
      alert(apiErrorUserHint(res.status, j));
      return;
    }
    await onReload();
  };

  const postPlan = async (plan_status: "draft" | "submitted") => {
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title) {
      alert("세부 계획 제목을 입력해 주세요.");
      return;
    }
    if (draft.team_wide_break && (!draft.slot_start.trim() || !draft.slot_end.trim())) {
      alert("전체 휴식은 시작·종료 시간을 모두 입력해 주세요.");
      return;
    }
    const role_title =
      draft.role_pick === "__custom__" ? draft.role_custom.trim() || null : draft.role_pick.trim() || null;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/team/events/${encodeURIComponent(ev.id)}/coach-plans?teamCode=${encodeURIComponent(teamCode)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content: content || null,
            unit: draft.team_wide_break ? "team" : draft.unit,
            role_title,
            slot_start: draft.slot_start.trim() || null,
            slot_end: draft.slot_end.trim() || null,
            plan_status,
            team_wide_break: draft.team_wide_break,
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as ApiErrorBody;
      if (!res.ok) {
        alert(apiErrorUserHint(res.status, j));
        return;
      }
      setNewTitle("");
      setNewContent("");
      setDraft({ ...defaultCoachPlanDraft(), ...roleDraftFromHint(roleTitleHint ?? null) });
      await onReload();
      if (plan_status === "submitted") {
        router.push(`/app/coach_plan/${ev.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!allowWrite) {
    return (
      <p style={{ color: "var(--gray-600)" }}>이 계정으로는 세부 계획을 작성할 수 없습니다.</p>
    );
  }

  if (!editable) {
    return (
      <div>
        <Link href={`/app/coach_plan/${ev.id}`} className="btn btn-sm" style={{ marginBottom: 12 }}>
          <i className="fas fa-arrow-left" /> 세부계획 조회
        </Link>
        <p style={{ color: "var(--gray-700)", fontSize: 14 }}>{COACH_PLAN_EDIT_LOCKED_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/app/coach_plan/${ev.id}`} className="btn btn-sm" style={{ marginBottom: 12 }}>
        <i className="fas fa-arrow-left" /> 세부계획 조회
      </Link>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>세부계획 입력</h1>
        <p style={{ fontSize: 13, color: "var(--gray-500)", margin: "6px 0 0" }}>
          {ev.title} · {formatEventStartsAt(ev.starts_at)}
        </p>
      </div>

      {myPlans.length > 0 ? (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>내 카드</h2>
          {myPlans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              showDelete={showStaffActions && (userId === p.coach_user_id || isManager)}
              showAuthorActions={showStaffActions}
              canConfirm={canConfirm}
              userId={userId}
              onDelete={() => void deletePlan(p.id)}
              onPatch={(body) => void patchPlan(p.id, body)}
            />
          ))}
        </section>
      ) : null}

      {showStaffActions ? (
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>새 카드 추가</div>
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
                  {(["team", "offense", "defense", "special"] as const).map((u) => (
                    <option key={u} value={u}>
                      {COACH_PLAN_UNIT_META[u].label}
                    </option>
                  ))}
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
                  value={
                    draft.role_pick === "__custom__" || !COACH_ROLE_TITLE_OPTIONS.includes(draft.role_pick)
                      ? "__custom__"
                      : draft.role_pick
                  }
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
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="form-control"
              rows={4}
              placeholder="내용 (드릴·인원·코칭 포인트)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={saving} onClick={() => void postPlan("draft")}>
                {saving ? "…" : "초안 저장"}
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void postPlan("submitted")}>
                {saving ? "…" : "감독에게 제출"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
