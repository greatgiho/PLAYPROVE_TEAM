import {
  coachPlanRowToDto,
  prismaEventToDto,
  type TeamEventDto,
} from "@/lib/mappers/prismaEventToDto";
import { requireDemoCookie, requireTeamFromCode, requireTeamManager } from "@/lib/server/demoTeamApiAuth";
import { buildEventMetadataPatch, type SeminarSubtype, type SessionKind } from "@/lib/team/eventMetadata";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { attendance_status, event_status, event_type } from "@prisma/client";
import { NextResponse } from "next/server";

function isMissingEventCoachPlansTable(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2021" &&
    typeof e.message === "string" &&
    e.message.includes("event_coach_plans")
  );
}

export const dynamic = "force-dynamic";

function parseSessionKind(v: unknown): SessionKind | null {
  if (v === "training" || v === "seminar") return v;
  return null;
}

function parseSeminarSubtype(v: unknown): SeminarSubtype | string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v as SeminarSubtype;
  return null;
}

export async function GET(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const expand = new Set((searchParams.get("expand") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const wantCoachPlans = expand.has("coach_plans");
  const withAttendanceCounts = searchParams.get("withAttendanceCounts") === "1";

  const whereEvents = { teamId: teamGate.team.id, deletedAt: null } as const;
  const orderEvents = { startsAt: "asc" as const };

  let rows: Awaited<ReturnType<typeof prisma.event.findMany>>;
  /** DB에 training.event_coach_plans 가 없을 때 true — 응답에 coach_plans 는 빈 배열 */
  let coachPlansTableMissing = false;

  if (wantCoachPlans) {
    try {
      rows = await prisma.event.findMany({
        where: whereEvents,
        orderBy: orderEvents,
        include: {
          eventCoachPlans: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              coach: { include: { profiles_profiles_idTousers: { select: { displayName: true } } } },
            },
          },
        },
      });
    } catch (e) {
      if (isMissingEventCoachPlansTable(e)) {
        coachPlansTableMissing = true;
        rows = await prisma.event.findMany({
          where: whereEvents,
          orderBy: orderEvents,
        });
      } else {
        throw e;
      }
    }
  } else {
    rows = await prisma.event.findMany({
      where: whereEvents,
      orderBy: orderEvents,
    });
  }

  let attendingByEvent = new Map<string, number>();
  if (withAttendanceCounts && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const grouped = await prisma.attendance.groupBy({
      by: ["eventId"],
      where: {
        teamId: teamGate.team.id,
        eventId: { in: ids },
        deletedAt: null,
        status: attendance_status.attending,
      },
      _count: { _all: true },
    });
    attendingByEvent = new Map(grouped.map((g) => [g.eventId, g._count._all]));
  }

  const events: TeamEventDto[] = rows.map((r) => {
    const base = prismaEventToDto(r);
    const withCounts =
      withAttendanceCounts ? { ...base, attending_count: attendingByEvent.get(r.id) ?? 0 } : base;
    if (!wantCoachPlans) return withCounts;
    if (coachPlansTableMissing) {
      return { ...withCounts, coach_plans: [] as TeamEventDto["coach_plans"] };
    }
    const withPlans = r as typeof r & {
      eventCoachPlans?: Array<Parameters<typeof coachPlanRowToDto>[0]>;
    };
    return {
      ...withCounts,
      coach_plans: (withPlans.eventCoachPlans ?? []).map(coachPlanRowToDto),
    };
  });

  const headers = new Headers();
  if (coachPlansTableMissing) {
    headers.set("X-Coach-Plans-Schema", "missing");
  }

  return NextResponse.json({ events, coach_plans_schema_missing: coachPlansTableMissing }, { headers });
}

export async function POST(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const mgr = await requireTeamManager(teamGate.team.id, auth.userId);
  if (!mgr.ok) return mgr.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const startsAtRaw = typeof b.starts_at === "string" ? b.starts_at : "";
  if (!title || !startsAtRaw) {
    return NextResponse.json({ error: "missing_fields", message: "title, starts_at 필수" }, { status: 400 });
  }
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "invalid_starts_at" }, { status: 400 });
  }

  const sessionKind = parseSessionKind(b.session_kind) ?? "training";
  const seminarSubtype = parseSeminarSubtype(b.seminar_subtype);

  const endsAtRaw = typeof b.ends_at === "string" && b.ends_at ? new Date(b.ends_at) : null;
  const endsAt = endsAtRaw && !Number.isNaN(endsAtRaw.getTime()) ? endsAtRaw : null;

  const location = typeof b.location === "string" ? b.location.trim() || null : null;
  const notes = typeof b.notes === "string" ? b.notes.trim() || null : null;
  const isMandatory = Boolean(b.is_mandatory);

  const prismaEventType: event_type =
    sessionKind === "seminar" ? event_type.meeting : event_type.practice;

  const created = await prisma.event.create({
    data: {
      teamId: teamGate.team.id,
      title,
      eventType: prismaEventType,
      startsAt,
      endsAt,
      location,
      notes,
      isMandatory,
      status: event_status.scheduled,
      metadata: buildEventMetadataPatch({
        sessionKind,
        seminarSubtype: sessionKind === "seminar" ? seminarSubtype : null,
      }),
      createdBy: auth.userId,
      updatedBy: auth.userId,
    },
  });

  return NextResponse.json({ event: prismaEventToDto(created) }, { status: 201 });
}
