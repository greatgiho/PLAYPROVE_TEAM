/**
 * 데이터 접근 계약(포트).
 * LocalStorage 구현체를 Supabase/Prisma Repository 로 교체하면 UI는 그대로 둡니다.
 */
import type {
  AttendanceRecord,
  InjuryReport,
  JoinRequest,
  MonthlyDue,
  Player,
  PlayerStatus,
  TeamEvent,
} from "@/lib/types/entities";
import type { ActorId } from "@/lib/services/audit";

export type PlayerWrite = Omit<
  Player,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "created_by"
  | "updated_by"
  | "team_id"
  | "linked_user_id"
> & { linked_user_id?: string | null };

export type EventWrite = Omit<
  TeamEvent,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "created_by"
  | "updated_by"
  | "team_id"
>;

export type AttendanceWrite = Pick<
  AttendanceRecord,
  "event_id" | "player_id" | "status" | "absence_reason"
>;

export type InjuryWrite = Omit<
  InjuryReport,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "created_by"
  | "updated_by"
  | "team_id"
  | "approval_status"
  | "is_active"
>;

export interface IPlayerService {
  listByTeam(teamId: string): Promise<Player[]>;
  get(teamId: string, id: string): Promise<Player | null>;
  create(teamId: string, input: PlayerWrite, actor: ActorId): Promise<Player>;
  update(teamId: string, id: string, patch: Partial<PlayerWrite>, actor: ActorId): Promise<Player>;
  patchStatus(teamId: string, id: string, status: PlayerStatus, actor: ActorId): Promise<Player>;
}

export interface IEventService {
  listByTeam(teamId: string): Promise<TeamEvent[]>;
  create(teamId: string, input: EventWrite, actor: ActorId): Promise<TeamEvent>;
}

export interface IAttendanceService {
  listByTeam(teamId: string): Promise<AttendanceRecord[]>;
  upsert(
    teamId: string,
    existingId: string | null,
    input: AttendanceWrite,
    actor: ActorId,
  ): Promise<AttendanceRecord>;
}

export interface IInjuryService {
  listByTeam(teamId: string): Promise<InjuryReport[]>;
  create(teamId: string, input: InjuryWrite, actor: ActorId, asPlayerRequest: boolean): Promise<InjuryReport>;
  patch(teamId: string, id: string, patch: Partial<InjuryReport>, actor: ActorId): Promise<InjuryReport>;
}

export interface IDuesService {
  listByTeam(teamId: string): Promise<MonthlyDue[]>;
  upsertMonth(
    teamId: string,
    playerId: string,
    dueMonth: string,
    status: MonthlyDue["status"],
    actor: ActorId,
  ): Promise<MonthlyDue>;
}

export interface IJoinRequestService {
  listByTeam(teamId: string): Promise<JoinRequest[]>;
  patch(
    teamId: string,
    id: string,
    patch: Partial<Pick<JoinRequest, "status" | "reviewed_by" | "reviewed_at" | "reject_reason">>,
    actor: ActorId,
  ): Promise<JoinRequest>;
}

export interface TeamDataServices {
  players: IPlayerService;
  events: IEventService;
  attendance: IAttendanceService;
  injuries: IInjuryService;
  dues: IDuesService;
  joinRequests: IJoinRequestService;
}
