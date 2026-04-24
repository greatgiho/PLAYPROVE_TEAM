import { prisma } from "@/lib/prisma";
import { prismaPlayerToEntity } from "@/lib/mappers/prismaPlayerToEntity";
import {
  prismaTeamMemberToRosterRow,
  sortTeamMembersForRoster,
} from "@/lib/mappers/prismaTeamMemberToRosterRow";
import { playerEntityToRosterRow } from "@/lib/mappers/playerEntityToRosterRow";
import { team_member_role } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ?teamCode=seoul_dragons_fc — 없으면 NEXT_PUBLIC_PLAYPROVE_TEAM_CODE, 그것도 없으면 400
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamCode =
    searchParams.get("teamCode")?.trim() ||
    process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ||
    "";

  if (!teamCode) {
    return NextResponse.json(
      { error: "missing_team_code", message: "teamCode 쿼리 또는 NEXT_PUBLIC_PLAYPROVE_TEAM_CODE 가 필요합니다." },
      { status: 400 },
    );
  }

  const team = await prisma.team.findFirst({
    where: { teamCode, deletedAt: null },
    select: { id: true, name: true, teamCode: true },
  });

  if (!team) {
    return NextResponse.json({ error: "team_not_found", teamCode }, { status: 404 });
  }

  const [playerRows, memberRows] = await Promise.all([
    prisma.player.findMany({
      where: { teamId: team.id, deletedAt: null },
      include: {
        users_players_linked_user_idTousers: {
          include: { profiles_profiles_idTousers: true },
        },
      },
    }),
    prisma.teamMember.findMany({
      where: {
        teamId: team.id,
        deletedAt: null,
        role: { in: [team_member_role.manager, team_member_role.head_coach, team_member_role.part_coach] },
      },
      include: {
        users_team_members_user_idTousers: {
          include: { profiles_profiles_idTousers: true },
        },
      },
    }),
  ]);

  const players = playerRows
    .map(prismaPlayerToEntity)
    .sort((a, b) => {
      const ja = a.jersey_number ?? 999;
      const jb = b.jersey_number ?? 999;
      if (ja !== jb) return ja - jb;
      return a.full_name.localeCompare(b.full_name, "ko");
    })
    .map(playerEntityToRosterRow);

  const staff = sortTeamMembersForRoster(memberRows).map(prismaTeamMemberToRosterRow);

  return NextResponse.json({
    team: { id: team.id, name: team.name, teamCode: team.teamCode },
    players,
    staff,
  });
}
