# PlayProve 데이터 ERD

**기준 소스:** `prisma/schema.prisma` + `prisma/migrations/*.sql` (실제 Postgres/Supabase DDL).  
삭제된 일괄 덤프 대신, 필요한 DDL 은 마이그레이션 폴더와 `database/training_event_coach_plans.sql` 등에 둡니다.  
`auth.users` 는 Supabase 인증(외부 스키마)입니다.

## 전체 관계 (Mermaid `erDiagram`)

```mermaid
erDiagram
  AUTH_USERS {
    uuid id PK
  }

  teams {
    uuid id PK
    text team_code UK
    int season_year
    uuid owner_user_id FK
  }

  profiles {
    uuid id PK
    text display_name
  }

  players {
    uuid id PK
    uuid team_id FK
    uuid linked_user_id FK
    text full_name
  }

  team_members {
    uuid id PK
    uuid team_id FK
    uuid user_id FK
    uuid player_id FK
    text role
    text status
  }

  join_requests {
    uuid id PK
    uuid team_id FK
    uuid user_id FK
    text status
  }

  events {
    uuid id PK
    uuid team_id FK
    timestamptz starts_at
  }

  event_coach_plans {
    uuid id PK
    uuid team_id FK
    uuid event_id FK
    uuid coach_user_id FK
    text title
    text content
  }

  attendance {
    uuid id PK
    uuid team_id FK
    uuid event_id FK
    uuid player_id FK
    text status
  }

  monthly_dues {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    text due_month
    text status
  }

  injury_reports {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    text approval_status
    text report_type
  }

  training_schedules {
    uuid id PK
    uuid team_id FK
    date schedule_date
    text status
    uuid coach_author_id FK
    uuid approved_by FK
  }

  training_blocks {
    uuid id PK
    uuid training_schedule_id FK
    uuid coach_user_id FK
    uuid parent_block_id FK
  }

  drill_library {
    uuid id PK
    uuid team_id FK
    text name
  }

  performance_scores {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    uuid coach_user_id FK
    uuid source_event_id FK
  }

  iip_assignments {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    uuid coach_user_id FK
    uuid drill_library_id FK
    uuid source_performance_score_id FK
  }

  condition_logs {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    date logged_on
  }

  practice_checkins {
    uuid id PK
    uuid team_id FK
    uuid player_id FK
    uuid event_id FK
    date practice_date
  }

  AUTH_USERS ||--o| profiles : "id"
  AUTH_USERS ||--o{ team_members : "user_id"
  AUTH_USERS ||--o{ join_requests : "user_id"
  AUTH_USERS ||--o{ players : "linked_user_id"
  AUTH_USERS ||--o{ teams : "owner_user_id"
  AUTH_USERS ||--o{ training_schedules : "coach_author_id"
  AUTH_USERS ||--o{ training_schedules : "approved_by"
  AUTH_USERS ||--o{ training_blocks : "coach_user_id"
  AUTH_USERS ||--o{ performance_scores : "coach_user_id"
  AUTH_USERS ||--o{ iip_assignments : "coach_user_id"
  AUTH_USERS ||--o{ practice_checkins : "coach_user_id"
  AUTH_USERS ||--o{ event_coach_plans : "coach_user_id"

  teams ||--o{ players : "team_id"
  teams ||--o{ team_members : "team_id"
  teams ||--o{ join_requests : "team_id"
  teams ||--o{ events : "team_id"
  teams ||--o{ event_coach_plans : "team_id"
  teams ||--o{ attendance : "team_id"
  teams ||--o{ monthly_dues : "team_id"
  teams ||--o{ injury_reports : "team_id"
  teams ||--o{ training_schedules : "team_id"
  teams ||--o{ drill_library : "team_id"
  teams ||--o{ performance_scores : "team_id"
  teams ||--o{ iip_assignments : "team_id"
  teams ||--o{ condition_logs : "team_id"
  teams ||--o{ practice_checkins : "team_id"

  players ||--o{ team_members : "player_id"
  players ||--o{ attendance : "player_id"
  players ||--o{ monthly_dues : "player_id"
  players ||--o{ injury_reports : "player_id"
  players ||--o{ performance_scores : "player_id"
  players ||--o{ iip_assignments : "player_id"
  players ||--o{ condition_logs : "player_id"
  players ||--o{ practice_checkins : "player_id"

  events ||--o{ attendance : "event_id"
  events ||--o{ event_coach_plans : "event_id"
  events ||--o{ performance_scores : "source_event_id"
  events ||--o{ practice_checkins : "event_id"

  training_schedules ||--o{ training_blocks : "training_schedule_id"
  training_blocks ||--o{ training_blocks : "parent_block_id"

  drill_library ||--o{ iip_assignments : "drill_library_id"
  performance_scores ||--o{ iip_assignments : "source_performance_score_id"
```

> **참고:** `training_schedules` → `AUTH_USERS` 는 `coach_author_id`, `approved_by` 두 엣지로 표현했습니다. Mermaid는 동일 쌍에 라벨만 다르게 두 번 그릴 수 없어, 실제 DB는 컬럼명으로 구분됩니다.

### 공통 컬럼 (모든 `public.*` 테이블)

각 테이블에 실제로 존재: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `metadata` (ERD 박스에는 생략).

## 영역별 묶음

```mermaid
flowchart TB
  subgraph TENANT["테넌트·계정"]
    T[teams]
    P[profiles]
    AU[auth.users]
    AU --- P
    T --- AU
  end

  subgraph MEMBER["멤버십·가입 M-01"]
    JR[join_requests]
    TM[team_members]
    PL[players]
    T --> JR
    T --> TM
    T --> PL
    TM --> PL
  end

  subgraph OPS["운영 M-02·M-03·M-04"]
    EV[events]
    ECP[event_coach_plans]
    AT[attendance]
    MD[monthly_dues]
    INJ[injury_reports]
    T --> EV
    T --> ECP
    EV --> ECP
    T --> AT
    T --> MD
    T --> INJ
    EV --> AT
    PL --> AT
    PL --> MD
    PL --> INJ
  end

  subgraph COACH["훈련·코칭 M-05 C-01 C-02 C-03 C-04"]
    TS[training_schedules]
    TB[training_blocks]
    DL[drill_library]
    PS[performance_scores]
    IIP[iip_assignments]
    PC[practice_checkins]
    T --> TS
    TS --> TB
    TB --> TB
    T --> DL
    T --> PS
    PL --> PS
    EV --> PS
    DL --> IIP
    PS --> IIP
    PL --> IIP
    PL --> PC
    EV --> PC
    T --> PC
  end

  subgraph WELL["웰니스 P-03"]
    CL[condition_logs]
    T --> CL
    PL --> CL
  end
```

## 영역 표

| 영역 | 테이블 |
|------|--------|
| 테넌트·계정 | `teams`, `profiles` + `auth.users` |
| 멤버십·가입 | `join_requests`, `team_members`, `players` |
| 운영 | `events`, `event_coach_plans`, `attendance`, `monthly_dues`, `injury_reports` |
| 훈련 | `training_schedules`, `training_blocks` |
| 코칭·자동화 | `drill_library`, `performance_scores`, `iip_assignments` |
| 즉시평가 | `practice_checkins` |
| 컨디션 | `condition_logs` |
