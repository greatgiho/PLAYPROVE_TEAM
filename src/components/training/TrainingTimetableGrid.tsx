"use client";

import type { TrainingBlockMergeDto } from "@/lib/types/trainingMerge";
import { COACH_PLAN_UNIT_META, COACH_PLAN_UNITS_ORDER, type CoachPlanUnit } from "@/lib/team/coachPlanMetadata";
import { trainingBlockIntensityMeta } from "@/lib/team/trainingBlockIntensityMeta";
import { formatMinFromTotal, parseHmToMin } from "@/lib/team/trainingSlotTime";
import { trainingBlockTypeMeta, TRAINING_BLOCK_TYPE_META } from "@/lib/team/trainingBlockTypeMeta";
import { Fragment, useMemo } from "react";

const STEP_MIN = 5;
const ROW_PX = 17;
const DEFAULT_ORIGIN = 11 * 60;
const DEFAULT_END = 14 * 60;

function snapDown(m: number): number {
  return Math.floor(m / STEP_MIN) * STEP_MIN;
}

function snapUp(m: number): number {
  return Math.ceil(m / STEP_MIN) * STEP_MIN;
}

const COL_IDX: Record<CoachPlanUnit, number> = { team: 2, offense: 3, defense: 4, special: 5 };

function breakRanges(blocks: TrainingBlockMergeDto[]): { s: number; e: number }[] {
  return blocks
    .filter((b) => b.block_type === "break")
    .map((b) => {
      const s = parseHmToMin(b.slot_start);
      const e = parseHmToMin(b.slot_end);
      if (s === null || e === null || e <= s) return null;
      return { s, e };
    })
    .filter((x): x is { s: number; e: number } => x !== null);
}

function overlapsBreak(ranges: { s: number; e: number }[], s: number, e: number): boolean {
  return ranges.some((br) => s < br.e && e > br.s);
}

function positionTags(focus: string | null | undefined): string[] {
  if (!focus?.trim()) return [];
  return [...new Set(focus.split(/[,，]/).map((s) => s.trim()).filter(Boolean))].slice(0, 10);
}

/**
 * 레거시 `buildTimeTable`과 같은 축(5분 행·4유닛·전폭 브레이크). 첨부 ERP 화면의 **읽기 전용 축소판** — 날짜 탭·편집·AI 등 전역 UI는 포함하지 않음.
 */
