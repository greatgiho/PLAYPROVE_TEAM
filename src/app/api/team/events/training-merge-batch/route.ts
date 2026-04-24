import { requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { trainingMergeForSeoulYmd } from "@/lib/server/trainingMergeForSeoulYmd";
import type { TrainingMergePayload } from "@/lib/types/trainingMerge";
import { seoulYmdFromIso } from "@/lib/team/eventLocalDate";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_IDS = 80;

const emptyPayload = (ymd: string): TrainingMergePayload => ({
  event_date_seoul: ymd,
  schedules: [],
  training_blocks: [],
});

export async function POST(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rawIds =
    body &&
    typeof body === "object" &&
    "event_ids" in body &&
    Array.isArray((body as { event_ids: unknown }).event_ids)
      ? (body as { event_ids: unknown[] }).event_ids
      : [];

  const eventIds = [...new Set(rawIds.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)))].slice(
    0,
    MAX_IDS,
  );

  if (eventIds.length === 0) {
    return NextResponse.json({ by_event: {} as Record<string, TrainingMergePayload> });
  }

  const events = await prisma.event.findMany({
    where: {
      teamId: teamGate.team.id,
      deletedAt: null,
      id: { in: eventIds },
    },
    select: { id: true, startsAt: true },
  });

  const ymdByEvent = new Map<string, string>();
  for (const ev of events) {
    ymdByEvent.set(ev.id, seoulYmdFromIso(ev.startsAt.toISOString()));
  }

  const uniqueYmds = [...new Set(ymdByEvent.values())];
  const payloadByYmd = new Map<string, TrainingMergePayload>();
  await Promise.all(
    uniqueYmds.map(async (ymd) => {
      const payload = await trainingMergeForSeoulYmd(teamGate.team.id, ymd);
      payloadByYmd.set(ymd, payload);
    }),
  );

  const by_event: Record<string, TrainingMergePayload> = {};
  for (const id of eventIds) {
    const ymd = ymdByEvent.get(id);
    if (!ymd) {
      by_event[id] = emptyPayload("");
      continue;
    }
    by_event[id] = payloadByYmd.get(ymd) ?? emptyPayload(ymd);
  }

  return NextResponse.json({ by_event });
}
