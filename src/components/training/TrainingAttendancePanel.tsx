"use client";

import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { COACH_PLAN_UNIT_META } from "@/lib/team/coachPlanMetadata";
import { rosterUnitFromPrimaryPosition, type RosterTrainingUnit } from "@/lib/roster/rosterUnitFromPosition";
import { useEffect, useMemo, useState } from "react";

type AttendanceApiRow = {
  player_id: string;
  status: "attending" | "absent" | "undecided";
  primary_position: string | null;
};

type PosStat = { position: string; attending: number; total: number };

type Agg = ReturnType<typeof aggregate>;

const UNIT_ORDER: RosterTrainingUnit[] = ["offense", "defense", "special"];

const UNIT_TITLE_KO: Record<RosterTrainingUnit, string> = {
  offense: "오펜스",
  defense: "디펜스",
  special: "스페셜",
};

const OFFENSE_POS_ORDER = [
  "QB",
  "RB",
  "FB",
  "WR",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "OL",
  "IOL",
  "OT",
  "OG",
] as const;
const DEFENSE_POS_ORDER = [
  "DE",
  "DT",
  "NT",
  "OLB",
  "ILB",
  "LB",
  "MLB",
  "EDGE",
  "SAM",
  "WILL",
  "NB",
  "CB",
  "FS",
  "SS",
  "S",
  "DB",
  "DL",
] as const;
const SPECIAL_POS_ORDER = ["K", "P", "LS", "PK", "KR", "PR", "KOS"] as const;

function sortPosStats(list: PosStat[], unit: RosterTrainingUnit): PosStat[] {
  const order =
    unit === "offense" ? OFFENSE_POS_ORDER : unit === "defense" ? DEFENSE_POS_ORDER : SPECIAL_POS_ORDER;
  const idx = (p: string) => {
    const i = (order as readonly string[]).indexOf(p);
    return i === -1 ? 999 : i;
  };
  return [...list].sort((a, b) => idx(a.position) - idx(b.position) || a.position.localeCompare(b.position));
}

function aggregate(rows: AttendanceApiRow[]) {
  let attending = 0;
  let absent = 0;
  let undecided = 0;
  const posMap = new Map<string, { total: number; attending: number }>();

  for (const r of rows) {
    if (r.status === "attending") attending++;
    else if (r.status === "absent") absent++;
    else undecided++;

    const raw = r.primary_position?.trim();
    const key = raw ? raw.toUpperCase() : "—";
    const cur = posMap.get(key) ?? { total: 0, attending: 0 };
    cur.total++;
    if (r.status === "attending") cur.attending++;
    posMap.set(key, cur);
  }

  const byUnit: Record<RosterTrainingUnit, PosStat[]> = { offense: [], defense: [], special: [] };
  let unclassified: PosStat[] = [];

  for (const [position, { total, attending: att }] of posMap) {
    const unit = rosterUnitFromPrimaryPosition(position === "—" ? null : position);
    const stat: PosStat = { position, attending: att, total };
    if (!unit) {
      unclassified.push(stat);
      continue;
    }
    byUnit[unit].push(stat);
  }

  for (const u of UNIT_ORDER) {
    byUnit[u] = sortPosStats(byUnit[u], u);
  }
  unclassified.sort((a, b) => a.position.localeCompare(b.position));

  const unitTotal: Record<RosterTrainingUnit, number> = { offense: 0, defense: 0, special: 0 };
  const unitAttending: Record<RosterTrainingUnit, number> = { offense: 0, defense: 0, special: 0 };
  for (const u of UNIT_ORDER) {
    for (const s of byUnit[u]) {
      unitTotal[u] += s.total;
      unitAttending[u] += s.attending;
    }
  }

  const unclassifiedTotal = unclassified.reduce((n, s) => n + s.total, 0);
  const unclassifiedAttending = unclassified.reduce((n, s) => n + s.attending, 0);

  const total = rows.length;
  const pct = total > 0 ? Math.round((100 * attending) / total) : 0;

  return {
    total,
    attending,
    absent,
    undecided,
    pct,
    byUnit,
    unclassified,
    unclassifiedTotal,
    unclassifiedAttending,
    unitTotal,
    unitAttending,
  };
}

