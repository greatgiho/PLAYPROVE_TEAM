import type { training_block_type } from "@prisma/client";

/** 레거시 `TP.BLOCK_TYPES`와 맞춘 DB `training_block_type` 라벨·색 */
export const TRAINING_BLOCK_TYPE_META: Record<
  training_block_type,
  { label: string; icon: string; color: string }
> = {
  warmup: { label: "워밍업", icon: "fa-fire", color: "#f97316" },
  drill: { label: "포지션 드릴", icon: "fa-dumbbell", color: "#1a5ca8" },
  meeting: { label: "팀 미팅", icon: "fa-comments", color: "#059669" },
  film: { label: "필름 분석", icon: "fa-film", color: "#0891b2" },
  break: { label: "BREAK", icon: "fa-coffee", color: "#6b7280" },
  other: { label: "기타", icon: "fa-th", color: "#7c3aed" },
};

export function trainingBlockTypeMeta(t: training_block_type) {
  return TRAINING_BLOCK_TYPE_META[t] ?? TRAINING_BLOCK_TYPE_META.other;
}
