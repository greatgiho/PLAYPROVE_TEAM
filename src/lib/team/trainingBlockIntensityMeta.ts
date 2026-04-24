import type { training_block_intensity } from "@prisma/client";

const M: Record<training_block_intensity, { label: string; color: string }> = {
  low: { label: "저강도", color: "#10b981" },
  medium: { label: "중강도", color: "#f59e0b" },
  high: { label: "고강도", color: "#ef4444" },
};

export function trainingBlockIntensityMeta(i: training_block_intensity | null | undefined) {
  if (!i) return null;
  return M[i] ?? null;
}
