import { parseEventSessionMetadata } from "@/lib/team/eventMetadata";
import type { CoachPlanStatus, CoachPlanUnit } from "@/lib/team/coachPlanMetadata";
import { parseCoachPlanMetadata } from "@/lib/team/coachPlanMetadata";
import type { event_status, event_type } from "@prisma/client";

export type TeamEventDto = {
  id: string;
  team_id: string;
  title: string;
  event_type: event_type;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  opponent: string | null;
  is_mandatory: boolean;
  notes: string | null;
  status: event_status;
  created_at: string;
  updated_at: string;
  session_kind: "training" | "seminar";
  seminar_subtype: string | null;
  /** UI용 한 줄 라벨 */
  kind_label: string;
  /** GET /api/team/events?withAttendanceCounts=1 일 때만 채움 */
  attending_count?: number;
  /** GET /api/team/events?expand=coach_plans 일 때만 채움 */
  coach_plans?: TeamEventCoachPlanDto[];
};

export type TeamEventCoachPlanDto = {
  id: string;
  coach_user_id: string;
  coach_name: string;
  title: string;
  content: string | null;
  sort_order: number;
  updated_at: string;
  unit: CoachPlanUnit;
  role_title: string | null;
  slot_start: string | null;
  slot_end: string | null;
  plan_status: CoachPlanStatus;
  confirmed_at: string | null;
  /** metadata.team_wide_break — 전체 휴식 행 */
  team_wide_break: boolean;
};

export function prismaEventToDto(row: {
  id: string;
  teamId: string;
  title: string;
  eventType: event_type;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  opponent: string | null;
  isMandatory: boolean;
  notes: string | null;
  status: event_status;
  createdAt: Date;
  updatedAt: Date;
  metadata: unknown;
}): TeamEventDto {
  const meta = parseEventSessionMetadata(row.metadata);
  const sessionKind = meta.session_kind ?? (row.eventType === "meeting" ? "seminar" : "training");
  const seminarSubtype = sessionKind === "seminar" ? meta.seminar_subtype ?? "other" : null;
  const kindLabel =
    sessionKind === "training"
      ? "훈련"
      : seminarSubtype === "rule"
        ? "세미나 · 룰"
        : seminarSubtype === "video"
          ? "세미나 · 비디오"
          : seminarSubtype === "mixed"
            ? "세미나 · 복합"
            : "세미나";

  return {
    id: row.id,
    team_id: row.teamId,
    title: row.title,
    event_type: row.eventType,
    starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt?.toISOString() ?? null,
    location: row.location,
    opponent: row.opponent,
    is_mandatory: row.isMandatory,
    notes: row.notes,
    status: row.status,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    session_kind: sessionKind,
    seminar_subtype: seminarSubtype,
    kind_label: kindLabel,
  };
}

export function coachPlanRowToDto(row: {
  id: string;
  coachUserId: string;
  title: string;
  content: string | null;
  sortOrder: number;
  updatedAt: Date;
  metadata: unknown;
  coach: {
    email: string | null;
    profiles_profiles_idTousers: { displayName: string | null } | null;
  };
}): TeamEventCoachPlanDto {
  const pm = parseCoachPlanMetadata(row.metadata);
  const status = pm.plan_status ?? "draft";
  return {
    id: row.id,
    coach_user_id: row.coachUserId,
    coach_name:
      row.coach.profiles_profiles_idTousers?.displayName?.trim() || row.coach.email || "(이름 없음)",
    title: row.title,
    content: row.content,
    sort_order: row.sortOrder,
    updated_at: row.updatedAt.toISOString(),
    team_wide_break: pm.team_wide_break === true,
    unit: pm.unit ?? "team",
    role_title: pm.role_title ?? null,
    slot_start: pm.slot_start ?? null,
    slot_end: pm.slot_end ?? null,
    plan_status: status === "submitted" || status === "confirmed" || status === "rejected" ? status : "draft",
    confirmed_at: pm.confirmed_at ?? null,
  };
}
