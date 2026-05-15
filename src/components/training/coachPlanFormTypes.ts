import { COACH_ROLE_TITLE_OPTIONS, type CoachPlanUnit } from "@/lib/team/coachPlanMetadata";

export type CoachPlanDraftForm = {
  unit: CoachPlanUnit;
  role_pick: string;
  role_custom: string;
  slot_start: string;
  slot_end: string;
  team_wide_break: boolean;
};

export const defaultCoachPlanDraft = (): CoachPlanDraftForm => ({
  unit: "offense",
  role_pick: COACH_ROLE_TITLE_OPTIONS[0] ?? "오펜스 코디네이터",
  role_custom: "",
  slot_start: "",
  slot_end: "",
  team_wide_break: false,
});

export function roleDraftFromHint(hint: string | null): Pick<CoachPlanDraftForm, "role_pick" | "role_custom"> {
  if (!hint?.trim()) {
    return { role_pick: COACH_ROLE_TITLE_OPTIONS[0] ?? "오펜스 코디네이터", role_custom: "" };
  }
  const h = hint.trim();
  if (COACH_ROLE_TITLE_OPTIONS.includes(h)) return { role_pick: h, role_custom: "" };
  return { role_pick: "__custom__", role_custom: h };
}
