import type {
  training_block_intensity,
  training_block_type,
  training_column_unit,
} from "@prisma/client";

/** GET …/training-merge · POST …/training-merge-batch 공통 — 레거시 TrainingBlock 요약 */
export type TrainingBlockMergeDto = {
  id: string;
  source: "training_block";
  training_schedule_id: string;
  schedule_title: string;
  title: string;
  block_type: training_block_type;
  unit: training_column_unit;
  starts_at: string;
  ends_at: string;
  slot_start: string;
  slot_end: string;
  coach_name: string;
  intensity: training_block_intensity | null;
  position_focus: string | null;
  /** metadata.summary / notes 등 */
  summary: string | null;
};

/** GET 단건 / POST 배치 `by_event[id]` 공통 페이로드 */
export type TrainingScheduleMergeDto = {
  id: string;
  title: string;
  location: string | null;
};

export type TrainingMergePayload = {
  event_date_seoul: string;
  schedules: TrainingScheduleMergeDto[];
  training_blocks: TrainingBlockMergeDto[];
};
