-- =============================================================================
-- PlayProve — 모듈식 스키마 (Supabase / PostgreSQL)
-- 스키마: core | training | development | management
-- 규격: UUID PK, snake_case, 5대 공통 컬럼 + metadata JSONB
-- FK: 스키마 간 참조는 전부 한정된 이름으로 명시 (예: training.attendance → core.players)
--
-- Prisma 다중 스키마:
--   1) prisma/schema.prisma 의 datasource 에 schemas = [...] + generator previewFeatures = ["multiSchema"]
--   2) 각 model 에 @@schema("core") 등 지정
--   3) npx prisma db pull / migrate 시 DATABASE_URL 동일
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS training;
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS management;

-- Supabase API가 새 스키마를 쓰려면 권한 부여(운영 시 RLS로 세분화)
GRANT USAGE ON SCHEMA core TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA training TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA development TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA management TO postgres, anon, authenticated, service_role;

-- 테이블 생성 후 하단에서 GRANT 재실행 (또는 마이그레이션 마지막 스텝)

-- =============================================================================
-- ENUM (스키마별 소유 — 모듈 경계 명확화)
-- =============================================================================

-- core
CREATE TYPE core.join_request_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
CREATE TYPE core.team_member_role AS ENUM ('manager', 'head_coach', 'part_coach', 'player', 'staff');
CREATE TYPE core.team_member_status AS ENUM ('pending', 'active', 'suspended', 'left');
CREATE TYPE core.player_roster_status AS ENUM (
  'active', 'injured', 'leave_absence', 'military_leave', 'tryout', 'inactive'
);

-- training
CREATE TYPE training.event_type AS ENUM ('practice', 'game', 'meeting', 'rehab');
CREATE TYPE training.event_status AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE training.attendance_status AS ENUM ('attending', 'absent', 'undecided');
CREATE TYPE training.training_schedule_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected', 'published', 'archived'
);
CREATE TYPE training.training_block_type AS ENUM ('drill', 'break', 'meeting', 'film', 'warmup', 'other');
CREATE TYPE training.training_block_intensity AS ENUM ('low', 'medium', 'high');
CREATE TYPE training.training_column_unit AS ENUM ('team', 'offense', 'defense', 'special');
CREATE TYPE training.practice_checkin_status AS ENUM ('draft', 'submitted');

-- development
CREATE TYPE development.iip_assignment_status AS ENUM (
  'assigned', 'in_progress', 'completed', 'cancelled', 'expired'
);

-- management
CREATE TYPE management.monthly_due_status AS ENUM ('unpaid', 'paid', 'waived', 'partial');
CREATE TYPE management.injury_approval_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE management.injury_report_type AS ENUM ('player_self', 'staff_report');
CREATE TYPE management.participation_level AS ENUM ('full', 'limited', 'out');

-- =============================================================================
-- 공용 트리거 함수 (public 유지 — 모든 스키마 테이블에서 호출)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playprove_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CORE: 팀, 프로필, 로스터, 멤버십, 가입 신청
-- =============================================================================

CREATE TABLE core.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  name TEXT NOT NULL,
  team_code TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'american_football',
  city TEXT,
  season_year INT NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT teams_team_code_key UNIQUE (team_code)
);

CREATE TABLE core.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_name TEXT,
  phone TEXT,
  birth_year INT,
  avatar_url TEXT
);

CREATE TABLE core.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  jersey_number INT,
  primary_position TEXT,
  secondary_position TEXT,
  unit TEXT,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),
  join_year INT,
  roster_status core.player_roster_status NOT NULL DEFAULT 'active',
  notes TEXT
);

CREATE TABLE core.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role core.team_member_role NOT NULL,
  status core.team_member_status NOT NULL DEFAULT 'pending',
  player_id UUID REFERENCES core.players (id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT team_members_team_user_unique UNIQUE (team_id, user_id)
);

CREATE TABLE core.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  requested_role core.team_member_role NOT NULL,
  requested_position TEXT,
  requested_unit TEXT,
  jersey_number INT,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),
  message TEXT,
  status core.join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE INDEX idx_core_players_team ON core.players (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_core_team_members_team ON core.team_members (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_core_join_requests_team_status ON core.join_requests (team_id, status) WHERE deleted_at IS NULL;

-- =============================================================================
-- TRAINING: 일정, 출석, 훈련 계획·블록, 즉시평가(훈련 맥락)
-- =============================================================================

CREATE TABLE training.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type training.event_type NOT NULL DEFAULT 'practice',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  opponent TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status training.event_status NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE training.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES training.events (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  status training.attendance_status NOT NULL DEFAULT 'undecided',
  absence_reason TEXT,
  last_changed_by_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE training.training_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  schedule_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  location TEXT,
  status training.training_schedule_status NOT NULL DEFAULT 'draft',
  coach_author_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT,
  published_at TIMESTAMPTZ
);

CREATE TABLE training.training_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_schedule_id UUID NOT NULL REFERENCES training.training_schedules (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  block_type training.training_block_type NOT NULL DEFAULT 'drill',
  column_unit training.training_column_unit NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  intensity training.training_block_intensity,
  position_focus TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  parent_block_id UUID REFERENCES training.training_blocks (id) ON DELETE SET NULL
);

CREATE TABLE training.practice_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  coach_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  event_id UUID REFERENCES training.events (id) ON DELETE SET NULL,
  practice_date DATE NOT NULL,
  status training.practice_checkin_status NOT NULL DEFAULT 'draft',
  star_rating INT CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5)),
  effort_tag TEXT,
  coach_comment_one_liner TEXT
);

