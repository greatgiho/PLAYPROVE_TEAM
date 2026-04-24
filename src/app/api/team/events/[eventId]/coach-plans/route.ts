import { coachPlanRowToDto } from "@/lib/mappers/prismaEventToDto";
import { canWriteCoachPlan, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { mergeCoachPlanMetadata, parseCoachPlanUnit, type CoachPlanStatus } from "@/lib/team/coachPlanMetadata";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePlanStatusCreate(v: unknown): CoachPlanStatus {
  if (v === "submitted") return "submitted";
  return "draft";
}

function parseHm(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}$/.test(t)) return t.length === 5 ? t : t;
  return t.slice(0, 5);
}

export async function GET(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId } = await ctx.params;
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const ev = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
    select: { id: true },
  });
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const rows = await prisma.eventCoachPlan.findMany({
    where: { eventId, teamId: teamGate.team.id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      coach: { include: { profiles_profiles_idTousers: { select: { displayName: true } } } },
    },
  });

  return NextResponse.json({
    plans: rows.map((r) => coachPlanRowToDto(r)),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId } = await ctx.params;
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canWriteCoachPlan(member.role)) {
    return NextResponse.json({ error: "forbidden", message: "코치·매니저만 세부 계획을 작성할 수 있습니다." }, { status: 403 });
  }

  const ev = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
    select: { id: true },
  });
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const content = typeof b.content === "string" ? b.content.trim() || null : null;
  if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });

  const team_wide_break = b.team_wide_break === true;
  const unit = parseCoachPlanUnit(b.unit) ?? "team";
  const role_title = typeof b.role_title === "string" ? b.role_title.trim() || null : null;
  const slot_start = parseHm(b.slot_start);
  const slot_end = parseHm(b.slot_end);
  const plan_status = parsePlanStatusCreate(b.plan_status);

  const maxSort = await prisma.eventCoachPlan.aggregate({
    where: { eventId, teamId: teamGate.team.id, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const metadata = mergeCoachPlanMetadata(
    {},
    {
      unit,
      role_title,
      slot_start,
      slot_end,
      plan_status: plan_status === "submitted" ? "submitted" : "draft",
      ...(team_wide_break ? { team_wide_break: true } : {}),
    },
  );

  const created = await prisma.eventCoachPlan.create({
    data: {
      teamId: teamGate.team.id,
      eventId,
      coachUserId: auth.userId,
      title,
      content,
      sortOrder,
      metadata,
    },
    include: {
      coach: { include: { profiles_profiles_idTousers: { select: { displayName: true } } } },
    },
  });

  return NextResponse.json({ plan: coachPlanRowToDto(created) }, { status: 201 });
}
