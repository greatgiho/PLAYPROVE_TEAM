/**
 * 팀 내 페르소나(역할).
 * 레거시 admin / owner / coach 는 normalizeTeamRole()에서 manager / head_coach 로 정규화합니다.
 */
export type TeamRole = "manager" | "head_coach" | "part_coach" | "player";

/** 사이드바·화면에서의 뷰 모드 (임시 전환/관점) */
export type ViewMode = "manager" | "coach" | "player";

export function normalizeTeamRole(raw: string | null | undefined): TeamRole {
  if (!raw) return "player";
  const r = String(raw).toLowerCase();
  if (r === "admin" || r === "owner" || r === "manager") return "manager";
  if (r === "coach" || r === "head_coach") return "head_coach";
  if (r === "part_coach" || r === "assistant" || r === "staff") return "part_coach";
  if (r === "player") return "player";
  return "player";
}

export function teamRoleLabel(role: TeamRole): string {
  const map: Record<TeamRole, string> = {
    manager: "매니저",
    head_coach: "헤드 코치",
    part_coach: "파트 코치",
    player: "선수",
  };
  return map[role];
}

export function viewModeLabel(view: ViewMode): string {
  const map: Record<ViewMode, string> = {
    manager: "Manager",
    coach: "Coach",
    player: "Player",
  };
  return map[view];
}
