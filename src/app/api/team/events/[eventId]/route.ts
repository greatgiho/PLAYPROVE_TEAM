import { prismaEventToDto } from "@/lib/mappers/prismaEventToDto";
import { requireDemoCookie, requireTeamFromCode, requireTeamManager } from "@/lib/server/demoTeamApiAuth";
import { buildEventMetadataPatch, type SessionKind } from "@/lib/team/eventMetadata";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { event_type } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId } = await ctx.params;
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const mgr = await requireTeamManager(teamGate.team.id, auth.userId);
  if (!mgr.ok) return mgr.response;

  const existing = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim() : undefined;
  const startsAt =
    typeof b.starts_at === "string" && b.starts_at ? new Date(b.starts_at) : undefined;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "invalid_starts_at" }, { status: 400 });
  }
  const endsAt =
    typeof b.ends_at === "string" && b.ends_at ? new Date(b.ends_at) : b.ends_at === null ? null : undefined;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "invalid_ends_at" }, { status: 400 });
  }
  const location = typeof b.location === "string" ? b.location.trim() || null : undefined;
  const notes = typeof b.notes === "string" ? b.notes.trim() || null : undefined;
  const isMandatory = typeof b.is_mandatory === "boolean" ? b.is_mandatory : undefined;

  let sessionKind: SessionKind | undefined;
  if (b.session_kind === "training" || b.session_kind === "seminar") sessionKind = b.session_kind;
  const seminarSubtype =
    typeof b.seminar_subtype === "string" ? b.seminar_subtype.trim() || null : b.seminar_subtype === null ? null : undefined;

  let metadata: Prisma.InputJsonValue = existing.metadata as Prisma.InputJsonValue;
  if (sessionKind !== undefined || seminarSubtype !== undefined) {
    const base =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    const sk =
      sessionKind ?? (existing.eventType === "meeting" ? "seminar" : ("training" as const));
    const st = sk === "seminar" ? (seminarSubtype ?? (base.seminar_subtype as string) ?? "other") : null;
    const metaPatch = buildEventMetadataPatch({ sessionKind: sk, seminarSubtype: st }) as Record<string, unknown>;
    metadata = { ...base, ...metaPatch } as Prisma.InputJsonValue;
  }

  const nextEventType =
    sessionKind === "seminar"
      ? event_type.meeting
      : sessionKind === "training"
        ? event_type.practice
        : existing.eventType;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(startsAt !== undefined ? { startsAt } : {}),
      ...(endsAt !== undefined ? { endsAt } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(isMandatory !== undefined ? { isMandatory } : {}),
      ...(sessionKind !== undefined ? { eventType: nextEventType } : {}),
      ...(sessionKind !== undefined || seminarSubtype !== undefined ? { metadata } : {}),
      updatedBy: auth.userId,
    },
  });

  return NextResponse.json({ event: prismaEventToDto(updated) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId } = await ctx.params;
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const mgr = await requireTeamManager(teamGate.team.id, auth.userId);
  if (!mgr.ok) return mgr.response;

  const existing = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date(), updatedBy: auth.userId },
  });

  return NextResponse.json({ ok: true });
}
