"use client";

import { PlanCard } from "@/components/training/PlanCard";
import { formatEventStartsAt, sortPlansBySlot } from "@/components/training/coachPlanUtils";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import {
  canEditCoachPlanEvent,
  COACH_PLAN_EDIT_LOCKED_MESSAGE,
} from "@/lib/team/coachPlanEditWindow";
import { canConfirmCoachPlanRole, canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import Link from "next/link";

type Props = {
  ev: TeamEventDto;
  teamRole: string | undefined;
  userId: string | undefined;
  coachPlansSchemaMissing: boolean;
  onDeletePlan: (planId: string) => void;
  onPatchPlan: (planId: string, body: Record<string, unknown>) => void;
};

export function CoachPlanEventDetailView({
  ev,
  teamRole,
  userId,
  coachPlansSchemaMissing,
  onDeletePlan,
  onPatchPlan,
}: Props) {
  const plans = [...(ev.coach_plans ?? [])].sort(sortPlansBySlot);
  const myPlans = userId ? plans.filter((p) => p.coach_user_id === userId) : [];
  const allowWrite = canWriteCoachPlanRole(teamRole) && !coachPlansSchemaMissing;
  const isManager = teamRole === "manager";
  const canConfirm = canConfirmCoachPlanRole(teamRole);
  const editable = canEditCoachPlanEvent(ev.starts_at);
  const showStaffActions = allowWrite && editable;

  const editHref = `/app/coach_plan/${ev.id}/edit`;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link href="/app/coach_plan" className="btn btn-sm" style={{ marginBottom: 12 }}>
          <i className="fas fa-arrow-left" /> 일정 목록
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{ev.title}</h1>
            <p style={{ fontSize: 13, color: "var(--gray-500)", margin: "6px 0 0" }}>
              {formatEventStartsAt(ev.starts_at)}
              {" · "}
              {ev.kind_label}
              {ev.location ? ` · ${ev.location}` : ""}
            </p>
          </div>
          {allowWrite ? (
            editable ? (
              <Link href={editHref} className="btn btn-primary btn-sm">
                <i className="fas fa-edit" /> 수정
              </Link>
            ) : (
              <button type="button" className="btn btn-sm" disabled title={COACH_PLAN_EDIT_LOCKED_MESSAGE}>
                <i className="fas fa-edit" /> 수정
              </button>
            )
          ) : null}
        </div>
      </div>

      {!editable ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--gray-600)",
            background: "var(--gray-50)",
            border: "1px solid var(--gray-200)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          {COACH_PLAN_EDIT_LOCKED_MESSAGE}
        </p>
      ) : null}

      {plans.length === 0 ? (
        <div className="coach-plan-detail-empty">
          {allowWrite && editable ? (
            <Link href={editHref} className="coach-plan-detail-add-btn" aria-label="세부계획 작성">
              <i className="fas fa-plus" />
              <span>세부계획 작성</span>
            </Link>
          ) : (
            <p style={{ color: "var(--gray-500)", fontSize: 14, margin: 0 }}>등록된 세부 계획이 없습니다.</p>
          )}
        </div>
      ) : (
        <div>
          {myPlans.length > 0 ? (
            <section style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>내 세부 계획</h2>
              {myPlans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  showDelete={showStaffActions && (userId === p.coach_user_id || isManager)}
                  showAuthorActions={showStaffActions}
                  canConfirm={canConfirm}
                  userId={userId}
                  onDelete={() => onDeletePlan(p.id)}
                  onPatch={(body) => onPatchPlan(p.id, body)}
                />
              ))}
            </section>
          ) : allowWrite && editable ? (
            <div className="coach-plan-detail-empty" style={{ marginBottom: 20 }}>
              <Link href={editHref} className="coach-plan-detail-add-btn" aria-label="세부계획 작성">
                <i className="fas fa-plus" />
                <span>세부계획 작성</span>
              </Link>
            </div>
          ) : null}

          {plans.length > myPlans.length ? (
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>팀 세부 계획</h2>
              {plans
                .filter((p) => p.coach_user_id !== userId)
                .map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    compact
                    showDelete={showStaffActions && isManager}
                    showAuthorActions={false}
                    canConfirm={canConfirm}
                    userId={userId}
                    onDelete={() => onDeletePlan(p.id)}
                    onPatch={(body) => onPatchPlan(p.id, body)}
                  />
                ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
