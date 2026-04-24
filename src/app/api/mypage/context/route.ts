import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { getPlayproveTeamCode } from "@/lib/config";
import {
  coachHeroSummary,
  staffDbSections,
  staffResponsibilityBlocks,
} from "@/lib/mypage/staffResponsibilities";
import type { MypageStaffContext, MypageStaffDbProfile } from "@/lib/types/mypageStaffContext";
import { normalizeTeamRole } from "@/lib/types/roles";
import { prisma } from "@/lib/prisma";
import { join_request_status, player_roster_status, team_member_role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE = "pp_demo_uid";
const MAX_SHORT = 512;
const MAX_LONG = 8000;

function readSeedTitle(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const st = (meta as Record<string, unknown>).seed_title;
  return typeof st === "string" && st.trim() ? st.trim() : null;
}

function optStringField(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t.slice(0, max);
}

export async function GET() {
  const uid = (await cookies()).get(COOKIE)?.value?.trim() ?? "";
  if (!uid || !isAllowedAppUserId(uid)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const teamCode = getPlayproveTeamCode();
  if (!teamCode) {
    return NextResponse.json({ error: "team_code_not_configured" }, { status: 503 });
  }

  const team = await prisma.team.findFirst({
    where: { teamCode, deletedAt: null },
    select: { id: true, name: true, teamCode: true },
  });
  if (!team) {
    return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  }

  const [profile, member] = await Promise.all([
    prisma.profile.findFirst({
      where: { id: uid, deletedAt: null },
      select: {
        displayName: true,
        avatarUrl: true,
        personalAvatarUrl: true,
        phone: true,
        metadata: true,
        academicMajor: true,
        staffResponsibilities: true,
        coachingCareerNotes: true,
        coachingUnit: true,
      },
    }),
    prisma.teamMember.findFirst({
      where: { teamId: team.id, userId: uid, deletedAt: null },
      select: { role: true, joinedAt: true, metadata: true },
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "no_team_membership" }, { status: 404 });
  }

  if (member.role === team_member_role.player) {
    return NextResponse.json({ error: "use_player_flow" }, { status: 400 });
  }

  const staffTitle = readSeedTitle(member.metadata) ?? readSeedTitle(profile?.metadata ?? null);
  const teamRole = normalizeTeamRole(member.role);

  const dbProfile: MypageStaffDbProfile = {
    academicMajor: profile?.academicMajor ?? null,
    staffResponsibilities: profile?.staffResponsibilities ?? null,
    coachingCareerNotes: profile?.coachingCareerNotes ?? null,
    coachingUnit: profile?.coachingUnit ?? null,
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activePlayers,
    injuredPlayers,
    coachCount,
    pendingJoins,
    eventsThisMonth,
    unitGroups,
  ] = await Promise.all([
    prisma.player.count({
      where: { teamId: team.id, deletedAt: null, rosterStatus: player_roster_status.active },
    }),
    prisma.player.count({
      where: { teamId: team.id, deletedAt: null, rosterStatus: player_roster_status.injured },
    }),
    prisma.teamMember.count({
      where: {
        teamId: team.id,
        deletedAt: null,
        role: { in: [team_member_role.head_coach, team_member_role.part_coach] },
      },
    }),
    prisma.joinRequest.count({
      where: { teamId: team.id, deletedAt: null, status: join_request_status.pending },
    }),
    prisma.event.count({
      where: { teamId: team.id, deletedAt: null, startsAt: { gte: monthStart } },
    }),
    prisma.player.groupBy({
      by: ["unit"],
      where: { teamId: team.id, deletedAt: null, rosterStatus: player_roster_status.active },
      _count: { _all: true },
    }),
  ]);

  const unitSummary = unitGroups
    .filter((g) => g.unit)
    .map((g) => `${(g.unit ?? "").toUpperCase()} ${g._count._all}명`)
    .join(" · ");

  const stats: { label: string; value: string }[] = [];
  if (teamRole === "manager") {
    stats.push({ label: "활동 선수", value: `${activePlayers}명` });
    stats.push({ label: "부상/케어", value: `${injuredPlayers}명` });
    stats.push({ label: "코칭스태프", value: `${coachCount}명` });
    stats.push({ label: "가입 대기", value: `${pendingJoins}건` });
    stats.push({ label: "이번 달 일정", value: `${eventsThisMonth}건` });
  } else {
    stats.push({ label: "활동 선수", value: `${activePlayers}명` });
    stats.push({ label: "유닛 분포", value: unitSummary || "—" });
    stats.push({ label: "이번 달 일정", value: `${eventsThisMonth}건` });
    stats.push({ label: "코칭스태프", value: `${coachCount}명` });
  }

  const body: MypageStaffContext = {
    userId: uid,
    displayName: profile?.displayName ?? null,
    phone: profile?.phone ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    personalAvatarUrl: profile?.personalAvatarUrl ?? null,
    teamRole,
    teamName: team.name,
    teamCode: team.teamCode,
    staffTitle,
    joinedAtIso: member.joinedAt?.toISOString() ?? null,
    coachFocusSummary: coachHeroSummary(teamRole, staffTitle, dbProfile),
    dbProfile,
    sectionsDb: staffDbSections(teamRole, dbProfile),
    sectionsGuide: staffResponsibilityBlocks(teamRole, staffTitle),
    stats,
  };

  return NextResponse.json(body);
}

export async function PATCH(req: Request) {
  const uid = (await cookies()).get(COOKIE)?.value?.trim() ?? "";
  if (!uid || !isAllowedAppUserId(uid)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const b = raw as Record<string, unknown>;

  const academicMajor = optStringField(b.academicMajor, MAX_SHORT);
  const staffResponsibilities = optStringField(b.staffResponsibilities, MAX_LONG);
  const coachingCareerNotes = optStringField(b.coachingCareerNotes, MAX_LONG);
  const coachingUnit = optStringField(b.coachingUnit, MAX_SHORT);

  if (
    academicMajor === undefined &&
    staffResponsibilities === undefined &&
    coachingCareerNotes === undefined &&
    coachingUnit === undefined
  ) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const data: Prisma.ProfileUpdateInput = {};
  if (academicMajor !== undefined) data.academicMajor = academicMajor;
  if (staffResponsibilities !== undefined) data.staffResponsibilities = staffResponsibilities;
  if (coachingCareerNotes !== undefined) data.coachingCareerNotes = coachingCareerNotes;
  if (coachingUnit !== undefined) data.coachingUnit = coachingUnit;

  try {
    await prisma.profile.update({
      where: { id: uid },
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("Unknown arg")) {
      return NextResponse.json(
        { error: "schema_out_of_date", message: "profiles 에 스태프 컬럼이 없습니다. 마이그레이션을 적용해 주세요." },
        { status: 503 },
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
