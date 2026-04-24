import { resolveTeamMemberStaffTitle } from "@/lib/mappers/prismaTeamMemberToRosterRow";
import { getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 훈련계획 작성 화면: team_members.metadata.seed_title 기반 공식 직함 힌트
 */
export async function GET(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const row = await getTeamMember(teamGate.team.id, auth.userId);
  if (!row) {
    return NextResponse.json({ error: "forbidden", message: "팀 멤버가 아닙니다." }, { status: 403 });
  }

  const full = await prisma.teamMember.findFirst({
    where: { id: row.id, deletedAt: null },
    select: { metadata: true, role: true },
  });
  if (!full) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const staff_title = resolveTeamMemberStaffTitle(full.metadata, full.role);

  return NextResponse.json({
    team_role: full.role,
    staff_title,
    /** 직함 선택 UI에 맞춰 미리 채울 값 (목록에 없으면 기타 입력용) */
    role_title_hint: staff_title,
  });
}
