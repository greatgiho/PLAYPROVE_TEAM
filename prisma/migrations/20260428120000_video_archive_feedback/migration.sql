-- Video archive + per-timestamp feedback (training); optional link from development.performance_scores
CREATE TYPE "training"."video_archive_source_type" AS ENUM ('YOUTUBE', 'INTERNAL');

CREATE TABLE IF NOT EXISTS "training"."video_archives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "team_id" UUID NOT NULL,
    "event_id" UUID,
    "title" TEXT NOT NULL,
    "source_type" "training"."video_archive_source_type" NOT NULL,
    "source_url" TEXT NOT NULL,
    CONSTRAINT "video_archives_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "video_archives_team_id_idx" ON "training"."video_archives"("team_id");
CREATE INDEX IF NOT EXISTS "video_archives_event_id_idx" ON "training"."video_archives"("event_id");

CREATE TABLE IF NOT EXISTS "training"."video_feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_archive_id" UUID NOT NULL,
    "timestamp_seconds" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "author_user_id" UUID NOT NULL,
    "tagged_player_id" UUID,
    CONSTRAINT "video_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "video_feedbacks_video_archive_id_idx" ON "training"."video_feedbacks"("video_archive_id");
CREATE INDEX IF NOT EXISTS "video_feedbacks_author_user_id_idx" ON "training"."video_feedbacks"("author_user_id");

DO $$
BEGIN
  ALTER TABLE "training"."video_archives"
    ADD CONSTRAINT "video_archives_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "core"."teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."video_archives"
    ADD CONSTRAINT "video_archives_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "training"."events"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."video_feedbacks"
    ADD CONSTRAINT "video_feedbacks_video_archive_id_fkey"
    FOREIGN KEY ("video_archive_id") REFERENCES "training"."video_archives"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."video_feedbacks"
    ADD CONSTRAINT "video_feedbacks_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "training"."video_feedbacks"
    ADD CONSTRAINT "video_feedbacks_tagged_player_id_fkey"
    FOREIGN KEY ("tagged_player_id") REFERENCES "core"."players"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "development"."performance_scores" ADD COLUMN IF NOT EXISTS "video_archive_id" UUID;

CREATE INDEX IF NOT EXISTS "performance_scores_video_archive_id_idx" ON "development"."performance_scores"("video_archive_id");

DO $$
BEGIN
  ALTER TABLE "development"."performance_scores"
    ADD CONSTRAINT "performance_scores_video_archive_id_fkey"
    FOREIGN KEY ("video_archive_id") REFERENCES "training"."video_archives"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
