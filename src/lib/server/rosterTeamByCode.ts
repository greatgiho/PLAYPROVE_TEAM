import { prisma } from "@/lib/prisma";

export async function getTeamByRosterCode(teamCodeParam: string | null) {
  const code =
    teamCodeParam?.trim() ||
    process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ||
    "";
  if (!code) return null;
  return prisma.team.findFirst({
    where: { teamCode: code, deletedAt: null },
    select: { id: true, teamCode: true, name: true },
  });
}
