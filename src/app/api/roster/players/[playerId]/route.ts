import { prisma } from "@/lib/prisma";
import { prismaPlayerToEntity } from "@/lib/mappers/prismaPlayerToEntity";
import { getTeamByRosterCode } from "@/lib/server/rosterTeamByCode";
import { Prisma, player_roster_status } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseRosterStatus(raw: string | undefined): player_roster_status {
  const v = (raw ?? "active").trim();
  const allowed: player_roster_status[] = [
    "active",
    "injured",
    "leave_absence",
    "military_leave",
    "tryout",
    "inactive",
  ];
  return (allowed.includes(v as player_roster_status) ? v : "active") as player_roster_status;
}

export async function GET(req: Request, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const team = await getTeamByRosterCode(searchParams.get("teamCode"));
  if (!team) {
    return NextResponse.json({ error: "missing_or_unknown_team" }, { status: 400 });
  }

  const row = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id, deletedAt: null },
    include: {
      users_players_linked_user_idTousers: {
        include: { profiles_profiles_idTousers: true },
      },
    },
  });

  if (!row) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  return NextResponse.json({ player: prismaPlayerToEntity(row) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const team = await getTeamByRosterCode(searchParams.get("teamCode"));
  if (!team) {
    return NextResponse.json({ error: "missing_or_unknown_team" }, { status: 400 });
  }

  const existing = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id, deletedAt: null },
    include: {
      users_players_linked_user_idTousers: {
        include: { profiles_profiles_idTousers: true },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
  const numOrNull = (v: unknown): number | null => {
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const jerseyNumber = numOrNull(body.jersey_number);
  const joinYear = numOrNull(body.join_year);
  const heightN = numOrNull(body.height_cm);
  const weightN = numOrNull(body.weight_kg);
  const heightCm = heightN === null ? null : new Prisma.Decimal(heightN);
  const weightKg = weightN === null ? null : new Prisma.Decimal(weightN);
  const unit = typeof body.unit === "string" ? body.unit.trim() : undefined;
  const primaryPosition = typeof body.primary_position === "string" ? body.primary_position.trim() : undefined;
  const secondaryPosition =
    body.secondary_position === null || body.secondary_position === ""
      ? null
      : typeof body.secondary_position === "string"
        ? body.secondary_position.trim()
        : undefined;
  const notes = body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined;
  const rosterStatus =
    "player_status" in body && typeof body.player_status === "string"
      ? parseRosterStatus(body.player_status)
      : undefined;

  const phone =
    "phone" in body && (body.phone === null || body.phone === "")
      ? null
      : typeof body.phone === "string"
        ? body.phone.trim()
        : undefined;

  const playerData: Prisma.PlayerUpdateInput = {};
  if (fullName !== undefined) playerData.fullName = fullName;
  if ("jersey_number" in body) playerData.jerseyNumber = jerseyNumber;
  if ("join_year" in body) playerData.joinYear = joinYear;
  if ("height_cm" in body) playerData.heightCm = heightCm;
  if ("weight_kg" in body) playerData.weightKg = weightKg;
  if (unit !== undefined) playerData.unit = unit;
  if (primaryPosition !== undefined) playerData.primaryPosition = primaryPosition;
  if (secondaryPosition !== undefined) playerData.secondaryPosition = secondaryPosition;
  if (notes !== undefined) playerData.notes = notes;
  if (rosterStatus !== undefined) playerData.rosterStatus = rosterStatus;

  const linkedId = existing.linkedUserId;

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: playerData,
    });
    if (linkedId && (phone !== undefined || fullName !== undefined)) {
      await tx.profile.update({
        where: { id: linkedId },
        data: {
          ...(phone !== undefined ? { phone } : {}),
          ...(fullName !== undefined ? { displayName: fullName } : {}),
        },
      });
    }
  });

  const row = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id, deletedAt: null },
    include: {
      users_players_linked_user_idTousers: {
        include: { profiles_profiles_idTousers: true },
      },
    },
  });

  return NextResponse.json({ player: row ? prismaPlayerToEntity(row) : null });
}
