import { videoArchiveToDto, videoFeedbackToDto } from "@/lib/mappers/videoArchiveToDto";
import { requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ archiveId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { archiveId } = await ctx.params;
  if (!archiveId || !UUID_RE.test(archiveId)) {
    return NextResponse.json({ error: "invalid_archive_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  try {
    const [archive, feedbackRows] = await Promise.all([
      prisma.videoArchive.findFirst({
        where: { id: archiveId, teamId: teamGate.team.id },
      }),
      prisma.videoFeedback.findMany({
        where: { videoArchiveId: archiveId },
        orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }],
        include: {
          author: { include: { profiles_profiles_idTousers: { select: { displayName: true, avatarUrl: true } } } },
          taggedPlayer: { select: { fullName: true } },
        },
      }),
    ]);

    if (!archive) return NextResponse.json({ error: "archive_not_found" }, { status: 404 });

    return NextResponse.json({
      archive: videoArchiveToDto(archive),
      feedbacks: feedbackRows.map(videoFeedbackToDto),
    });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
