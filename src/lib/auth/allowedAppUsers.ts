/**
 * 앱·API 접근을 허용하는 테스트 계정 (`auth.users.id` = `core.profiles.id`).
 * 구글/Apple 연동 시에도 동일 user id 를 유지하면 여기만 맞추면 됩니다.
 */
export const ALLOWED_APP_USER_IDS = [
  "fc94c261-9d2c-4393-8f3e-d79ce755d164", // manager (mgr-0)
  "658adec7-83e5-4451-bb01-48e3d327768f", // head_coach (coach-0)
  "87f4567d-940b-48e3-a06f-3770ee10fa38", // part_coach (coach-1)
  "9a51eb17-47a4-4f38-9e87-35bfa9619f31", // player (player-0)
] as const;

const ALLOWED_SET = new Set<string>(ALLOWED_APP_USER_IDS);

export function isAllowedAppUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ALLOWED_SET.has(userId);
}
