import {
  canEditCoachPlanEvent,
  COACH_PLAN_EDIT_LOCKED_MESSAGE,
} from "@/lib/team/coachPlanEditWindow";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function requireCoachPlanEventEditable(
  eventId: string,
  teamId: string,
): Promise<{ ok: true; startsAt: Date } | { ok: false; response: NextResponse }> {
  const ev = await prisma.event.findFirst({
    where: { id: eventId, teamId, deletedAt: null },
    select: { startsAt: true },
  });
  if (!ev) {
    return { ok: false, response: NextResponse.json({ error: "event_not_found" }, { status: 404 }) };
  }
  if (!canEditCoachPlanEvent(ev.startsAt)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "edit_window_closed", message: COACH_PLAN_EDIT_LOCKED_MESSAGE },
        { status: 403 },
      ),
    };
  }
  return { ok: true, startsAt: ev.startsAt };
}
