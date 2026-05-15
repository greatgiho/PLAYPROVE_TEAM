"use client";

import type { TeamEventCoachPlanDto } from "@/lib/mappers/prismaEventToDto";
import { COACH_PLAN_UNIT_META, coachPlanStatusLabel } from "@/lib/team/coachPlanMetadata";

export function PlanCard({
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
