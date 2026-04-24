"use client";

import type { TeamEventCoachPlanDto } from "@/lib/mappers/prismaEventToDto";
import {
  COACH_PLAN_UNIT_META,
  COACH_PLAN_UNITS_ORDER,
  coachPlanStatusLabel,
  type CoachPlanUnit,
} from "@/lib/team/coachPlanMetadata";
import {
  COACH_TIMETABLE_ROW_PX,
  COACH_TIMETABLE_STEP_MIN,
  TEAM_REST_BLOCK_MIN,
  TEAM_TRAIN_BLOCK_MIN,
} from "@/lib/team/coachPlanTimetableConstants";
import { formatMinFromTotal, parseHmToMin } from "@/lib/team/trainingSlotTime";
import { Fragment, useMemo } from "react";

const STEP_MIN = COACH_TIMETABLE_STEP_MIN;
const ROW_PX = COACH_TIMETABLE_ROW_PX;
const DEFAULT_ORIGIN = 11 * 60;
const DEFAULT_END = 14 * 60;

const COL_IDX: Record<CoachPlanUnit, number> = { team: 2, offense: 3, defense: 4, special: 5 };

function planHasValidSlot(p: TeamEventCoachPlanDto): boolean {
  if (!p.slot_start || !p.slot_end) return false;
  const s = parseHmToMin(p.slot_start);
  const e = parseHmToMin(p.slot_end);
  return s !== null && e !== null && e > s;
}

function snapDown(m: number): number {
  return Math.floor(m / STEP_MIN) * STEP_MIN;
}

function snapUp(m: number): number {
  return Math.ceil(m / STEP_MIN) * STEP_MIN;
}

/** 같은 파트·겹치는 시간대는 한 칸에 세로로 쌓음 */
function groupCoachPlansByUnit(
  plans: TeamEventCoachPlanDto[],
  unit: CoachPlanUnit,
): { plans: TeamEventCoachPlanDto[]; startMin: number; endMin: number }[] {
  const list = plans
    .filter((p) => !p.team_wide_break && p.unit === unit && p.slot_start && p.slot_end)
    .map((p) => {
      const s = parseHmToMin(p.slot_start!);
      const e = parseHmToMin(p.slot_end!);
      return { p, s, e };
    })
    .filter((x): x is { p: TeamEventCoachPlanDto; s: number; e: number } => x.s !== null && x.e !== null && x.e > x.s);

  list.sort((a, b) => a.s - b.s || a.e - b.e);
  const groups: { plans: TeamEventCoachPlanDto[]; startMin: number; endMin: number }[] = [];
  for (const { p, s, e } of list) {
    const last = groups[groups.length - 1];
    if (last && s < last.endMin) {
      last.plans.push(p);
      last.startMin = Math.min(last.startMin, s);
      last.endMin = Math.max(last.endMin, e);
    } else {
      groups.push({ plans: [p], startMin: s, endMin: e });
    }
  }
  return groups;
}

/**
 * 시간(행) × 파트(열). 빈 칸 = 해당 구간·파트에 계획 없음.
 * `team_wide_break` 카드는 TIME~4파트 전폭.
 */