export function TrainingTimetableGrid({
  blocks,
  showLegend = true,
}: {
  blocks: TrainingBlockMergeDto[];
  /** 레거시 `tp-legend`에 해당 */
  showLegend?: boolean;
}) {
  const { originMin, slots, breaks } = useMemo(() => {
    let minS = 24 * 60;
    let maxE = 0;
    let any = false;
    for (const b of blocks) {
      const s = parseHmToMin(b.slot_start);
      const e = parseHmToMin(b.slot_end);
      if (s === null || e === null) continue;
      if (e <= s) continue;
      any = true;
      minS = Math.min(minS, s);
      maxE = Math.max(maxE, e);
    }
    const origin = any ? snapDown(Math.max(0, minS - 30)) : DEFAULT_ORIGIN;
    const end = any ? snapUp(Math.min(24 * 60, maxE + 30)) : DEFAULT_END;
    const slotList: number[] = [];
    for (let t = origin; t <= end; t += STEP_MIN) {
      slotList.push(t);
    }
    return { originMin: origin, slots: slotList, breaks: breakRanges(blocks) };
  }, [blocks]);

  const totalRows = slots.length;
  if (totalRows === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--gray-500)", padding: "12px 0" }}>
        표시할 시간 범위가 없습니다.
      </div>
    );
  }

  const regularBlocks = blocks.filter((b) => b.block_type !== "break");
  const breakBlocks = blocks.filter((b) => b.block_type === "break");

  const legendItems = (Object.keys(TRAINING_BLOCK_TYPE_META) as (keyof typeof TRAINING_BLOCK_TYPE_META)[]).filter(
    (k) => k !== "break",
  );

  return (
    <div>
      {showLegend ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px 10px",
            marginBottom: 10,
            padding: "8px 10px",
            background: "#fafafa",
            borderRadius: 8,
            border: "1px solid #eee",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginRight: 4 }}>범례</span>
          {legendItems.map((k) => {
            const v = TRAINING_BLOCK_TYPE_META[k];
            return (
              <span
                key={k}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: v.color,
                  background: `${v.color}14`,
                  border: `1px solid ${v.color}35`,
                  borderRadius: 6,
                  padding: "3px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <i className={`fas ${v.icon}`} style={{ fontSize: 9 }}></i>
                {v.label}
              </span>
            );
          })}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: TRAINING_BLOCK_TYPE_META.break.color,
              background: `${TRAINING_BLOCK_TYPE_META.break.color}14`,
              border: `1px solid ${TRAINING_BLOCK_TYPE_META.break.color}35`,
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            <i className={`fas ${TRAINING_BLOCK_TYPE_META.break.icon}`} style={{ marginRight: 4 }}></i>
            {TRAINING_BLOCK_TYPE_META.break.label}
          </span>
        </div>
      ) : null}

      <div style={{ overflow: "auto", maxHeight: 460, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `72px repeat(4, minmax(96px, 1fr))`,
            gridTemplateRows: `34px repeat(${totalRows}, ${ROW_PX}px)`,
            minWidth: 560,
            position: "relative",
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              gridColumn: 1,
              gridRow: 1,
              fontSize: 10,
              fontWeight: 800,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              paddingLeft: 6,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            TIME
          </div>
          {COACH_PLAN_UNITS_ORDER.map((u, i) => {
            const meta = COACH_PLAN_UNIT_META[u];
            return (
              <div
                key={u}
                style={{
                  gridColumn: i + 2,
                  gridRow: 1,
                  fontSize: 10,
                  fontWeight: 800,
                  color: meta.border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  background: meta.bg,
                  borderBottom: `1px solid ${meta.border}33`,
                }}
              >
                <i className={`fas ${meta.icon}`} style={{ fontSize: 9 }}></i>
                {meta.label}
              </div>
            );
          })}

          {slots.map((min, i) => {
            const row = i + 2;
            /** 첨부 스크린처럼 10분마다 라벨 */
            const showLabel = min % 10 === 0;
            const isHour = min % 60 === 0;
            const lineOpacity = isHour ? 0.14 : min % 30 === 0 ? 0.09 : 0.05;
            return (
              <Fragment key={min}>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: row,
                    fontSize: 10,
                    color: isHour ? "#374151" : "#94a3b8",
                    fontWeight: isHour ? 700 : 500,
                    paddingLeft: 6,
                    paddingTop: 0,
                    borderRight: "1px solid #f1f5f9",
                  }}
                >
                  {showLabel ? formatMinFromTotal(min) : ""}
                </div>
                <div
                  style={{
                    gridColumn: "2 / 6",
                    gridRow: row,
                    borderTop: `1px ${isHour ? "solid" : "dashed"} rgba(0,0,0,${lineOpacity})`,
                    pointerEvents: "none",
                  }}
                />
              </Fragment>
            );
          })}

          {regularBlocks.map((b) => {
            const startMin = parseHmToMin(b.slot_start);
            const endMin = parseHmToMin(b.slot_end);
            if (startMin === null || endMin === null || endMin <= startMin) return null;
            if (overlapsBreak(breaks, startMin, endMin)) return null;

            const originMin = slots[0] ?? 0;
            const clampedS = Math.max(startMin, originMin);
            const clampedE = Math.min(endMin, originMin + totalRows * STEP_MIN);
            if (clampedE <= clampedS) return null;

            const rowStart = 2 + Math.floor((clampedS - originMin) / STEP_MIN);
            const rowSpan = Math.max(1, Math.ceil((clampedE - clampedS) / STEP_MIN));
            const unit = b.unit as CoachPlanUnit;
            const col = COL_IDX[unit] ?? 2;
            const colMeta = COACH_PLAN_UNIT_META[unit] ?? COACH_PLAN_UNIT_META.team;
            const bt = trainingBlockTypeMeta(b.block_type);
            const inten = trainingBlockIntensityMeta(b.intensity);
            const heightPx = rowSpan * ROW_PX - 3;
            const tiny = heightPx < 34;
            const tags = positionTags(b.position_focus);
            const tip = [b.title, b.summary, `${b.slot_start}–${b.slot_end}`, b.coach_name].filter(Boolean).join("\n");

            return (
              <div
                key={b.id}
                title={tip}
                style={{
                  gridColumn: col,
                  gridRow: `${rowStart} / span ${rowSpan}`,
                  zIndex: 2,
                  margin: "1px 3px",
                  borderRadius: 6,
                  background: colMeta.bg,
                  border: `1.5px solid ${colMeta.border}40`,
                  borderLeft: `3px solid ${colMeta.border}`,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: tiny ? "2px 5px" : "4px 6px",
                  fontSize: 10,
                  boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                }}
              >
                {!tiny ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: bt.color,
                        fontSize: 9,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <i className={`fas ${bt.icon}`} style={{ marginRight: 3 }}></i>
                      {bt.label}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 9, flexShrink: 0 }}>
                      {b.slot_start}–{b.slot_end}
                    </span>
                  </div>
                ) : null}
                <div
                  style={{
                    fontWeight: 800,
                    color: "#111827",
                    fontSize: tiny ? 9 : 11,
                    lineHeight: 1.25,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: tiny ? 2 : 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {b.title}
                </div>
                {!tiny && b.summary && heightPx >= 44 ? (
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 9,
                      color: "#4b5563",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {b.summary}
                  </div>
                ) : null}
                {!tiny && heightPx >= 52 ? (
                  <div style={{ marginTop: "auto", paddingTop: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                    {inten ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: inten.color }}>{inten.label}</span>
                    ) : null}
                    <span style={{ fontSize: 9, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                      <i className="fas fa-user-tie" style={{ marginRight: 4 }}></i>
                      {b.coach_name}
                    </span>
                  </div>
                ) : null}
                {!tiny && tags.length > 0 && heightPx >= 64 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                    {tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: `${bt.color}18`,
                          color: bt.color,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {breakBlocks.map((bb) => {
            const s = parseHmToMin(bb.slot_start);
            const e = parseHmToMin(bb.slot_end);
            if (s === null || e === null || e <= s) return null;
            const originMin = slots[0] ?? 0;
            const clampedS = Math.max(s, originMin);
            const clampedE = Math.min(e, originMin + totalRows * STEP_MIN);
            if (clampedE <= clampedS) return null;
            const rowStart = 2 + Math.floor((clampedS - originMin) / STEP_MIN);
            const rowSpan = Math.max(1, Math.ceil((clampedE - clampedS) / STEP_MIN));
            return (
              <div
                key={`brk-${bb.id}`}
                style={{
                  gridColumn: "1 / -1",
                  gridRow: `${rowStart} / span ${rowSpan}`,
                  zIndex: 3,
                  margin: "1px 4px",
                  borderRadius: 6,
                  background: "linear-gradient(90deg, #f8fafc, #e2e8f0)",
                  border: "1px dashed #94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "#475569",
                }}
              >
                <span style={{ fontSize: 14 }}>☕</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>BREAK{bb.title && bb.title !== "BREAK" ? ` — ${bb.title}` : ""}</div>
                  <div style={{ fontSize: 10, opacity: 0.9 }}>
                    {bb.slot_start} ~ {bb.slot_end}
                    {(() => {
                      const ds = parseHmToMin(bb.slot_start);
                      const de = parseHmToMin(bb.slot_end);
                      if (ds === null || de === null || de <= ds) return null;
                      return ` · ${de - ds}분 휴식`;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
