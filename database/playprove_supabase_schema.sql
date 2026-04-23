-- =============================================================================
-- PlayProve — Supabase (PostgreSQL) 스키마
-- 규격: UUID PK, snake_case, 5대 공통 컬럼 + metadata JSONB
-- 실행: Supabase SQL Editor 또는 `supabase db push` 전 마이그레이션으로 분할 권장
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUM 타입 (시나리오 승인·상태 워크플로)
-- -----------------------------------------------------------------------------

CREATE TYPE public.join_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'withdrawn'
);

CREATE TYPE public.team_member_role AS ENUM (
  'manager',
  'head_coach',
  'part_coach',
  'player',
  'staff'
);

CREATE TYPE public.team_member_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'left'
);

CREATE TYPE public.player_roster_status AS ENUM (
  'active',
  'injured',
  'leave_absence',
  'military_leave',
  'tryout',
  'inactive'
);

CREATE TYPE public.event_type AS ENUM (
  'practice',
  'game',
  'meeting',
  'rehab'
);

CREATE TYPE public.event_status AS ENUM (
  'scheduled',
  'cancelled',
  'completed'
);

CREATE TYPE public.attendance_status AS ENUM (
  'attending',
  'absent',
  'undecided'
);

CREATE TYPE public.monthly_due_status AS ENUM (
  'unpaid',
  'paid',
  'waived',
  'partial'
);

CREATE TYPE public.injury_approval_status AS ENUM (
  'pending',
  'confirmed',
  'rejected'
);

CREATE TYPE public.injury_report_type AS ENUM (
  'player_self',
  'staff_report'
);

CREATE TYPE public.participation_level AS ENUM (
  'full',
  'limited',
  'out'
);

CREATE TYPE public.training_schedule_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'published',
  'archived'
);

CREATE TYPE public.training_block_type AS ENUM (
  'drill',
  'break',
  'meeting',
  'film',
  'warmup',
  'other'
);

CREATE TYPE public.training_block_intensity AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.training_column_unit AS ENUM (
  'team',
  'offense',
  'defense',
  'special'
);

CREATE TYPE public.iip_assignment_status AS ENUM (
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'expired'
);

CREATE TYPE public.practice_checkin_status AS ENUM (
  'draft',
  'submitted'
);

-- -----------------------------------------------------------------------------
-- 공통: 감사 컬럼용 참조 (Supabase auth.users)
-- created_by / updated_by 는 로그인 사용자 UUID. 서버 작업은 NULL 가능.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- teams
-- -----------------------------------------------------------------------------
CREATE TABLE public.teams (
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

CREATE INDEX idx_teams_deleted_at ON public.teams (deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- profiles (auth.users 1:1 확장)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
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

-- -----------------------------------------------------------------------------
-- players (로스터 엔티티 — attendance / dues / injury FK)
-- -----------------------------------------------------------------------------
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  jersey_number INT,
  primary_position TEXT,
  secondary_position TEXT,
  unit TEXT,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),
  join_year INT,
  roster_status public.player_roster_status NOT NULL DEFAULT 'active',
  notes TEXT
);

