import { videoArchiveToDto } from "@/lib/mappers/videoArchiveToDto";
import { canWriteCoachPlan, getTeamMember, requireDemoCookie, requireTeamFromCode } from "@/lib/server/demoTeamApiAuth";
import { nextResponseForPrismaOrDbError } from "@/lib/server/prismaRouteError";
import { prisma } from "@/lib/prisma";
import { video_archive_source_type } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSourceType(v: unknown): video_archive_source_type | null {
  if (v === "YOUTUBE") return video_archive_source_type.YOUTUBE;
  if (v === "INTERNAL") return video_archive_source_type.INTERNAL;
  return null;
}

export async function GET(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const eventFilter = searchParams.get("eventId")?.trim() ?? "";
  if (eventFilter && !UUID_RE.test(eventFilter)) {
    return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });
  }
  const where = { teamId: teamGate.team.id, ...(eventFilter ? { eventId: eventFilter } : {}) };

  try {
    const rows = await prisma.videoArchive.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ archives: rows.map(videoArchiveToDto) });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}

export async function POST(req: Request) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canWriteCoachPlan(member.role)) {
    return NextResponse.json({ error: "forbidden", message: "코치·매니저만 영상을 등록할 수 있습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const sourceUrl = typeof b.sourceUrl === "string" ? b.sourceUrl.trim() : "";
  const sourceType = parseSourceType(b.sourceType);
  const eventIdRaw = typeof b.eventId === "string" ? b.eventId.trim() : "";
  const eventId = eventIdRaw && UUID_RE.test(eventIdRaw) ? eventIdRaw : null;

  if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });
  if (!sourceUrl) return NextResponse.json({ error: "missing_source_url" }, { status: 400 });
  if (!sourceType) return NextResponse.json({ error: "invalid_source_type" }, { status: 400 });

  if (eventId) {
    const ev = await prisma.event.findFirst({
      where: { id: eventId, teamId: teamGate.team.id, deletedAt: null },
      select: { id: true },
    });
    if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  try {
    const created = await prisma.videoArchive.create({
      data: {
        teamId: teamGate.team.id,
        eventId,
        title,
        sourceType,
        sourceUrl,
      },
    });
    return NextResponse.json({ archive: videoArchiveToDto(created) }, { status: 201 });
  } catch (e) {
    const mapped = nextResponseForPrismaOrDbError(e);
    if (mapped) return mapped;
    throw e;
  }
}
