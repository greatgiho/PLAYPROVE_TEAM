import { canFinalizeVideoReview, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asObject(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function PATCH(req: Request, ctx: { params: Promise<{ archiveId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;
  const { archiveId } = await ctx.params;
  if (!UUID_RE.test(archiveId)) return NextResponse.json({ error: "invalid_archive_id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canFinalizeVideoReview(member.role)) {
    return NextResponse.json({ error: "forbidden", message: "매니저·헤드코치만 스탯을 최종 승인할 수 있습니다." }, { status: 403 });
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

  try {
    const targets = await prisma.performanceScore.findMany({
      where: { teamId: teamGate.team.id, videoArchiveId: archiveId, playerId, deletedAt: null },
      select: { id: true, metadata: true },
    });
    if (targets.length === 0) return NextResponse.json({ error: "stats_not_found" }, { status: 404 });
    const approvedAt = new Date().toISOString();
    await prisma.$transaction(
      targets.map((row) =>
        prisma.performanceScore.update({
          where: { id: row.id },
          data: {
            metadata: {
              ...asObject(row.metadata),
              videoReviewApproved: true,
              videoReviewApprovedAt: approvedAt,
              videoReviewApprovedBy: auth.userId,
            },
          },
        }),
      ),
    );
    return NextResponse.json({ ok: true, approvedCount: targets.length, approvedAt });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
