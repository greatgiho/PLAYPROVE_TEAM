import { computeVideoPerformanceAggregate, videoPerformanceScoreToDto } from "@/lib/mappers/videoArchiveToDto";
import { canWriteCoachPlan, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function numScore(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0 || v > 10) return null;
  return Number(v.toFixed(1));
}

export async function GET(req: Request, ctx: { params: Promise<{ archiveId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;
  const { archiveId } = await ctx.params;
  if (!UUID_RE.test(archiveId)) return NextResponse.json({ error: "invalid_archive_id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;
  const playerId = searchParams.get("playerId")?.trim() || null;
  if (playerId && !UUID_RE.test(playerId)) return NextResponse.json({ error: "invalid_player_id" }, { status: 400 });

  try {
    const rows = await prisma.performanceScore.findMany({
      where: {
        teamId: teamGate.team.id,
        videoArchiveId: archiveId,
        deletedAt: null,
        ...(playerId ? { playerId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        player: { select: { fullName: true } },
        users_performance_scores_coach_user_idTousers: {
          include: { profiles_profiles_idTousers: { select: { displayName: true } } },
        },
      },
    });
    const items = rows.map(videoPerformanceScoreToDto);
    const aggregateByPlayer = Array.from(
      items.reduce((acc, row) => {
        const list = acc.get(row.playerId) ?? [];
        list.push(row);
        acc.set(row.playerId, list);
        return acc;
      }, new Map<string, typeof items>()),
    )
      .map(([, list]) => computeVideoPerformanceAggregate(list))
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
    return NextResponse.json({ items, aggregateByPlayer });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ archiveId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;
  const { archiveId } = await ctx.params;
  if (!UUID_RE.test(archiveId)) return NextResponse.json({ error: "invalid_archive_id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canWriteCoachPlan(member.role)) {
    return NextResponse.json({ error: "forbidden", message: "코치·매니저만 스탯을 입력할 수 있습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const playerId = typeof b.playerId === "string" ? b.playerId.trim() : "";
  if (!UUID_RE.test(playerId)) return NextResponse.json({ error: "invalid_player_id" }, { status: 400 });
  const physical = numScore(b.physical);
  const skill = numScore(b.skill);
  const tactical = numScore(b.tactical);
  const attendanceMetric = numScore(b.attendanceMetric);
  const mental = numScore(b.mental);
  if (physical == null || skill == null || tactical == null || attendanceMetric == null || mental == null) {
    return NextResponse.json({ error: "invalid_score_range", message: "각 스코어는 0~10 범위 숫자여야 합니다." }, { status: 400 });
  }
  const coachComment = typeof b.coachComment === "string" ? b.coachComment.trim() || null : null;

  const [archive, player] = await Promise.all([
    prisma.videoArchive.findFirst({ where: { id: archiveId, teamId: teamGate.team.id }, select: { id: true } }),
    prisma.player.findFirst({ where: { id: playerId, teamId: teamGate.team.id, deletedAt: null }, select: { id: true } }),
  ]);
  if (!archive) return NextResponse.json({ error: "archive_not_found" }, { status: 404 });
  if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  try {
    const created = await prisma.performanceScore.create({
      data: {
        teamId: teamGate.team.id,
        playerId,
        coachUserId: auth.userId,
        videoArchiveId: archiveId,
        evaluatedOn: new Date(),
        physical,
        skill,
        tactical,
        attendanceMetric,
        mental,
        coachComment,
        metadata: { source: "video_review", sourceArchiveId: archiveId },
      },
      include: {
        player: { select: { fullName: true } },
        users_performance_scores_coach_user_idTousers: {
          include: { profiles_profiles_idTousers: { select: { displayName: true } } },
        },
      },
    });
    return NextResponse.json({ item: videoPerformanceScoreToDto(created) }, { status: 201 });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
