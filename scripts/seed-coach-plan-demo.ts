/**
 * 두 개의 practice Event에 대해 코치 세부 계획을 랜덤 시드하고 전부 confirmed 로 맞춥니다.
 * 기존 `[데모훈련]` 으로 시작하는 카드는 같은 팀에서 먼저 삭제합니다.
 *
 * 실행: 터미널에 DATABASE_URL 이 잡힌 상태에서
 *   npx tsx scripts/seed-coach-plan-demo.ts
 * 팀 코드: PLAYPROVE_TEAM_CODE 또는 NEXT_PUBLIC_PLAYPROVE_TEAM_CODE (없으면 seoul_dragons_fc)
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEED_NAMESPACE = "playprove-bulk-2026";

function deterministicUuid(key: string): string {
  const hash = createHash("sha256").update(`${SEED_NAMESPACE}\0${key}`).digest();
  const buf = Buffer.alloc(16);
  hash.copy(buf, 0, 0, 16);
  buf[6] = (buf[6]! & 0x0f) | 0x40;
  buf[8] = (buf[8]! & 0x3f) | 0x80;
  const h = buf.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const COACH_KEYS = ["coach-0", "coach-1", "coach-2", "coach-3", "coach-4", "coach-5"] as const;

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TITLE_PREFIX = "[데모훈련]";

async function main() {
  const teamCode =
    process.env.PLAYPROVE_TEAM_CODE?.trim() ||
    process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ||
    "seoul_dragons_fc";

  const team = await prisma.team.findFirst({
    where: { teamCode, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!team) {
    console.error(`팀을 찾을 수 없습니다: teamCode=${teamCode}`);
    process.exit(1);
  }

  const headId = deterministicUuid("coach-0");
  const coachIds = COACH_KEYS.map((k) => deterministicUuid(k));

  const events = await prisma.event.findMany({
    where: { teamId: team.id, deletedAt: null, eventType: "practice" },
    orderBy: { startsAt: "asc" },
    take: 2,
    select: { id: true, title: true, startsAt: true },
  });

  if (events.length === 0) {
    console.error("practice 타입 일정이 없습니다. 출결 등에서 훈련 일정을 먼저 만드세요.");
    process.exit(1);
  }

  const del = await prisma.eventCoachPlan.deleteMany({
    where: { teamId: team.id, title: { startsWith: TITLE_PREFIX } },
  });
  console.log(`삭제: 데모 카드 ${del.count}건`);

  const confirmedIso = new Date().toISOString();
  const rand = mulberry32(20260424);

  type Slot = { unit: "team" | "offense" | "defense" | "special"; start: string; end: string; title: string; coachIdx: number; break?: boolean };

  const plansForEvent = (evIdx: number, eventId: string) => {
    const base: Slot[] =
      evIdx === 0
        ? [
            { unit: "team", start: "09:00", end: "09:15", title: "팀 미팅 · 오리엔테이션", coachIdx: 0 },
            { unit: "team", start: "09:15", end: "09:25", title: "전체 워밍업", coachIdx: 0, break: true },
            { unit: "offense", start: "09:25", end: "09:55", title: "패스 프로 · 타이밍", coachIdx: 1 },
            { unit: "offense", start: "09:55", end: "10:15", title: "레드존 스키", coachIdx: 1 },
            { unit: "defense", start: "09:25", end: "09:50", title: "DL 스탠스·첫스텝", coachIdx: 2 },
            { unit: "defense", start: "09:50", end: "10:10", title: "7대7 커버리지", coachIdx: 2 },
            { unit: "special", start: "10:10", end: "10:25", title: "PAT / FG 블록", coachIdx: 3 },
          ]
        : [
            { unit: "team", start: "14:00", end: "14:10", title: "전술 보드 · 상대 분석", coachIdx: 0 },
            { unit: "team", start: "14:10", end: "14:18", title: "전체 휴식", coachIdx: 4, break: true },
            { unit: "offense", start: "14:18", end: "14:48", title: "노들드 드릴", coachIdx: 1 },
            { unit: "defense", start: "14:18", end: "14:45", title: "3-4 패키지 설치", coachIdx: 2 },
            { unit: "special", start: "14:45", end: "15:00", title: "페이크 펀트 리턴", coachIdx: 3 },
            { unit: "offense", start: "15:00", end: "15:20", title: "투미닛 드릴", coachIdx: 5 },
          ];

    const noise = () => (rand() > 0.5 ? " (가변)" : "");
    let sort = 0;
    return base.map((s) => {
      const coachUserId = coachIds[s.coachIdx % coachIds.length]!;
      const meta = s.break
        ? {
            unit: "team",
            role_title: "매니저",
            slot_start: s.start,
            slot_end: s.end,
            plan_status: "confirmed",
            confirmed_at: confirmedIso,
            confirmed_by: headId,
            team_wide_break: true,
          }
        : {
            unit: s.unit,
            role_title: s.unit === "offense" ? "OC" : s.unit === "defense" ? "DC" : s.unit === "special" ? "ST" : "HC",
            slot_start: s.start,
            slot_end: s.end,
            plan_status: "confirmed",
            confirmed_at: confirmedIso,
            confirmed_by: headId,
          };
      sort += 1;
      return {
        teamId: team.id,
        eventId,
        coachUserId,
        title: `${TITLE_PREFIX}${s.title}${noise()}`,
        content: `데모 시드 · 이벤트 ${eventId.slice(0, 8)}…`,
        sortOrder: sort,
        metadata: meta,
      };
    });
  };

  let created = 0;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const rows = plansForEvent(i, ev.id);
    for (const row of rows) {
      await prisma.eventCoachPlan.create({ data: row });
      created++;
    }
    console.log(`이벤트 "${ev.title}" (${ev.id.slice(0, 8)}…): ${rows.length}건`);
  }

  console.log(`\n완료: 팀 ${team.name} · 데모 카드 ${created}건 (전부 confirmed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