export function CoachPlanTimetableGrid({
  plans,
  showManagerDelete,
  canConfirm,
  userId,
  onDelete,
  onPatch,
}: {
  plans: TeamEventCoachPlanDto[];
  showManagerDelete: boolean;
  canConfirm: boolean;
  userId: string | undefined;
  onDelete: (planId: string) => void;
  onPatch: (planId: string, body: Record<string, unknown>) => void;
}) {
  const { originMin, slots, breakPlans } = useMemo(() => {
    let minS = 24 * 60;
    let maxE = 0;
    let any = false;
    for (const p of plans) {
      if (!p.slot_start || !p.slot_end) continue;
      const s = parseHmToMin(p.slot_start);
      const e = parseHmToMin(p.slot_end);
      if (s === null || e === null || e <= s) continue;
      any = true;
      minS = Math.min(minS, s);
      maxE = Math.max(maxE, e);
    }
    const origin = any ? snapDown(Math.max(0, minS - 30)) : DEFAULT_ORIGIN;
    const end = any ? snapUp(Math.min(24 * 60, maxE + 30)) : DEFAULT_END;
    const slotList: number[] = [];
    for (let t = origin; t <= end; t += STEP_MIN) {
      slotList.push(t);
    }
    const breakPlans = plans
      .filter((p) => p.team_wide_break && p.slot_start && p.slot_end)
      .sort((a, b) => (a.slot_start ?? "").localeCompare(b.slot_start ?? ""));
    return { originMin: origin, slots: slotList, breakPlans };
  }, [plans]);

  const totalRows = slots.length;
  const unslotted = useMemo(() => plans.filter((p) => !planHasValidSlot(p)), [plans]);

  if (totalRows === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--gray-500)", padding: "12px 0" }}>
        표시할 시간 범위가 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 10,
          padding: "8px 10px",
          background: "#f8fafc",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
        role="note"
      >
        참고: 팀 기본 리듬 <strong>{TEAM_TRAIN_BLOCK_MIN}분 훈련 · {TEAM_REST_BLOCK_MIN}분 전체 휴식</strong> — 휴식은
        훈련계획 작성에서 <strong>「전체 휴식」</strong>으로 넣은 카드가 가로 전체(모든 파트)로 표시됩니다.
      </div>

      <div style={{ overflow: "auto", maxHeight: 520, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `72px repeat(4, minmax(96px, 1fr))`,
            gridTemplateRows: `36px repeat(${totalRows}, ${ROW_PX}px)`,
            minWidth: 560,
            position: "relative",
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              gridColumn: 1,
              gridRow: 1,
              fontSize: 10,
              fontWeight: 800,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              paddingLeft: 6,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            TIME
          </div>
          {COACH_PLAN_UNITS_ORDER.map((u, i) => {
            const meta = COACH_PLAN_UNIT_META[u];
            return (
              <div
                key={u}
                style={{
                  gridColumn: i + 2,
                  gridRow: 1,
                  fontSize: 10,
                  fontWeight: 800,
                  color: meta.border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  background: meta.bg,
                  borderBottom: `1px solid ${meta.border}33`,
                  textAlign: "center",
                  lineHeight: 1.2,
                  padding: "0 4px",
                }}
              >
                <i className={`fas ${meta.icon}`} style={{ fontSize: 9 }}></i>
                {meta.label}
              </div>
            );
          })}

          {slots.map((min, i) => {
            const row = i + 2;
            const showLabel = min % 10 === 0;
            const isHour = min % 60 === 0;
            const lineOpacity = isHour ? 0.14 : min % 30 === 0 ? 0.09 : 0.05;
            return (
              <Fragment key={min}>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: row,
                    fontSize: 10,
                    color: isHour ? "#374151" : "#94a3b8",
                    fontWeight: isHour ? 700 : 500,
                    paddingLeft: 6,
                    borderRight: "1px solid #f1f5f9",
                  }}
                >
                  {showLabel ? formatMinFromTotal(min) : ""}
                </div>
                <div
                  style={{
                    gridColumn: "2 / 6",
                    gridRow: row,
                    borderTop: `1px ${isHour ? "solid" : "dashed"} rgba(0,0,0,${lineOpacity})`,
                    pointerEvents: "none",
                  }}
                />
              </Fragment>
            );
          })}

          {COACH_PLAN_UNITS_ORDER.map((unit) => {
            const col = COL_IDX[unit];
            const colMeta = COACH_PLAN_UNIT_META[unit];
            return groupCoachPlansByUnit(plans, unit).map((g, gi) => {
              const clampedS = Math.max(g.startMin, originMin);
              const clampedE = Math.min(g.endMin, originMin + totalRows * STEP_MIN);
              if (clampedE <= clampedS) return null;
              const rowStart = 2 + Math.floor((clampedS - originMin) / STEP_MIN);
              const rowSpan = Math.max(1, Math.ceil((clampedE - clampedS) / STEP_MIN));
              const heightPx = rowSpan * ROW_PX - 3;
              return (
                <div
                  key={`${unit}-${gi}-${g.startMin}`}
                  style={{
                    gridColumn: col,
                    gridRow: `${rowStart} / span ${rowSpan}`,
                    zIndex: 2,
                    margin: "1px 3px",
                    borderRadius: 6,
                    background: colMeta.bg,
                    border: `1.5px solid ${colMeta.border}40`,
                    borderLeft: `3px solid ${colMeta.border}`,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "4px 5px",
                    fontSize: 10,
                    boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                  }}
                >
                  {g.plans.map((plan) => (
                    <CoachPlanGridCell
                      key={plan.id}
                      plan={plan}
                      heightPx={heightPx}
                      showManagerDelete={showManagerDelete}
                      canConfirm={canConfirm}
                      userId={userId}
                      onDelete={() => onDelete(plan.id)}
                      onPatch={(body) => onPatch(plan.id, body)}
                    />
                  ))}
                </div>
              );
            });
          })}

          {breakPlans.map((bb) => {
            const s = parseHmToMin(bb.slot_start!);
            const e = parseHmToMin(bb.slot_end!);
            if (s === null || e === null || e <= s) return null;
            const clampedS = Math.max(s, originMin);
            const clampedE = Math.min(e, originMin + totalRows * STEP_MIN);
            if (clampedE <= clampedS) return null;
            const rowStart = 2 + Math.floor((clampedS - originMin) / STEP_MIN);
            const rowSpan = Math.max(1, Math.ceil((clampedE - clampedS) / STEP_MIN));
            return (
              <div
                key={`twb-${bb.id}`}
                style={{
                  gridColumn: "1 / -1",
                  gridRow: `${rowStart} / span ${rowSpan}`,
                  zIndex: 4,
                  margin: "1px 4px",
                  borderRadius: 6,
                  background: "linear-gradient(90deg, #eef2ff, #e2e8f0)",
                  border: "1px dashed #6366f1",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  color: "#4338ca",
                }}
              >
                <span style={{ fontSize: 15 }}>☕</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>전체 휴식 · {bb.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.9 }}>
                    {bb.slot_start} ~ {bb.slot_end}
                    {(() => {
                      const ds = parseHmToMin(bb.slot_start!);
                      const de = parseHmToMin(bb.slot_end!);
                      if (ds === null || de === null || de <= ds) return null;
                      return ` · ${de - ds}분`;
                    })()}
                  </div>
                </div>
                <BreakRowActions
                  plan={bb}
                  showManagerDelete={showManagerDelete}
                  canConfirm={canConfirm}
                  userId={userId}
                  onDelete={() => onDelete(bb.id)}
                  onPatch={(body) => onPatch(bb.id, body)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {unslotted.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-600)", marginBottom: 6 }}>시간 미입력 카드</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {unslotted.map((plan) => (
              <CoachPlanGridCell
                key={plan.id}
                plan={plan}
                heightPx={80}
                showManagerDelete={showManagerDelete}
                canConfirm={canConfirm}
                userId={userId}
                onDelete={() => onDelete(plan.id)}
                onPatch={(body) => onPatch(plan.id, body)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BreakRowActions({
  plan,
  showManagerDelete,
  canConfirm,
  userId,
  onDelete,
  onPatch,
}: {
  plan: TeamEventCoachPlanDto;
  showManagerDelete: boolean;
  canConfirm: boolean;
  userId: string | undefined;
  onDelete: () => void;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const st = plan.plan_status;
  const mine = userId && plan.coach_user_id === userId;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
      {showManagerDelete ? (
        <button type="button" className="btn btn-sm" style={{ fontSize: 9, color: "var(--red)", padding: "2px 6px" }} onClick={onDelete}>
          삭제
        </button>
      ) : null}
      {mine && st === "draft" ? (
        <button type="button" className="btn btn-sm btn-primary" style={{ fontSize: 9, padding: "2px 6px" }} onClick={() => onPatch({ plan_status: "submitted" })}>
          제출
        </button>
      ) : null}
      {canConfirm && st === "submitted" ? (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ fontSize: 9, background: "#166534", color: "#fff", border: "none", padding: "2px 6px" }}
            onClick={() => onPatch({ plan_status: "confirmed" })}
          >
            컨펌
          </button>
          <button type="button" className="btn btn-sm" style={{ fontSize: 9, color: "var(--red)", padding: "2px 6px" }} onClick={() => onPatch({ plan_status: "rejected" })}>
            반려
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CoachPlanGridCell({
  plan,
  heightPx,
  showManagerDelete,
  canConfirm,
  userId,
  onDelete,
  onPatch,
}: {
  plan: TeamEventCoachPlanDto;
  heightPx: number;
  showManagerDelete: boolean;
  canConfirm: boolean;
  userId: string | undefined;
  onDelete: () => void;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const meta = COACH_PLAN_UNIT_META[plan.unit] ?? COACH_PLAN_UNIT_META.team;
  const st = plan.plan_status;
  const mine = userId && plan.coach_user_id === userId;
  const tiny = heightPx < 52;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 5,
        padding: tiny ? "3px 4px" : "4px 5px",
        border: `1px solid ${meta.border}35`,
        flexShrink: 0,
      }}
    >
      {!plan.team_wide_break && (plan.slot_start || plan.slot_end) ? (
        <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", marginBottom: 2 }}>
          {plan.slot_start ?? "?"}–{plan.slot_end ?? "?"}
        </div>
      ) : null}
      <div style={{ fontSize: tiny ? 10 : 11, fontWeight: 800, color: "#111827", lineHeight: 1.25 }}>{plan.title}</div>
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
        {plan.coach_name}
        {plan.role_title ? ` · ${plan.role_title}` : ""}
      </div>
      <span
        style={{
          display: "inline-block",
          marginTop: 4,
          fontSize: 9,
          fontWeight: 800,
          padding: "1px 6px",
          borderRadius: 4,
          background: st === "confirmed" ? "#dcfce7" : st === "submitted" ? "#fef3c7" : "#f3f4f6",
          color: st === "confirmed" ? "#166534" : st === "submitted" ? "#92400e" : "#4b5563",
        }}
      >
        {coachPlanStatusLabel(st)}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
        {showManagerDelete ? (
          <button type="button" className="btn btn-sm" style={{ fontSize: 9, color: "var(--red)", padding: "2px 6px" }} onClick={onDelete}>
            삭제
          </button>
        ) : null}
        {mine && st === "draft" ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            style={{ fontSize: 9, padding: "2px 6px" }}
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
              style={{ fontSize: 9, background: "#166534", color: "#fff", border: "none", padding: "2px 6px" }}
              onClick={() => onPatch({ plan_status: "confirmed" })}
            >
              컨펌
            </button>
            <button type="button" className="btn btn-sm" style={{ fontSize: 9, color: "var(--red)", padding: "2px 6px" }} onClick={() => onPatch({ plan_status: "rejected" })}>
              반려
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
