/** 훈련 시작 1시간 전부터 세부 계획 작성·수정 불가 */
export const COACH_PLAN_EDIT_LOCK_MS = 60 * 60 * 1000;

export const COACH_PLAN_EDIT_LOCKED_MESSAGE =
  "훈련 시작 1시간 전부터는 훈련계획을 수정할 수 없습니다.";

export function coachPlanEditDeadline(startsAt: string | Date): Date {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  return new Date(start.getTime() - COACH_PLAN_EDIT_LOCK_MS);
}

export function canEditCoachPlanEvent(startsAt: string | Date, now: Date = new Date()): boolean {
  const deadline = coachPlanEditDeadline(startsAt);
  return now.getTime() < deadline.getTime();
}