CREATE INDEX idx_players_team ON public.players (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_players_linked_user ON public.players (linked_user_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- team_members (승인 후 멤버십 — M-01)
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.team_member_role NOT NULL,
  status public.team_member_status NOT NULL DEFAULT 'pending',
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT team_members_team_user_unique UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members (team_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- join_requests (M-01)
-- -----------------------------------------------------------------------------
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  requested_role public.team_member_role NOT NULL,
  requested_position TEXT,
  requested_unit TEXT,
  jersey_number INT,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),
  message TEXT,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE INDEX idx_join_requests_team_status ON public.join_requests (team_id, status) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- events (M-02)
-- -----------------------------------------------------------------------------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type public.event_type NOT NULL DEFAULT 'practice',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  opponent TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status public.event_status NOT NULL DEFAULT 'scheduled'
);

CREATE INDEX idx_events_team_starts ON public.events (team_id, starts_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- attendance (M-02, P-01)
-- -----------------------------------------------------------------------------
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'undecided',
  absence_reason TEXT,
  last_changed_by_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_attendance_event_player ON public.attendance (event_id, player_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_attendance_team_event ON public.attendance (team_id, event_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- monthly_dues (M-03)
-- -----------------------------------------------------------------------------
CREATE TABLE public.monthly_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  due_month CHAR(7) NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status public.monthly_due_status NOT NULL DEFAULT 'unpaid',
  paid_at DATE,
  CONSTRAINT monthly_dues_month_chk CHECK (due_month ~ '^\d{4}-\d{2}$')
);

CREATE UNIQUE INDEX uq_monthly_dues_player_month ON public.monthly_dues (team_id, player_id, due_month)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- injury_reports (M-04, P-04)
-- -----------------------------------------------------------------------------
CREATE TABLE public.injury_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  report_type public.injury_report_type NOT NULL DEFAULT 'staff_report',
  body_part TEXT NOT NULL,
  pain_level INT NOT NULL CHECK (pain_level BETWEEN 1 AND 10),
  symptoms TEXT,
  participation_level public.participation_level NOT NULL DEFAULT 'limited',
  expected_return_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  approval_status public.injury_approval_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE INDEX idx_injury_team_approval ON public.injury_reports (team_id, approval_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_injury_player_active ON public.injury_reports (player_id, is_active) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- training_schedules (M-05, P-05)
-- -----------------------------------------------------------------------------
CREATE TABLE public.training_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  schedule_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  location TEXT,
  status public.training_schedule_status NOT NULL DEFAULT 'draft',
  coach_author_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT,
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_training_schedules_team_date ON public.training_schedules (team_id, schedule_date)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_training_schedules_status ON public.training_schedules (team_id, status) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- training_blocks (C-01, M-05, P-05)
-- -----------------------------------------------------------------------------
CREATE TABLE public.training_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_schedule_id UUID NOT NULL REFERENCES public.training_schedules (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  block_type public.training_block_type NOT NULL DEFAULT 'drill',
  column_unit public.training_column_unit NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  intensity public.training_block_intensity,
  position_focus TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  parent_block_id UUID REFERENCES public.training_blocks (id) ON DELETE SET NULL
);

CREATE INDEX idx_training_blocks_schedule ON public.training_blocks (training_schedule_id)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- drill_library (C-03 — iip_assignments 가 참조)
-- -----------------------------------------------------------------------------
CREATE TABLE public.drill_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID REFERENCES public.teams (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_xp INT NOT NULL DEFAULT 0,
  suggested_unit TEXT,
  suggested_positions TEXT[]
);

CREATE INDEX idx_drill_library_team ON public.drill_library (team_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- performance_scores (C-02 — iip_assignments.source_performance_score_id 가 참조)
-- -----------------------------------------------------------------------------
CREATE TABLE public.performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  source_event_id UUID REFERENCES public.events (id) ON DELETE SET NULL,
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

CREATE INDEX idx_performance_team_player ON public.performance_scores (team_id, player_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_performance_coach ON public.performance_scores (coach_user_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- iip_assignments (C-03, P-02 — 평가→과제 자동화 FK)
-- -----------------------------------------------------------------------------
CREATE TABLE public.iip_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  drill_library_id UUID REFERENCES public.drill_library (id) ON DELETE SET NULL,
  source_performance_score_id UUID REFERENCES public.performance_scores (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status public.iip_assignment_status NOT NULL DEFAULT 'assigned',
  xp_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completion_note TEXT
);

CREATE INDEX idx_iip_team_player_status ON public.iip_assignments (team_id, player_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_iip_source_performance ON public.iip_assignments (source_performance_score_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- condition_logs (P-03)
-- -----------------------------------------------------------------------------
CREATE TABLE public.condition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  logged_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  condition_score NUMERIC(4, 1) NOT NULL CHECK (condition_score >= 0 AND condition_score <= 10),
  energy_score NUMERIC(4, 1) NOT NULL CHECK (energy_score >= 0 AND energy_score <= 10),
  mental_score NUMERIC(4, 1) NOT NULL CHECK (mental_score >= 0 AND mental_score <= 10),
  sleep_hours NUMERIC(4, 1),
  notes TEXT
);

CREATE INDEX idx_condition_player_day ON public.condition_logs (player_id, logged_on) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- practice_checkins (C-04)
-- -----------------------------------------------------------------------------
CREATE TABLE public.practice_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  coach_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events (id) ON DELETE SET NULL,
  practice_date DATE NOT NULL,
  status public.practice_checkin_status NOT NULL DEFAULT 'draft',
  star_rating INT CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5)),
  effort_tag TEXT,
  coach_comment_one_liner TEXT
);

-- C-04: 동일 훈련 일정(event)당 선수 1건 제출 유니크 (event_id 없으면 앱에서 practice_date+team 단위로 중복 방지)
CREATE UNIQUE INDEX uq_practice_checkin_player_event ON public.practice_checkins (team_id, player_id, event_id)
  WHERE deleted_at IS NULL AND event_id IS NOT NULL AND status = 'submitted';

-- -----------------------------------------------------------------------------
-- updated_at 자동 갱신 트리거 (선택)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거를 모든 테이블에 붙이려면 반복 생성 — 운영에서는 마이그레이션 루프로 생성 권장
-- 예시: teams
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_team_members_updated_at BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_join_requests_updated_at BEFORE UPDATE ON public.join_requests
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_monthly_dues_updated_at BEFORE UPDATE ON public.monthly_dues
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_injury_reports_updated_at BEFORE UPDATE ON public.injury_reports
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_training_schedules_updated_at BEFORE UPDATE ON public.training_schedules
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_training_blocks_updated_at BEFORE UPDATE ON public.training_blocks
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_drill_library_updated_at BEFORE UPDATE ON public.drill_library
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_performance_scores_updated_at BEFORE UPDATE ON public.performance_scores
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_iip_assignments_updated_at BEFORE UPDATE ON public.iip_assignments
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_condition_logs_updated_at BEFORE UPDATE ON public.condition_logs
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_practice_checkins_updated_at BEFORE UPDATE ON public.practice_checkins
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- iip_assignments.source_performance_score_id → performance_scores.id 동일 player_id 인지는 DB 트리거 또는 앱에서 검증 권장

COMMENT ON TABLE public.iip_assignments IS 'source_performance_score_id 로 코치 평가와 과제를 정식 연결 (C-02 → C-03 자동화)';
COMMENT ON COLUMN public.injury_reports.confirmed_by IS 'M-04: 매니저 확정 시 user_id 기록 (시나리오 confirmed_by)';
COMMENT ON COLUMN public.training_schedules.approved_by IS 'M-05: 매니저 승인자';
COMMENT ON COLUMN public.performance_scores.keyword_tags IS 'C-02: 코멘트 기반 키워드 추출 결과 저장';
