import type { Player as DbPlayer, Profile } from "@prisma/client";
import type { Player, PlayerStatus, UnitKind } from "@/lib/types/entities";

function mapRosterStatus(s: DbPlayer["rosterStatus"]): PlayerStatus {
  switch (s) {
    case "injured":
      return "injured";
    case "leave_absence":
      return "leave_absence";
    case "military_leave":
      return "military_leave";
    default:
      return "active";
  }
}

function asUnit(u: string | null | undefined): UnitKind {
  if (u === "offense" || u === "defense" || u === "special") return u;
  return "offense";
}

type PlayerWithLink = DbPlayer & {
  users_players_linked_user_idTousers: {
    profiles_profiles_idTousers: Profile | null;
  } | null;
};

export function prismaPlayerToEntity(row: PlayerWithLink): Player {
  const profile = row.users_players_linked_user_idTousers?.profiles_profiles_idTousers ?? null;
  const phone = profile?.phone ?? null;

  return {
    id: row.id,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    team_id: row.teamId,
    full_name: row.fullName,
    phone,
    jersey_number: row.jerseyNumber ?? null,
    join_year: row.joinYear ?? null,
    height_cm: row.heightCm != null ? Number(row.heightCm) : null,
    weight_kg: row.weightKg != null ? Number(row.weightKg) : null,
    unit: asUnit(row.unit),
    primary_position: row.primaryPosition ?? "",
    secondary_position: row.secondaryPosition ?? null,
    player_status: mapRosterStatus(row.rosterStatus),
    notes: row.notes ?? null,
    linked_user_id: row.linkedUserId,
  };
}
