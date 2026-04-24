/** 레거시 블록 `metadata` JSON에서 요약/메모 추출 */
export function readTrainingBlockSummaryFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  for (const k of ["summary", "notes", "description", "detail"]) {
    const v = m[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
