import { canEditAttendance, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { prisma } from "@/lib/prisma";
import { attendance_status } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const eventId = searchParams.get("eventId")?.trim() ?? "";
  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }

  const ev = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
    select: { id: true },
  });
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const players = await prisma.player.findMany({
    where: { teamId: teamGate.team.id, deletedAt: null },
    orderBy: [{ jerseyNumber: "asc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, primaryPosition: true, rosterStatus: true },
  });

  const attRows = await prisma.attendance.findMany({
    where: { teamId: teamGate.team.id, eventId, deletedAt: null },
  });
  const byPlayer = new Map(attRows.map((a) => [a.playerId, a]));

  return NextResponse.json({
    rows: players.map((p) => {
      const a = byPlayer.get(p.id);
      return {
        player_id: p.id,
        player_name: p.fullName,
        primary_position: p.primaryPosition,
        player_status: p.rosterStatus,
        attendance_id: a?.id ?? null,
        status: a?.status ?? attendance_status.undecided,
        absence_reason: a?.absenceReason ?? null,
      };
    }),
  });
}

export async function PATCH(req: Request) {
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
  const b = body as Record<string, unknown>;
  const eventId = typeof b.event_id === "string" ? b.event_id : "";
  const playerId = typeof b.player_id === "string" ? b.player_id : "";
  const statusRaw = typeof b.status === "string" ? b.status : "";
  if (!UUID_RE.test(eventId) || !UUID_RE.test(playerId)) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const st =
    statusRaw === "attending" || statusRaw === "absent" || statusRaw === "undecided"
      ? (statusRaw as "attending" | "absent" | "undecided")
      : null;
  if (!st) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  const absenceReason = typeof b.absence_reason === "string" ? b.absence_reason.trim() || null : null;

  const ev = await prisma.event.findFirst({
    where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
    select: { id: true },
  });
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const player = await prisma.player.findFirst({
    where: { id: playerId, teamId: teamGate.team.id, deletedAt: null },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member?.role) {
    return NextResponse.json({ error: "forbidden", message: "팀 멤버가 아닙니다." }, { status: 403 });
  }

  if (
    !canEditAttendance(member.role, {
      targetPlayerId: playerId,
      memberPlayerId: member.playerId,
    })
  ) {
    return NextResponse.json({ error: "forbidden", message: "본인 출결만 수정할 수 있습니다." }, { status: 403 });
  }

  const existing = await prisma.attendance.findFirst({
    where: { teamId: teamGate.team.id, eventId, playerId, deletedAt: null },
  });

  const data = {
    status: st as attendance_status,
    absenceReason: st === "absent" ? absenceReason : null,
    lastChangedByUserId: auth.userId,
    updatedBy: auth.userId,
  };

  if (existing) {
    const saved = await prisma.attendance.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json({
      row: {
        player_id: playerId,
        attendance_id: saved.id,
        status: saved.status,
        absence_reason: saved.absenceReason,
      },
    });
  }

  const created = await prisma.attendance.create({
    data: {
      teamId: teamGate.team.id,
      eventId,
      playerId,
      status: st as attendance_status,
      absenceReason: st === "absent" ? absenceReason : null,
      lastChangedByUserId: auth.userId,
      createdBy: auth.userId,
      updatedBy: auth.userId,
    },
  });

  return NextResponse.json({
    row: {
      player_id: playerId,
      attendance_id: created.id,
      status: created.status,
      absence_reason: created.absenceReason,
    },
  });
}
