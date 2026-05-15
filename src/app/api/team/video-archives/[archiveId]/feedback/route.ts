import { videoFeedbackToDto } from "@/lib/mappers/videoArchiveToDto";
import { canWriteCoachPlan, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ archiveId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { archiveId } = await ctx.params;
  if (!archiveId || !UUID_RE.test(archiveId)) {
    return NextResponse.json({ error: "invalid_archive_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canWriteCoachPlan(member.role)) {
    return NextResponse.json({ error: "forbidden", message: "코치·매니저만 피드백을 작성할 수 있습니다." }, { status: 403 });
  }

  const arch = await prisma.videoArchive.findFirst({
    where: { id: archiveId, teamId: teamGate.team.id },
    select: { id: true },
  });
  if (!arch) return NextResponse.json({ error: "archive_not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const content = typeof b.content === "string" ? b.content.trim() : "";
  const ts = typeof b.timestampSeconds === "number" ? b.timestampSeconds : Number.NaN;
  const taggedRaw = b.taggedPlayerId;
  const taggedPlayerId =
    typeof taggedRaw === "string" && UUID_RE.test(taggedRaw) ? taggedRaw : null;

  if (!content) return NextResponse.json({ error: "missing_content" }, { status: 400 });
  if (!Number.isFinite(ts) || ts < 0 || !Number.isInteger(ts)) {
    return NextResponse.json({ error: "invalid_timestamp_seconds" }, { status: 400 });
  }

  if (taggedPlayerId) {
    const pl = await prisma.player.findFirst({
      where: { id: taggedPlayerId, teamId: teamGate.team.id, deletedAt: null },
      select: { id: true },
    });
    if (!pl) return NextResponse.json({ error: "tagged_player_not_found" }, { status: 400 });
  }

  try {
    const created = await prisma.videoFeedback.create({
      data: {
        videoArchiveId: archiveId,
        timestampSeconds: ts,
        content,
        authorUserId: auth.userId,
        taggedPlayerId,
      },
      include: {
        author: { include: { profiles_profiles_idTousers: { select: { displayName: true, avatarUrl: true } } } },
        taggedPlayer: { select: { fullName: true } },
      },
    });
    return NextResponse.json({ feedback: videoFeedbackToDto(created) }, { status: 201 });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
