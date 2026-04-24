-- Personal profile photo (mypage), separate from official roster avatar.
ALTER TABLE "core"."profiles" ADD COLUMN IF NOT EXISTS "personal_avatar_url" TEXT;
