import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { getTeamByRosterCode } from "@/lib/server/rosterTeamByCode";
import { prisma } from "@/lib/prisma";
import { team_member_role } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type DemoAuthFail = { ok: false; response: NextResponse };
export type DemoAuthOk = { ok: true; userId: string };
export type DemoAuth = DemoAuthOk | DemoAuthFail;

export async function requireDemoCookie(): Promise<DemoAuth> {
  const uid = (await cookies()).get("pp_demo_uid")?.value?.trim() ?? "";
  if (!uid || !isAllowedAppUserId(uid)) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: uid };
}

export async function requireTeamFromCode(teamCode: string | null) {
  const team = await getTeamByRosterCode(teamCode);
  if (!team) {
    return { ok: false as const, response: NextResponse.json({ error: "team_not_found" }, { status: 404 }) };
  }
  return { ok: true as const, team };
}

export async function getTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.findFirst({
    where: { teamId, userId, deletedAt: null },
    select: { id: true, role: true, playerId: true },
  });
}

export async function requireTeamManager(teamId: string, userId: string): Promise<DemoAuthFail | { ok: true }> {
  const row = await prisma.teamMember.findFirst({
    where: { teamId, userId, deletedAt: null, role: team_member_role.manager },
    select: { id: true },
  });
  if (!row) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "forbidden", message: "매니저만 팀 일정(훈련·세미나)을 생성·수정·삭제할 수 있습니다." },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}

/** 코치 계획 작성: 매니저·헤드·파트 코치 */
export function canWriteCoachPlan(role: team_member_role | null): boolean {
  if (!role) return false;
  return role === team_member_role.manager || role === team_member_role.head_coach || role === team_member_role.part_coach;
}

/** 세부 계획 컨펌/반려: 감독(헤드코치) 또는 매니저 */
export function canConfirmCoachPlans(role: team_member_role | null): boolean {
  if (!role) return false;
  return role === team_member_role.manager || role === team_member_role.head_coach;
}

/** 출결 변경: 매니저·코치 전원, 또는 선수 본인만 */
export function canEditAttendance(
  role: team_member_role | null,
  opts: { targetPlayerId: string; memberPlayerId: string | null },
): boolean {
  if (role === team_member_role.manager || role === team_member_role.head_coach || role === team_member_role.part_coach) {
    return true;
  }
  if (role === team_member_role.player && opts.memberPlayerId && opts.memberPlayerId === opts.targetPlayerId) {
    return true;
  }
  return false;
}
