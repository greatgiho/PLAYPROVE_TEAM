import { prisma } from "@/lib/prisma";
import { getTeamByRosterCode } from "@/lib/server/rosterTeamByCode";
import { team_member_role } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function roleKo(role: team_member_role): string {
  switch (role) {
    case "manager":
      return "매니저";
    case "head_coach":
      return "헤드코치";
    case "part_coach":
      return "코치";
    default:
      return String(role);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ teamMemberId: string }> }) {
  const { teamMemberId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const team = await getTeamByRosterCode(searchParams.get("teamCode"));
  if (!team) return NextResponse.json({ error: "missing_or_unknown_team" }, { status: 400 });

  const tm = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      teamId: team.id,
      deletedAt: null,
      role: { in: [team_member_role.manager, team_member_role.head_coach, team_member_role.part_coach] },
    },
    include: {
      users_team_members_user_idTousers: {
        include: { profiles_profiles_idTousers: true },
      },
    },
  });
  if (!tm) return NextResponse.json({ error: "staff_not_found" }, { status: 404 });

  const u = tm.users_team_members_user_idTousers;
  const profile = u.profiles_profiles_idTousers;
  const meta = tm.metadata && typeof tm.metadata === "object" && !Array.isArray(tm.metadata) ? tm.metadata : {};
  const seedTitle = typeof (meta as Record<string, unknown>).seed_title === "string" ? (meta as { seed_title: string }).seed_title : "";

  return NextResponse.json({
    kind: "staff" as const,
    team: { id: team.id, name: team.name, teamCode: team.teamCode },
    staff: {
      id: tm.id,
      full_name: profile?.displayName?.trim() || u.email || "(이름 없음)",
      phone: profile?.phone ?? null,
      email: u.email ?? null,
      role: tm.role,
      roleLabel: roleKo(tm.role),
      title: seedTitle || roleKo(tm.role),
      memberStatus: tm.status,
      joinedAt: tm.joinedAt?.toISOString() ?? null,
    },
    metrics: {
      attendance: null,
      dues: null,
      note: "코칭스태프는 선수 단위 출석·회비 지표가 없습니다.",
    },
  });
}
