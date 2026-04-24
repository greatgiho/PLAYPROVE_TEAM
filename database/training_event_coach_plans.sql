-- =============================================================================
-- training.event_coach_plans (코치 세부 계획)
-- Prisma 마이그레이션 `prisma/migrations/20260425120000_event_coach_plans`
--   와 동일한 DDL 입니다.
--
-- Supabase: Dashboard → SQL Editor 에서 한 번 실행하면 Postgres 에 반영됩니다.
-- 로컬/CI: 보통은 `npx prisma migrate deploy` 만 하면 되고, 이 파일은
--   "SQL만으로 맞추고 싶을 때" 용도입니다.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "training"."event_coach_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "team_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "coach_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "event_coach_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "event_coach_plans_event_id_idx" ON "training"."event_coach_plans"("event_id");
CREATE INDEX IF NOT EXISTS "event_coach_plans_coach_user_id_idx" ON "training"."event_coach_plans"("coach_user_id");

DO $$
BEGIN
  ALTER TABLE "training"."event_coach_plans"
    ADD CONSTRAINT "event_coach_plans_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "training"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."event_coach_plans"
    ADD CONSTRAINT "event_coach_plans_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "core"."teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."event_coach_plans"
    ADD CONSTRAINT "event_coach_plans_coach_user_id_fkey"
    FOREIGN KEY ("coach_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
