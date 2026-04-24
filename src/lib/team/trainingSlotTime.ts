/** 서울 당일 HH:mm 문자열 → 분(0–1439) */
export function parseHmToMin(hm: string | undefined): number | null {
  if (!hm || typeof hm !== "string") return null;
  const p = hm.trim().split(":");
  if (p.length < 2) return null;
  const h = parseInt(p[0]!, 10);
  const m = parseInt(p[1]!, 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatMinFromTotal(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotRangeLabelFromBlocks(
  blocks: { slot_start: string; slot_end: string }[],
): string | null {
  let lo = 24 * 60;
  let hi = 0;
  for (const b of blocks) {
    const s = parseHmToMin(b.slot_start);
    const e = parseHmToMin(b.slot_end);
    if (s === null || e === null || e <= s) continue;
    lo = Math.min(lo, s);
    hi = Math.max(hi, e);
  }
  if (hi <= lo) return null;
  return `${formatMinFromTotal(lo)} ~ ${formatMinFromTotal(hi)}`;
}
