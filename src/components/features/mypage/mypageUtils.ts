import type { TeamRole } from "@/lib/types/roles";

export function isStaffTeamRole(role: TeamRole): boolean {
  return role === "manager" || role === "head_coach" || role === "part_coach";
}
