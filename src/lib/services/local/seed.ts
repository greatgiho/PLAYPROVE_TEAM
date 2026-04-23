import type {
  AttendanceRecord,
  InjuryReport,
  JoinRequest,
  MonthlyDue,
  Player,
  TeamEvent,
} from "@/lib/types/entities";
import type { TeamDatabaseState } from "@/lib/services/local/teamDb";

/** 데모 팀 ID (고정 UUID) */
export const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

const ACTOR_SYSTEM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

function stamp(): string {
  return "2026-01-01T00:00:00.000Z";
}

/** 결정적 시드용 UUID (테스트/로컬 데모) */
function uuid(seed: number): string {
  const hex = seed.toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}

export function seedTeamDatabase(): TeamDatabaseState {
  const players: Player[] = [
    mkPlayer(uuid(1), {
      team_id: TEAM_ID,
      full_name: "김쿼터백",
      phone: "010-1000-0001",
      jersey_number: 7,
      join_year: 2024,
      height_cm: 182,
      weight_kg: 88,
      unit: "offense",
      primary_position: "QB",
      secondary_position: null,
      player_status: "active",
      notes: null,
      linked_user_id: null,
    }),
    mkPlayer(uuid(2), {
      team_id: TEAM_ID,
      full_name: "이와이드",
      phone: "010-1000-0002",
      jersey_number: 11,
      join_year: 2025,
      height_cm: 178,
      weight_kg: 80,
      unit: "offense",
      primary_position: "WR",
      secondary_position: "KR",
      player_status: "active",
      notes: null,
      linked_user_id: null,
    }),
    mkPlayer(uuid(3), {
      team_id: TEAM_ID,
      full_name: "박라인",
      phone: "010-1000-0003",
      jersey_number: 55,
      join_year: 2023,
      height_cm: 188,
      weight_kg: 108,
      unit: "defense",
      primary_position: "DE",
      secondary_position: null,
      player_status: "injured",
      notes: "무릎 통증 이력",
      linked_user_id: null,
    }),
    mkPlayer(uuid(7), {
      team_id: TEAM_ID,
      full_name: "박진우",
      phone: "010-2000-0007",
      jersey_number: 21,
      join_year: 2025,
      height_cm: 175,
      weight_kg: 78,
      unit: "offense",
      primary_position: "RB",
      secondary_position: null,
      player_status: "active",
      notes: null,
      linked_user_id: "dddddddd-dddd-4ddd-8ddd-dddddddddd03",
    }),
  ];

  const events: TeamEvent[] = [
    mkEvent(uuid(101), {
      team_id: TEAM_ID,
      title: "정기 훈련 #12",
      event_type: "practice",
      starts_at: "2026-04-25T19:00:00.000Z",
      location: "잠실 보조구장",
      opponent: null,
      is_mandatory: true,
      notes: null,
    }),
    mkEvent(uuid(102), {
      team_id: TEAM_ID,
      title: "스크리미지 vs 강동",
      event_type: "game",
      starts_at: "2026-05-03T14:00:00.000Z",
      location: "목동",
      opponent: "강동 라이더스",
      is_mandatory: true,
      notes: null,
    }),
  ];

  const attendance: AttendanceRecord[] = [];
  let attSeed = 200;
  for (const p of players) {
    attendance.push(
      mkAttendance(uuid(attSeed++), {
        team_id: TEAM_ID,
        event_id: events[0]!.id,
        player_id: p.id,
        status: p.id === players[3]!.id ? "attending" : "undecided",
        absence_reason: null,
      }),
    );
  }

  const injury_reports: InjuryReport[] = [
    mkInjury(uuid(301), {
      team_id: TEAM_ID,
      player_id: players[2]!.id,
      body_part: "무릎(우)",
      pain_level: 6,
      symptoms: "스쿼트 시 통증",
      participation_level: "limited",
      expected_return_date: "2026-05-01",
      is_active: true,
      approval_status: "confirmed",
    }),
  ];

  const monthly_dues: MonthlyDue[] = [];
  const months = ["2026-01", "2026-02", "2026-03", "2026-04"];
  let dueSeed = 400;
  for (const p of players) {
    for (const m of months) {
      const paid = !(m === "2026-04" && p.id === players[1]!.id);
      monthly_dues.push(
        mkDue(uuid(dueSeed++), {
          team_id: TEAM_ID,
          player_id: p.id,
          due_month: m,
          amount: 50000,
          status: paid ? "paid" : "unpaid",
          paid_at: paid ? `${m}-05` : null,
        }),
      );
    }
  }

  const join_requests: JoinRequest[] = [
    mkJoin(uuid(501), {
      team_id: TEAM_ID,
      user_id: "dddddddd-dddd-4ddd-8ddd-dddddddddd99",
      requested_role: "player",
      requested_position: "CB",
      requested_unit: "defense",
      jersey_number: 24,
      height_cm: 180,
      weight_kg: 78,
      message: "수비 코너 지망합니다.",
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null,
    }),
  ];

  return {
    version: 1,
    players,
    events,
    attendance,
    injury_reports,
    monthly_dues,
    join_requests,
  };
}

function mkPlayer(id: string, p: Omit<Player, keyof import("@/lib/types/entities").EntityBase | "id">): Player {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}

function mkEvent(
  id: string,
  p: Omit<TeamEvent, keyof import("@/lib/types/entities").EntityBase | "id">,
): TeamEvent {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}

function mkAttendance(
  id: string,
  p: Omit<AttendanceRecord, keyof import("@/lib/types/entities").EntityBase | "id">,
): AttendanceRecord {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}

function mkInjury(
  id: string,
  p: Omit<InjuryReport, keyof import("@/lib/types/entities").EntityBase | "id">,
): InjuryReport {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}

function mkDue(
  id: string,
  p: Omit<MonthlyDue, keyof import("@/lib/types/entities").EntityBase | "id">,
): MonthlyDue {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}

function mkJoin(
  id: string,
  p: Omit<JoinRequest, keyof import("@/lib/types/entities").EntityBase | "id">,
): JoinRequest {
  const t = stamp();
  return {
    id,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    created_by: ACTOR_SYSTEM,
    updated_by: ACTOR_SYSTEM,
    ...p,
  };
}
