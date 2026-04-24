/** 클라이언트 전용 — 서버 auth 모듈을 import 하지 않음 */
export function canWriteCoachPlanRole(teamRole: string | undefined): boolean {
  return teamRole === "manager" || teamRole === "head_coach" || teamRole === "part_coach";
}

export function canConfirmCoachPlanRole(teamRole: string | undefined): boolean {
  return teamRole === "manager" || teamRole === "head_coach";
}
