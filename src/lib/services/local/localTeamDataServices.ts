import { createBaseEntity, touchEntity, type ActorId } from "@/lib/services/audit";
import type {
  IAttendanceService,
  IDuesService,
  IEventService,
  IInjuryService,
  IJoinRequestService,
  IPlayerService,
  TeamDataServices,
} from "@/lib/services/contracts";
import { readTeamDb, updateTeamDb, writeTeamDb } from "@/lib/services/local/teamDb";
import type { AttendanceRecord, InjuryReport, MonthlyDue, Player, TeamEvent } from "@/lib/types/entities";

function isActive<T extends { deleted_at: string | null }>(row: T) {
  return row.deleted_at == null;
}

export class LocalTeamDataServices implements TeamDataServices {
  players: IPlayerService = {
    listByTeam: async (teamId) => {
      return readTeamDb().players.filter((p) => p.team_id === teamId && isActive(p));
    },
    get: async (teamId, id) => {
      const p = readTeamDb().players.find((x) => x.id === id && x.team_id === teamId && isActive(x));
      return p ?? null;
    },
    create: async (teamId, input, actor) => {
      const row: Player = {
        ...createBaseEntity(actor),
        team_id: teamId,
        ...input,
        linked_user_id: input.linked_user_id ?? null,
      };
      updateTeamDb((db) => {
        db.players.push(row);
      });
      return row;
    },
    update: async (teamId, id, patch, actor) => {
      let out: Player | null = null;
      updateTeamDb((db) => {
        const idx = db.players.findIndex((p) => p.id === id && p.team_id === teamId && isActive(p));
        if (idx < 0) throw new Error("PLAYER_NOT_FOUND");
        out = touchEntity({ ...db.players[idx]!, ...patch }, actor);
        db.players[idx] = out;
      });
      return out!;
    },
    patchStatus: async (teamId, id, status, actor) => {
      let out: Player | null = null;
      updateTeamDb((db) => {
        const idx = db.players.findIndex((p) => p.id === id && p.team_id === teamId && isActive(p));
        if (idx < 0) throw new Error("PLAYER_NOT_FOUND");
        out = touchEntity({ ...db.players[idx]!, player_status: status }, actor);
        db.players[idx] = out;
      });
      return out!;
    },
  };

  events: IEventService = {
    listByTeam: async (teamId) => {
      return readTeamDb().events.filter((e) => e.team_id === teamId && isActive(e));
    },
    create: async (teamId, input, actor) => {
      const row: TeamEvent = { ...createBaseEntity(actor), team_id: teamId, ...input };
      updateTeamDb((db) => {
        db.events.push(row);
      });
      return row;
    },
  };

  attendance: IAttendanceService = {
    listByTeam: async (teamId) => {
      return readTeamDb().attendance.filter((a) => a.team_id === teamId && isActive(a));
    },
    upsert: async (teamId, existingId, input, actor) => {
      updateTeamDb((db) => {
        if (existingId) {
          const idx = db.attendance.findIndex(
            (a) => a.id === existingId && a.team_id === teamId && isActive(a),
          );
          if (idx < 0) throw new Error("ATT_NOT_FOUND");
          db.attendance[idx] = touchEntity(
            {
              ...db.attendance[idx]!,
              ...input,
              team_id: teamId,
            },
            actor,
          );
        } else {
          const dup = db.attendance.findIndex(
            (a) =>
              a.team_id === teamId &&
              isActive(a) &&
              a.event_id === input.event_id &&
              a.player_id === input.player_id,
          );
          if (dup >= 0) {
            db.attendance[dup] = touchEntity({ ...db.attendance[dup]!, ...input }, actor);
          } else {
            db.attendance.push({
              ...createBaseEntity(actor),
              team_id: teamId,
              event_id: input.event_id,
              player_id: input.player_id,
              status: input.status,
              absence_reason: input.absence_reason ?? null,
            });
          }
        }
      });
      const list = readTeamDb().attendance.filter((a) => a.team_id === teamId && isActive(a));
      const row = list.find((a) => a.event_id === input.event_id && a.player_id === input.player_id);
      if (!row) throw new Error("ATT_UPSERT_FAILED");
      return row;
    },
  };

  injuries: IInjuryService = {
    listByTeam: async (teamId) => {
      return readTeamDb().injury_reports.filter((i) => i.team_id === teamId && isActive(i));
    },
    create: async (teamId, input, actor, asPlayerRequest) => {
      const row: InjuryReport = {
        ...createBaseEntity(actor),
        team_id: teamId,
        ...input,
        approval_status: asPlayerRequest ? "pending" : "confirmed",
        is_active: !asPlayerRequest,
      };
      updateTeamDb((db) => {
        db.injury_reports.push(row);
      });
      return row;
    },
    patch: async (teamId, id, patch, actor) => {
      let out: InjuryReport | null = null;
      updateTeamDb((db) => {
        const idx = db.injury_reports.findIndex((x) => x.id === id && x.team_id === teamId && isActive(x));
        if (idx < 0) throw new Error("INJURY_NOT_FOUND");
        out = touchEntity({ ...db.injury_reports[idx]!, ...patch }, actor);
        db.injury_reports[idx] = out;
      });
      return out!;
    },
  };

  dues: IDuesService = {
    listByTeam: async (teamId) => {
      return readTeamDb().monthly_dues.filter((d) => d.team_id === teamId && isActive(d));
    },
    upsertMonth: async (teamId, playerId, dueMonth, status, actor) => {
      let out: MonthlyDue | null = null;
      updateTeamDb((db) => {
        const idx = db.monthly_dues.findIndex(
          (d) =>
            d.team_id === teamId &&
            isActive(d) &&
            d.player_id === playerId &&
            d.due_month === dueMonth,
        );
        if (idx >= 0) {
          out = touchEntity(
            {
              ...db.monthly_dues[idx]!,
              status,
              paid_at: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
            },
            actor,
          );
          db.monthly_dues[idx] = out;
        } else {
          out = {
            ...createBaseEntity(actor),
            team_id: teamId,
            player_id: playerId,
            due_month: dueMonth,
            amount: 50000,
            status,
            paid_at: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
          };
          db.monthly_dues.push(out);
        }
      });
      return out!;
    },
  };

  joinRequests: IJoinRequestService = {
    listByTeam: async (teamId) => {
      return readTeamDb().join_requests.filter((r) => r.team_id === teamId && isActive(r));
    },
    patch: async (teamId, id, patch, actor) => {
      let out!: import("@/lib/types/entities").JoinRequest;
      updateTeamDb((db) => {
        const idx = db.join_requests.findIndex((r) => r.id === id && r.team_id === teamId && isActive(r));
        if (idx < 0) throw new Error("REQUEST_NOT_FOUND");
        out = touchEntity({ ...db.join_requests[idx]!, ...patch }, actor);
        db.join_requests[idx] = out;
      });
      return out;
    },
  };
}

/** 테스트/스토리지 초기화용 */
export function resetTeamDatabaseForTests(next: ReturnType<typeof readTeamDb>) {
  writeTeamDb(next);
}