/** 포지션 키 → 직전 훈련 참석 인원 (같은 포지션 라벨 기준) */
function positionAttendingMap(agg: Agg): Map<string, number> {
  const m = new Map<string, number>();
  for (const u of UNIT_ORDER) {
    for (const s of agg.byUnit[u]) {
      m.set(s.position, s.attending);
    }
  }
  for (const s of agg.unclassified) {
    m.set(s.position, s.attending);
  }
  return m;
}

function deltaLabel(d: number): string {
  if (d === 0) return "±0";
  if (d > 0) return `↑${d}`;
  return `↓${-d}`;
}

function deltaColor(d: number, invert = false): string {
  if (d === 0) return "#6b7280";
  const good = "#15803d";
  const bad = "#b91c1c";
  if (invert) return d > 0 ? bad : d < 0 ? good : "#6b7280";
  return d > 0 ? good : d < 0 ? bad : "#6b7280";
}

function SummaryCard({
  label,
  valueMain,
  valueSub,
  barPct,
  barColor,
  delta,
  hasPrev,
  invertDelta,
}: {
  label: string;
  valueMain: string;
  valueSub?: string;
  barPct: number;
  barColor: string;
  delta: number | null;
  hasPrev: boolean;
  /** true면 증가가 나쁨(불참 등) */
  invertDelta?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, barPct));
  return (
    <div
      style={{
        flex: "1 1 120px",
        minWidth: 108,
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        border: "1px solid #eef0f3",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {valueMain}
        {valueSub ? (
          <span style={{ fontSize: 15, fontWeight: 700, color: "#4b5563" }}>{valueSub}</span>
        ) : null}
      </div>
      {hasPrev && delta !== null ? (
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: deltaColor(delta, Boolean(invertDelta)) }}>
          직전 대비 {deltaLabel(delta)}
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 10, color: "#9ca3af" }}>직전 훈련 없음</div>
      )}
      <div style={{ marginTop: 10, height: 5, borderRadius: 3, background: "#eef2f6", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: barColor }} />
      </div>
    </div>
  );
}

const BUBBLE = 78;
const R = 32;
const C = 39;
const CIRC = 2 * Math.PI * R;

