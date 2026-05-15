import type { TeamEventCoachPlanDto, TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { coachPlanStatusLabel } from "@/lib/team/coachPlanMetadata";

export function sortPlansBySlot(a: TeamEventCoachPlanDto, b: TeamEventCoachPlanDto): number {
  const ta = a.slot_start || "99:99";
  const tb = b.slot_start || "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.title.localeCompare(b.title, "ko");
}

export function filterTrainingEvents(events: TeamEventDto[]): TeamEventDto[] {
  return [...events]
    .filter((e) => e.session_kind === "training")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export function formatEventStartsAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventBoxDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

export function formatEventBoxTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/** 일정 박스용 — 로그인 코치 본인 카드 요약 */
export function summarizeMyCoachPlans(
  plans: TeamEventCoachPlanDto[] | undefined,
  userId: string | undefined,
): { label: string; tone: "empty" | "draft" | "submitted" | "confirmed" | "mixed" } {
  if (!userId) return { label: "—", tone: "empty" };
  const mine = (plans ?? []).filter((p) => p.coach_user_id === userId);
  if (mine.length === 0) return { label: "미작성", tone: "empty" };

  const statuses = new Set(mine.map((p) => p.plan_status));
  if (statuses.size === 1) {
    const st = mine[0]!.plan_status;
    return {
      label: `${mine.length}건 · ${coachPlanStatusLabel(st)}`,
      tone: st === "confirmed" ? "confirmed" : st === "submitted" ? "submitted" : "draft",
    };
  }
  return { label: `${mine.length}건 · 복합`, tone: "mixed" };
}
