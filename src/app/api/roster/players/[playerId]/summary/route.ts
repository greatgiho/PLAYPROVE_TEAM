import { prisma } from "@/lib/prisma";
import { prismaPlayerToEntity } from "@/lib/mappers/prismaPlayerToEntity";
import { getTeamByRosterCode } from "@/lib/server/rosterTeamByCode";
import { attendance_status, monthly_due_status } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function yearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

export async function GET(req: Request, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const team = await getTeamByRosterCode(searchParams.get("teamCode"));
  if (!team) return NextResponse.json({ error: "missing_or_unknown_team" }, { status: 400 });

  const row = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id, deletedAt: null },
    include: {
      users_players_linked_user_idTousers: {
        include: { profiles_profiles_idTousers: true },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const since = yearAgo();
  const attWhere = {
    teamId: team.id,
    playerId,
    deletedAt: null as null,
    event: { startsAt: { gte: since }, deletedAt: null },
  };

  const [attendanceTotal, attendanceAttending] = await Promise.all([
    prisma.attendance.count({ where: attWhere }),
    prisma.attendance.count({
      where: { ...attWhere, status: attendance_status.attending },
    }),
  ]);

  const attendanceRatePercent =
    attendanceTotal > 0 ? Math.round((100 * attendanceAttending) / attendanceTotal) : null;

  const duesRows = await prisma.monthlyDue.findMany({
    where: { teamId: team.id, playerId, deletedAt: null },
    select: { status: true },
  });
  const duesTotal = duesRows.length;
  const duesPaid = duesRows.filter((d) => d.status === monthly_due_status.paid).length;
  const duesRatePercent = duesTotal > 0 ? Math.round((100 * duesPaid) / duesTotal) : null;

  const activeInjuryCount = await prisma.injuryReport.count({
    where: { teamId: team.id, playerId, deletedAt: null, isActive: true },
  });

  return NextResponse.json({
    kind: "player" as const,
    team: { id: team.id, name: team.name, teamCode: team.teamCode },
    player: prismaPlayerToEntity(row),
    metrics: {
      attendance: {
        ratePercent: attendanceRatePercent,
        attended: attendanceAttending,
        total: attendanceTotal,
        note: "최근 12개월 일정 중 출석 기록이 있는 행 기준 (참석/전체)",
      },
      dues: {
        ratePercent: duesRatePercent,
        paid: duesPaid,
        total: duesTotal,
        note: "등록된 월별 회비 행 중 상태가 납부완료인 비율",
      },
      injury: { activeCount: activeInjuryCount },
    },
  });
}
