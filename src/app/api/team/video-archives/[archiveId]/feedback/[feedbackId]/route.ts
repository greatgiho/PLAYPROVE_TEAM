import { canFinalizeVideoReview, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(req: Request, ctx: { params: Promise<{ archiveId: string; feedbackId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { archiveId, feedbackId } = await ctx.params;
  if (!UUID_RE.test(archiveId) || !UUID_RE.test(feedbackId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canFinalizeVideoReview(member.role)) {
    return NextResponse.json(
      { error: "forbidden", message: "매니저·헤드코치만 피드백을 삭제할 수 있습니다." },
      { status: 403 },
    );
  }

  try {
    const row = await prisma.videoFeedback.findFirst({
      where: { id: feedbackId, videoArchiveId: archiveId },
      include: { videoArchive: { select: { teamId: true } } },
    });
    if (!row || row.videoArchive.teamId !== teamGate.team.id) {
      return NextResponse.json({ error: "feedback_not_found" }, { status: 404 });
    }
    await prisma.videoFeedback.delete({ where: { id: feedbackId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
