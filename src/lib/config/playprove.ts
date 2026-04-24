/**
 * 클라이언트·서버 공통: 빌드에 노출되는 public env
 * @see docs/frontend-refactor-execution-plan.md
 */
export function getPlayproveTeamCode(): string {
  return process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ?? "";
}

export function hasPlayproveTeamCode(): boolean {
  return Boolean(getPlayproveTeamCode());
}
