-- Staff / coach extended profile on core.profiles (Supabase core schema)
ALTER TABLE "core"."profiles" ADD COLUMN IF NOT EXISTS "academic_major" TEXT;
ALTER TABLE "core"."profiles" ADD COLUMN IF NOT EXISTS "staff_responsibilities" TEXT;
ALTER TABLE "core"."profiles" ADD COLUMN IF NOT EXISTS "coaching_career_notes" TEXT;
ALTER TABLE "core"."profiles" ADD COLUMN IF NOT EXISTS "coaching_unit" TEXT;
