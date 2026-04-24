import type { Prisma } from "@prisma/client";

/** 타임테이블 카드가 놓이는 유닛 컬럼 (레거시 TP.COLS) */
export type CoachPlanUnit = "team" | "offense" | "defense" | "special";

/** 그리드·집계 컬럼 순서 (training_column_unit) */
export const COACH_PLAN_UNITS_ORDER: CoachPlanUnit[] = ["team", "offense", "defense", "special"];

/** 코치 작성 → 제출 → 감독(헤드코치/매니저) 컨펌 */
export type CoachPlanStatus = "draft" | "submitted" | "confirmed" | "rejected";

export type CoachPlanMetadata = {
  unit?: CoachPlanUnit;
  /** 코치 직함 (파트 코치 역할 라벨) */
  role_title?: string | null;
  /** HH:mm (일정 당일 기준 슬롯) */
  slot_start?: string | null;
  slot_end?: string | null;
  plan_status?: CoachPlanStatus;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  /** 전체 휴식 — 훈련 계획표 격자에서 TIME~4파트 전폭 행 */
  team_wide_break?: boolean;
};

/** UI 선택용 — 팀에서 쓰는 대표 직함 (필요 시 자유 입력과 병행) */
export const COACH_ROLE_TITLE_OPTIONS: string[] = [
  "오펜스 코디네이터",
  "오펜시브 라인 코치",
  "오펜시브 러닝백 코치",
  "오펜시브 리시버 코치",
  "쿼터백 코치",
  "디펜스 코디네이터",
  "디펜시브 라인 코치",
  "디펜시브 라인배커 코치",
  "디펜시브 백 코치",
  "스페셜 코디네이터",
  "스페셜 코치",
];

export const COACH_PLAN_UNIT_META: Record<
  CoachPlanUnit,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  team: {
    label: "TEAM OVERALL",
    icon: "fa-users",
    color: "#374151",
    bg: "#f3f4f6",
    border: "#374151",
  },
  offense: {
    label: "OFFENSE",
    icon: "fa-arrow-right",
    color: "#1a5ca8",
    bg: "#eff6ff",
    border: "#1a5ca8",
  },
  defense: {
    label: "DEFENSE",
    icon: "fa-shield-alt",
    color: "#7B1818",
    bg: "#fff1f1",
    border: "#7B1818",
  },
  special: {
    label: "SPECIAL",
    icon: "fa-star",
    color: "#a87b00",
    bg: "#fffbeb",
    border: "#a87b00",
  },
};

export function parseCoachPlanUnit(v: unknown): CoachPlanUnit | null {
  if (v === "team" || v === "offense" || v === "defense" || v === "special") return v;
  return null;
}

export function parseCoachPlanMetadata(raw: unknown): CoachPlanMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const m = raw as Record<string, unknown>;
  const unit = m.unit === "offense" || m.unit === "defense" || m.unit === "special" || m.unit === "team" ? m.unit : undefined;
  const role_title = typeof m.role_title === "string" ? m.role_title.trim() || null : null;
  const slot_start = typeof m.slot_start === "string" ? m.slot_start.trim() || null : null;
  const slot_end = typeof m.slot_end === "string" ? m.slot_end.trim() || null : null;
  const plan_status =
    m.plan_status === "draft" ||
    m.plan_status === "submitted" ||
    m.plan_status === "confirmed" ||
    m.plan_status === "rejected"
      ? m.plan_status
      : undefined;
  const confirmed_at = typeof m.confirmed_at === "string" ? m.confirmed_at : null;
  const confirmed_by = typeof m.confirmed_by === "string" ? m.confirmed_by : null;
  const team_wide_break = m.team_wide_break === true ? true : undefined;
  return { unit, role_title, slot_start, slot_end, plan_status, confirmed_at, confirmed_by, team_wide_break };
}

export function mergeCoachPlanMetadata(existing: unknown, patch: CoachPlanMetadata): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const defined = Object.fromEntries(
    Object.entries(patch as Record<string, unknown>).filter(([, v]) => v !== undefined),
  );
  const next = { ...base, ...defined };
  return next as Prisma.InputJsonValue;
}

export function coachPlanStatusLabel(s: CoachPlanStatus | undefined): string {
  switch (s) {
    case "submitted":
      return "제출됨";
    case "confirmed":
      return "컨펌";
    case "rejected":
      return "반려";
    default:
      return "작성중";
  }
}