CREATE INDEX idx_training_events_team ON training.events (team_id, starts_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_training_attendance_event_player ON training.attendance (event_id, player_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_training_attendance_team_event ON training.attendance (team_id, event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_training_schedules_team_date ON training.training_schedules (team_id, schedule_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_training_blocks_schedule ON training.training_blocks (training_schedule_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_training_practice_checkin_player_event ON training.practice_checkins (team_id, player_id, event_id)
  WHERE deleted_at IS NULL AND event_id IS NOT NULL AND status = 'submitted';

-- =============================================================================
-- DEVELOPMENT: 평가, 드릴 라이브러리, IIP (평가→과제 FK)
-- =============================================================================

CREATE TABLE development.drill_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID REFERENCES core.teams (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_xp INT NOT NULL DEFAULT 0,
  suggested_unit TEXT,
  suggested_positions TEXT[]
);

CREATE TABLE development.performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  source_event_id UUID REFERENCES training.events (id) ON DELETE SET NULL,
  evaluated_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  physical NUMERIC(4, 1) NOT NULL CHECK (physical >= 0 AND physical <= 10),
  skill NUMERIC(4, 1) NOT NULL CHECK (skill >= 0 AND skill <= 10),
  tactical NUMERIC(4, 1) NOT NULL CHECK (tactical >= 0 AND tactical <= 10),
  attendance_metric NUMERIC(4, 1) NOT NULL CHECK (attendance_metric >= 0 AND attendance_metric <= 10),
  mental NUMERIC(4, 1) NOT NULL CHECK (mental >= 0 AND mental <= 10),
  coach_comment TEXT,
  keyword_tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  is_visible_to_player BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE development.iip_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  drill_library_id UUID REFERENCES development.drill_library (id) ON DELETE SET NULL,
  source_performance_score_id UUID REFERENCES development.performance_scores (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status development.iip_assignment_status NOT NULL DEFAULT 'assigned',
  xp_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completion_note TEXT
);

CREATE INDEX idx_development_drill_team ON development.drill_library (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_development_performance_team_player ON development.performance_scores (team_id, player_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_development_iip_team_player ON development.iip_assignments (team_id, player_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_development_iip_source_perf ON development.iip_assignments (source_performance_score_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE development.iip_assignments IS 'source_performance_score_id: development.performance_scores → 선수 과제 자동 연결';
COMMENT ON COLUMN development.performance_scores.source_event_id IS 'FK → training.events (훈련/경기 맥락)';

-- =============================================================================
-- MANAGEMENT: 부상, 컨디션, 회비
-- =============================================================================

CREATE TABLE management.injury_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  report_type management.injury_report_type NOT NULL DEFAULT 'staff_report',
  body_part TEXT NOT NULL,
  pain_level INT NOT NULL CHECK (pain_level BETWEEN 1 AND 10),
  symptoms TEXT,
  participation_level management.participation_level NOT NULL DEFAULT 'limited',
  expected_return_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  approval_status management.injury_approval_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE TABLE management.condition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  condition_score NUMERIC(4, 1) NOT NULL CHECK (condition_score >= 0 AND condition_score <= 10),
  energy_score NUMERIC(4, 1) NOT NULL CHECK (energy_score >= 0 AND energy_score <= 10),
  mental_score NUMERIC(4, 1) NOT NULL CHECK (mental_score >= 0 AND mental_score <= 10),
  sleep_hours NUMERIC(4, 1),
  notes TEXT
);

CREATE TABLE management.monthly_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES core.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES core.players (id) ON DELETE CASCADE,
  due_month CHAR(7) NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status management.monthly_due_status NOT NULL DEFAULT 'unpaid',
  paid_at DATE,
  CONSTRAINT management_monthly_dues_month_chk CHECK (due_month ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_management_injury_team ON management.injury_reports (team_id, approval_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_management_condition_player ON management.condition_logs (player_id, logged_on) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_management_monthly_dues_player_month ON management.monthly_dues (team_id, player_id, due_month)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- updated_at 트리거 (모든 테이블)
-- =============================================================================

CREATE TRIGGER trg_core_teams_updated BEFORE UPDATE ON core.teams
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_core_profiles_updated BEFORE UPDATE ON core.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_core_players_updated BEFORE UPDATE ON core.players
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_core_team_members_updated BEFORE UPDATE ON core.team_members
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_core_join_requests_updated BEFORE UPDATE ON core.join_requests
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();

CREATE TRIGGER trg_training_events_updated BEFORE UPDATE ON training.events
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_training_attendance_updated BEFORE UPDATE ON training.attendance
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_training_schedules_updated BEFORE UPDATE ON training.training_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_training_blocks_updated BEFORE UPDATE ON training.training_blocks
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_training_practice_checkins_updated BEFORE UPDATE ON training.practice_checkins
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();

CREATE TRIGGER trg_development_drill_updated BEFORE UPDATE ON development.drill_library
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_development_performance_updated BEFORE UPDATE ON development.performance_scores
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_development_iip_updated BEFORE UPDATE ON development.iip_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();

CREATE TRIGGER trg_management_injury_updated BEFORE UPDATE ON management.injury_reports
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_management_condition_updated BEFORE UPDATE ON management.condition_logs
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();
CREATE TRIGGER trg_management_monthly_dues_updated BEFORE UPDATE ON management.monthly_dues
  FOR EACH ROW EXECUTE PROCEDURE public.playprove_set_updated_at();

-- =============================================================================
-- 권한 (테이블 생성 이후)
-- Supabase Dashboard → Settings → API → "Exposed schemas" 에 core, training, development, management 추가
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA core TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA training TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA development TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA management TO postgres, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA training TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA development TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA management TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA core GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA training GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA development GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA management GRANT ALL ON TABLES TO postgres, service_role;
