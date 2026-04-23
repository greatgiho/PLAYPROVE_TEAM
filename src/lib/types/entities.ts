/**
 * 모든 도메인 엔티티는 UUID `id` 와 5대 공통 컬럼을 포함합니다.
 * DB(Supabase/Prisma) 연동 시 그대로 매핑할 수 있도록 설계했습니다.
 */
export type ISODateString = string;

export interface EntityBase {
  id: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  deleted_at: ISODateString | null;
  created_by: string | null;
  updated_by: string | null;
}

export type PlayerStatus =
  | "active"
  | "injured"
  | "leave_absence"
  | "military_leave";

export type UnitKind = "offense" | "defense" | "special";

export interface Player extends EntityBase {
  team_id: string;
  full_name: string;
  phone: string | null;
  jersey_number: number | null;
  join_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  unit: UnitKind;
  primary_position: string;
  secondary_position: string | null;
  player_status: PlayerStatus;
  notes: string | null;
  /** 로그인 사용자와 로스터를 연결할 때 사용 (옵션) */
  linked_user_id: string | null;
}

export type EventType = "practice" | "game" | "meeting" | "rehab";

export interface TeamEvent extends EntityBase {
  team_id: string;
  title: string;
  event_type: EventType;
  starts_at: ISODateString;
  location: string | null;
  opponent: string | null;
  is_mandatory: boolean;
  notes: string | null;
}

export type AttendanceStatus = "attending" | "absent" | "undecided";

export interface AttendanceRecord extends EntityBase {
  team_id: string;
  event_id: string;
  player_id: string;
  status: AttendanceStatus;
  absence_reason: string | null;
}

export type InjuryApprovalStatus = "pending" | "confirmed" | "rejected";

export interface InjuryReport extends EntityBase {
  team_id: string;
  player_id: string;
  body_part: string;
  pain_level: number;
  symptoms: string | null;
  participation_level: "full" | "limited" | "out";
  expected_return_date: string | null;
  is_active: boolean;
  approval_status: InjuryApprovalStatus;
}

export type DueStatus = "paid" | "unpaid";

export interface MonthlyDue extends EntityBase {
  team_id: string;
  player_id: string;
  due_month: string;
  amount: number;
  status: DueStatus;
  paid_at: string | null;
}

export interface Notice extends EntityBase {
  team_id: string;
  title: string;
  body: string;
  published_at: ISODateString;
}

export interface JoinRequest extends EntityBase {
  team_id: string;
  user_id: string;
  requested_role: string;
  requested_position: string | null;
  requested_unit: string | null;
  jersey_number: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  message: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: ISODateString | null;
  reject_reason: string | null;
}

/** 훈련 일정(캘린더 상의 훈련 슬롯) */
export interface TrainingSchedule extends EntityBase {
  team_id: string;
  title: string;
  starts_at: ISODateString;
  ends_at: ISODateString;
  location: string | null;
  notes: string | null;
}

export type TrainingBlockUnit = "team" | "offense" | "defense" | "special";

export interface TrainingBlock extends EntityBase {
  team_id: string;
  schedule_id: string;
  unit: TrainingBlockUnit;
  title: string;
  starts_at: ISODateString;
  ends_at: ISODateString;
  intensity: string | null;
  notes: string | null;
}

export interface PracticePlan extends EntityBase {
  team_id: string;
  title: string;
  plan_date: string;
  body: string | null;
  author_user_id: string | null;
}
