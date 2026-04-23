import type {
  AttendanceRecord,
  InjuryReport,
  JoinRequest,
  MonthlyDue,
  Player,
  TeamEvent,
} from "@/lib/types/entities";

export interface TeamDatabaseState {
  version: 1;
  players: Player[];
  events: TeamEvent[];
  attendance: AttendanceRecord[];
  injury_reports: InjuryReport[];
  monthly_dues: MonthlyDue[];
  join_requests: JoinRequest[];
}

const STORAGE_KEY = "pp_team_db_v1";

export const emptyDb = (): TeamDatabaseState => ({
  version: 1,
  players: [],
  events: [],
  attendance: [],
  injury_reports: [],
  monthly_dues: [],
  join_requests: [],
});

export function readTeamDb(): TeamDatabaseState {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as TeamDatabaseState;
    if (parsed?.version !== 1) return emptyDb();
    return parsed;
  } catch {
    return emptyDb();
  }
}

export function writeTeamDb(db: TeamDatabaseState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function updateTeamDb(mutator: (draft: TeamDatabaseState) => void) {
  const db = readTeamDb();
  mutator(db);
  writeTeamDb(db);
}
