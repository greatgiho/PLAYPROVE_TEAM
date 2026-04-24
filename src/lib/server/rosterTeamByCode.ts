import { getPlayproveTeamCode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function getTeamByRosterCode(teamCodeParam: string | null) {
  const code = teamCodeParam?.trim() || getPlayproveTeamCode();
  if (!code) return null;
  return prisma.team.findFirst({
    where: { teamCode: code, deletedAt: null },
    select: { id: true, teamCode: true, name: true },
  });
}
