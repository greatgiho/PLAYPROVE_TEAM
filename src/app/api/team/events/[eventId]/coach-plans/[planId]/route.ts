import { coachPlanRowToDto } from "@/lib/mappers/prismaEventToDto";
import {
  canConfirmCoachPlans,
  canWriteCoachPlan,
  getTeamMember,
  requireDemoCookie,
  requireTeamFromCode,
  requireTeamManager,
} from "@/lib/server/demoTeamApiAuth";
import { mergeCoachPlanMetadata, parseCoachPlanMetadata, parseCoachPlanUnit } from "@/lib/team/coachPlanMetadata";
import type { CoachPlanMetadata, CoachPlanStatus } from "@/lib/team/coachPlanMetadata";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseHm(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, 8);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ eventId: string; planId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId, planId } = await ctx.params;
  if (!UUID_RE.test(eventId) || !UUID_RE.test(planId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const plan = await prisma.eventCoachPlan.findFirst({
    where: { id: planId, eventId, teamId: teamGate.team.id, deletedAt: null },
  });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  const mgr = await requireTeamManager(teamGate.team.id, auth.userId);
  const isManager = mgr.ok;
  const isAuthor = plan.coachUserId === auth.userId;
  const canEditBody = isManager || isAuthor;
  if (!member?.role) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isManager && !isAuthor && !canWriteCoachPlan(member.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : undefined;
  const content = typeof b.content === "string" ? b.content.trim() || null : b.content === null ? null : undefined;

  if (title !== undefined && !canEditBody) {
    return NextResponse.json({ error: "forbidden", message: "제목은 작성자·매니저만 수정할 수 있습니다." }, { status: 403 });
  }
  if (content !== undefined && !canEditBody) {
    return NextResponse.json({ error: "forbidden", message: "내용은 작성자·매니저만 수정할 수 있습니다." }, { status: 403 });
  }

  const cur = parseCoachPlanMetadata(plan.metadata);
  const metaPatch: CoachPlanMetadata = {};

  if (b.unit !== undefined) {
    if (!canEditBody) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const u = parseCoachPlanUnit(b.unit);
    if (u) metaPatch.unit = u;
  }
  if (b.role_title !== undefined) {
    if (!canEditBody) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    metaPatch.role_title = typeof b.role_title === "string" ? b.role_title.trim() || null : null;
  }
  const ss = parseHm(b.slot_start);
  const se = parseHm(b.slot_end);
  if (b.slot_start !== undefined) {
    if (!canEditBody) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    metaPatch.slot_start = ss ?? null;
  }
  if (b.slot_end !== undefined) {
    if (!canEditBody) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    metaPatch.slot_end = se ?? null;
  }
  if (b.team_wide_break !== undefined) {
    if (!canEditBody) {
      return NextResponse.json({ error: "forbidden", message: "전체 휴식 플래그는 작성자·매니저만 바꿀 수 있습니다." }, { status: 403 });
    }
    metaPatch.team_wide_break = b.team_wide_break === true;
  }

  if (b.plan_status !== undefined) {
    const ns = b.plan_status as string;
    if (ns === "draft" || ns === "submitted") {
      if (!isAuthor && !isManager) {
        return NextResponse.json(
          { error: "forbidden", message: "초안·제출 상태는 작성자 본인 또는 매니저만 변경할 수 있습니다." },
          { status: 403 },
        );
      }
      metaPatch.plan_status = ns as CoachPlanStatus;
      if (ns === "draft") {
        metaPatch.confirmed_at = null;
        metaPatch.confirmed_by = null;
      }
    } else if (ns === "confirmed" || ns === "rejected") {
      if (!canConfirmCoachPlans(member.role)) {
        return NextResponse.json(
          { error: "forbidden", message: "컨펌·반려는 감독(헤드코치) 또는 매니저만 할 수 있습니다." },
          { status: 403 },
        );
      }
      if (cur.plan_status !== "submitted") {
        return NextResponse.json(
          { error: "invalid_transition", message: "제출(submitted)된 계획만 컨펌·반려할 수 있습니다." },
          { status: 400 },
        );
      }
      metaPatch.plan_status = ns as CoachPlanStatus;
      if (ns === "confirmed") {
        metaPatch.confirmed_at = new Date().toISOString();
        metaPatch.confirmed_by = auth.userId;
      } else {
        metaPatch.confirmed_at = null;
        metaPatch.confirmed_by = null;
      }
    } else {
      return NextResponse.json({ error: "invalid_plan_status" }, { status: 400 });
    }
  }

  const hasMetaPatch = Object.keys(metaPatch).length > 0;
  const newMetadata = hasMetaPatch ? mergeCoachPlanMetadata(plan.metadata, metaPatch) : undefined;

  const updated = await prisma.eventCoachPlan.update({
    where: { id: planId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
    },
    include: {
      coach: { include: { profiles_profiles_idTousers: { select: { displayName: true } } } },
    },
  });

  return NextResponse.json({ plan: coachPlanRowToDto(updated) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ eventId: string; planId: string }> }) {
  const auth = await requireDemoCookie();
  if (!auth.ok) return auth.response;

  const { eventId, planId } = await ctx.params;
  if (!UUID_RE.test(eventId) || !UUID_RE.test(planId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const teamGate = await requireTeamFromCode(searchParams.get("teamCode"));
  if (!teamGate.ok) return teamGate.response;

  const plan = await prisma.eventCoachPlan.findFirst({
    where: { id: planId, eventId, teamId: teamGate.team.id, deletedAt: null },
  });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const mgr = await requireTeamManager(teamGate.team.id, auth.userId);
  if (mgr.ok) {
    await prisma.eventCoachPlan.update({ where: { id: planId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  const member = await getTeamMember(teamGate.team.id, auth.userId);
  if (!member || !canWriteCoachPlan(member.role) || plan.coachUserId !== auth.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.eventCoachPlan.update({ where: { id: planId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