function PositionDonutBubble({
  stat,
  accent,
  darkFill,
  prevAttending,
  hasPrev,
}: {
  stat: PosStat;
  accent: string;
  darkFill: string;
  prevAttending: number | null;
  hasPrev: boolean;
}) {
  const { attending, total, position } = stat;
  const pct = total > 0 ? (100 * attending) / total : 0;
  const full = attending === total && total > 0;
  const none = attending === 0 && total > 0;
  const dash = (pct / 100) * CIRC;

  const d =
    hasPrev && prevAttending !== null ? attending - prevAttending : null;

  return (
    <div
      title={`${position}: 참석 ${attending}/${total}${hasPrev && prevAttending !== null ? ` · 직전 참석 ${prevAttending}` : ""}`}
      style={{
        width: BUBBLE,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative", width: BUBBLE, height: BUBBLE, margin: "0 auto" }}>
        <svg width={BUBBLE} height={BUBBLE} viewBox={`0 0 ${BUBBLE} ${BUBBLE}`} style={{ display: "block" }}>
          {full ? (
            <circle cx={C} cy={C} r={C - 6} fill={darkFill} />
          ) : (
            <>
              <circle cx={C} cy={C} r={R} fill="none" stroke="#eef2f6" strokeWidth={6} />
              {!none ? (
                <circle
                  cx={C}
                  cy={C}
                  r={R}
                  fill="none"
                  stroke={accent}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC}`}
                  transform={`rotate(-90 ${C} ${C})`}
                />
              ) : (
                <circle
                  cx={C}
                  cy={C}
                  r={R}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={3}
                  strokeDasharray="4 3"
                />
              )}
              <circle cx={C} cy={C} r={R - 9} fill="#fff" />
            </>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            paddingTop: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: full ? "#fff" : "#374151",
              letterSpacing: -0.3,
            }}
          >
            {position}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: full ? "#fff" : "#111827",
              lineHeight: 1.1,
            }}
          >
            {attending}
            <span style={{ fontSize: 11, fontWeight: 700, opacity: full ? 0.9 : 0.65 }}>/{total}</span>
          </span>
        </div>
      </div>
      {hasPrev && d !== null ? (
        <div style={{ marginTop: 4, fontSize: 10, fontWeight: 800, color: deltaColor(d) }}>{deltaLabel(d)}</div>
      ) : (
        <div style={{ marginTop: 4, height: 14 }} />
      )}
    </div>
  );
}

function UnitPanel({
  unit,
  stats,
  prevMap,
  hasPrev,
  prevStats,
}: {
  unit: RosterTrainingUnit;
  stats: Agg;
  prevMap: Map<string, number>;
  hasPrev: boolean;
  prevStats: Agg | null;
}) {
  const list = stats.byUnit[unit];
  if (list.length === 0) return null;
  const meta = COACH_PLAN_UNIT_META[unit];
  const dark = unit === "offense" ? "#1e3a8a" : unit === "defense" ? "#7f1d1d" : "#92400e";
  const prevUnitAtt =
    hasPrev && prevStats ? prevStats.unitAttending[unit] : null;
  const uDelta =
    hasPrev && prevUnitAtt !== null ? stats.unitAttending[unit] - prevUnitAtt : null;

  return (
    <div
      style={{
        padding: "14px 14px 16px",
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #eef0f3",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: meta.border }}>{UNIT_TITLE_KO[unit]}</div>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
            로스터 {stats.unitTotal[unit]}명 · 참석{" "}
            <strong style={{ color: "#15803d" }}>{stats.unitAttending[unit]}</strong>
            {uDelta !== null ? (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: deltaColor(uDelta) }}>
                직전 {deltaLabel(uDelta)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 14px", justifyContent: "flex-start" }}>
        {list.map((s) => (
          <PositionDonutBubble
            key={s.position}
            stat={s}
            accent={meta.border}
            darkFill={dark}
            prevAttending={hasPrev ? (prevMap.get(s.position) ?? 0) : null}
            hasPrev={hasPrev}
          />
        ))}
      </div>
    </div>
  );
}

type LoadState = {
  rows: AttendanceApiRow[];
  prevRows: AttendanceApiRow[] | null;
  prevTitle: string | null;
  prevStartsAt: string | null;
};

export function TrainingAttendancePanel({ teamCode, eventId }: { teamCode: string; eventId: string }) {
  const [data, setData] = useState<LoadState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamCode.trim()) {
      setLoading(false);
      setData(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);

    void (async () => {
      try {
        const evRes = await fetch(`/api/team/events?teamCode=${encodeURIComponent(teamCode)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const evJ = (await evRes.json().catch(() => ({}))) as { events?: TeamEventDto[]; error?: string };
        if (!evRes.ok) {
          throw new Error(typeof evJ.error === "string" ? evJ.error : "일정 목록을 불러오지 못했습니다.");
        }
        const events = Array.isArray(evJ.events) ? evJ.events : [];
        const training = [...events]
          .filter((e) => e.session_kind === "training")
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        const idx = training.findIndex((e) => e.id === eventId);
        const prevEv = idx > 0 ? training[idx - 1]! : null;

        const curP = fetch(
          `/api/team/attendance?teamCode=${encodeURIComponent(teamCode)}&eventId=${encodeURIComponent(eventId)}`,
          { credentials: "include", cache: "no-store" },
        ).then(async (res) => {
          const j = (await res.json().catch(() => ({}))) as { rows?: AttendanceApiRow[]; error?: string };
          if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "출석 데이터 오류");
          return Array.isArray(j.rows) ? j.rows : [];
        });

        const prevP =
          prevEv != null
            ? fetch(
                `/api/team/attendance?teamCode=${encodeURIComponent(teamCode)}&eventId=${encodeURIComponent(prevEv.id)}`,
                { credentials: "include", cache: "no-store" },
              ).then(async (res) => {
                const j = (await res.json().catch(() => ({}))) as { rows?: AttendanceApiRow[] };
                if (!res.ok) return null;
                return Array.isArray(j.rows) ? j.rows : [];
              })
            : Promise.resolve(null);

        const [rows, prevRows] = await Promise.all([curP, prevP]);
        if (cancelled) return;
        setData({
          rows,
          prevRows,
          prevTitle: prevEv?.title ?? null,
          prevStartsAt: prevEv?.starts_at ?? null,
        });
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "불러오기 실패");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamCode, eventId]);

  const stats = useMemo(() => (data?.rows ? aggregate(data.rows) : null), [data]);
  const prevStats = useMemo(
    () => (data?.prevRows != null && data.prevRows.length > 0 ? aggregate(data.prevRows) : null),
    [data],
  );
  const prevMap = useMemo(() => (prevStats ? positionAttendingMap(prevStats) : new Map<string, number>()), [prevStats]);
  const hasPrev = Boolean(prevStats && prevStats.total > 0);

  if (!teamCode.trim()) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 16 }}>
        출석·직전 훈련 대비 불러오는 중…
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ fontSize: 12, color: "var(--danger, #b42318)", marginBottom: 14 }}>
        {err}
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--gray-600)", marginBottom: 14 }}>
        출석 대상 선수가 없습니다.
      </div>
    );
  }

  const rosterDelta = hasPrev && prevStats ? stats.total - prevStats.total : null;
  const attDelta = hasPrev && prevStats ? stats.attending - prevStats.attending : null;
  const absDelta = hasPrev && prevStats ? stats.absent - prevStats.absent : null;
  const undDelta = hasPrev && prevStats ? stats.undecided - prevStats.undecided : null;

  return (
    <div
      style={{
        marginBottom: 18,
        padding: "16px 16px 18px",
        background: "linear-gradient(180deg, #fafbfc 0%, #f3f4f6 100%)",
        border: "1px solid var(--gray-200, #e5e7eb)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-700)" }}>참석 현황</div>
        {data?.prevTitle && data.prevStartsAt ? (
          <div style={{ fontSize: 10, color: "#6b7280", textAlign: "right", maxWidth: 280, lineHeight: 1.35 }}>
            직전 훈련: <strong>{data.prevTitle}</strong>
            <br />
            {new Date(data.prevStartsAt).toLocaleString("ko-KR", {
              month: "numeric",
              day: "numeric",
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          label="로스터"
          valueMain={String(stats.total)}
          barPct={100}
          barColor="#94a3b8"
          delta={rosterDelta}
          hasPrev={hasPrev}
        />
        <SummaryCard
          label="참석"
          valueMain={String(stats.attending)}
          valueSub={stats.total > 0 ? ` (${stats.pct}%)` : ""}
          barPct={stats.total > 0 ? (100 * stats.attending) / stats.total : 0}
          barColor="#0d9488"
          delta={attDelta}
          hasPrev={hasPrev}
        />
        <SummaryCard
          label="불참"
          valueMain={String(stats.absent)}
          barPct={stats.total > 0 ? (100 * stats.absent) / stats.total : 0}
          barColor="#dc2626"
          delta={absDelta}
          hasPrev={hasPrev}
          invertDelta
        />
        <SummaryCard
          label="미정"
          valueMain={String(stats.undecided)}
          barPct={stats.total > 0 ? (100 * stats.undecided) / stats.total : 0}
          barColor="#ea580c"
          delta={undDelta}
          hasPrev={hasPrev}
          invertDelta
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <UnitPanel unit="offense" stats={stats} prevMap={prevMap} hasPrev={hasPrev} prevStats={prevStats} />
        </div>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <UnitPanel unit="defense" stats={stats} prevMap={prevMap} hasPrev={hasPrev} prevStats={prevStats} />
        </div>
      </div>

      {stats.byUnit.special.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <UnitPanel unit="special" stats={stats} prevMap={prevMap} hasPrev={hasPrev} prevStats={prevStats} />
        </div>
      ) : null}

      {stats.unclassified.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              padding: "14px 14px 16px",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #eef0f3",
              boxShadow: "0 1px 4px rgba(0,0,0,.05)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "#374151", marginBottom: 10 }}>
              포지션 미분류 · {stats.unclassifiedTotal}명 (참석 {stats.unclassifiedAttending})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 14px" }}>
              {stats.unclassified.map((s) => (
                <PositionDonutBubble
                  key={s.position}
                  stat={s}
                  accent="#6b7280"
                  darkFill="#374151"
                  prevAttending={hasPrev ? (prevMap.get(s.position) ?? 0) : null}
                  hasPrev={hasPrev}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
