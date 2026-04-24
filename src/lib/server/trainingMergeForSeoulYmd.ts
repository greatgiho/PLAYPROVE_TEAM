import { readTrainingBlockSummaryFromMetadata } from "@/lib/mappers/trainingBlockMetadata";
import type { TrainingBlockMergeDto, TrainingMergePayload } from "@/lib/types/trainingMerge";
import { seoulHmFromIso, utcDateFromYmd } from "@/lib/team/eventLocalDate";
import { prisma } from "@/lib/prisma";

/**
 * 팀 + 서울 달력(YYYY-MM-DD) 기준으로 레거시 training_schedules / training_blocks 를 DTO로 로드합니다.
 * (Event 와의 FK 없음 — 일정 `startsAt`의 서울 날짜로만 매칭)
 */
export async function trainingMergeForSeoulYmd(teamId: string, ymd: string): Promise<TrainingMergePayload> {
  const scheduleDate = utcDateFromYmd(ymd);
  if (!scheduleDate) {
    return { event_date_seoul: ymd, schedules: [], training_blocks: [] };
  }

  const schedules = await prisma.trainingSchedule.findMany({
    where: {
      teamId,
      deletedAt: null,
      scheduleDate,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, location: true },
  });

  if (schedules.length === 0) {
    return { event_date_seoul: ymd, schedules: [], training_blocks: [] };
  }

  const scheduleIds = schedules.map((s) => s.id);
  const titleById = new Map(schedules.map((s) => [s.id, s.title]));

  const blocks = await prisma.trainingBlock.findMany({
    where: {
      trainingScheduleId: { in: scheduleIds },
      deletedAt: null,
    },
    orderBy: [{ trainingScheduleId: "asc" }, { startsAt: "asc" }],
    include: {
      users_training_blocks_coach_user_idTousers: {
        include: { profiles_profiles_idTousers: { select: { displayName: true } } },
      },
    },
  });

  const training_blocks: TrainingBlockMergeDto[] = blocks.map((b) => {
    const u = b.users_training_blocks_coach_user_idTousers;
    const name = u.profiles_profiles_idTousers?.displayName?.trim() || u.email || "(이름 없음)";
    const startIso = b.startsAt.toISOString();
    const endIso = b.endsAt.toISOString();
    return {
      id: b.id,
      source: "training_block",
      training_schedule_id: b.trainingScheduleId,
      schedule_title: titleById.get(b.trainingScheduleId) ?? "",
      title: b.title,
      block_type: b.blockType,
      unit: b.columnUnit,
      starts_at: startIso,
      ends_at: endIso,
      slot_start: seoulHmFromIso(startIso),
      slot_end: seoulHmFromIso(endIso),
      coach_name: name,
      intensity: b.intensity ?? null,
      position_focus: b.positionFocus?.trim() || null,
      summary: readTrainingBlockSummaryFromMetadata(b.metadata),
    };
  });

  return {
    event_date_seoul: ymd,
    schedules: schedules.map((s) => ({ id: s.id, title: s.title, location: s.location?.trim() || null })),
    training_blocks,
  };
}
