import { requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { trainingMergeForSeoulYmd } from "@/lib/server/trainingMergeForSeoulYmd";
import { seoulYmdFromIso } from "@/lib/team/eventLocalDate";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    select: { id: true, title: true, startsAt: true },
  });
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const ymd = seoulYmdFromIso(ev.startsAt.toISOString());
  const payload = await trainingMergeForSeoulYmd(teamGate.team.id, ymd);
  return NextResponse.json(payload);
}
