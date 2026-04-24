import type { Profile, TeamMember, team_member_role, team_member_status, users } from "@prisma/client";
import type { RosterTableRow } from "@/lib/types/rosterTable";

export type TeamMemberWithUser = TeamMember & {
  users_team_members_user_idTousers: users & {
    profiles_profiles_idTousers: Profile | null;
  };
};

function readSeedTitle(metadata: unknown): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const t = (metadata as Record<string, unknown>).seed_title;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return "";
}

function roleUnitLabel(role: team_member_role): string {
  if (role === "manager") return "매니저";
  if (role === "head_coach" || role === "part_coach") return "코치";
  return "스태프";
}

function defaultTitle(role: team_member_role): string {
  switch (role) {
    case "manager":
      return "매니저";
    case "head_coach":
      return "헤드코치";
    case "part_coach":
      return "코치";
    default:
      return String(role);
  }
}

function statusLabel(s: team_member_status): string {
  switch (s) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    case "suspended":
      return "suspended";
    case "left":
      return "left";
    default:
      return String(s);
  }
}

export function prismaTeamMemberToRosterRow(tm: TeamMemberWithUser): RosterTableRow {
  const profile = tm.users_team_members_user_idTousers.profiles_profiles_idTousers;
  const displayName = profile?.displayName?.trim() || tm.users_team_members_user_idTousers.email || "(이름 없음)";
  const title = readSeedTitle(tm.metadata) || defaultTitle(tm.role);

  return {
    id: tm.id,
    kind: "staff",
    full_name: displayName,
    phone: profile?.phone ?? null,
    jersey_number: null,
    unit: roleUnitLabel(tm.role),
    primary_position: title,
    player_status: statusLabel(tm.status),
  };
}

const ROLE_SORT: Record<team_member_role, number> = {
  manager: 0,
  head_coach: 1,
  part_coach: 2,
  player: 9,
  staff: 9,
};

export function sortTeamMembersForRoster(members: TeamMemberWithUser[]): TeamMemberWithUser[] {
  return [...members].sort((a, b) => {
    const ra = ROLE_SORT[a.role] ?? 9;
    const rb = ROLE_SORT[b.role] ?? 9;
    if (ra !== rb) return ra - rb;
    const na =
      a.users_team_members_user_idTousers.profiles_profiles_idTousers?.displayName?.trim() ||
      a.users_team_members_user_idTousers.email ||
      "";
    const nb =
      b.users_team_members_user_idTousers.profiles_profiles_idTousers?.displayName?.trim() ||
      b.users_team_members_user_idTousers.email ||
      "";
    return na.localeCompare(nb, "ko");
  });
}
