# 훈련 계획: 레거시 ERP → 개선 DB 기반 구현 계획

## 1. 레거시 화면 기준점 (`js/training_plan.js`)

레거시 **훈련 타임테이블 / 훈련계획 작성**은 다음 구조로 동작한다.

| 영역 | 레거시 UX | 데이터 개념 |
|------|-----------|-------------|
| MANAGEMENT · 훈련 계획 | 날짜 피커, 훈련일 탭, **5분 격자 그리드** (TIME × TEAM/OFFENSE/DEFENSE/SPECIAL) | `training_schedules` (일자·장소·헤드코치 등) + `training_blocks` (컬럼·시간·타입·코치) |
| COACHING · 훈련계획 작성 | 훈련일 선택 후 **내 블록**을 컬럼별 카드로 나열, 블록 추가/수정 모달 | 동일 `training_blocks` (다중 컬럼·브레이크 등 클라이언트 규칙 포함) |
| 블록 타입 | `TP.BLOCK_TYPES` (워밍업, 드릴, 스크리미지, 브레이크 등) | DB `training_block_type` |
| 컬럼 | `TP.COLS` (team / offense / defense / special) | DB `training_column_unit` |

즉, **캘린더 날짜 → training_schedule 1..N → training_block 다수**가 레거시의 단일 진실이었다.

## 2. 개선된(현재) 데이터베이스 모델

| 모델 | 스키마 | 역할 |
|------|--------|------|
| `Event` | `training.events` | 팀 일정의 **앵커**(시작 시각, 종류, 장소, 출결·체크인과 연결) |
| `EventCoachPlan` | `training.event_coach_plans` | 일정(Event)에 매달린 **코치 세부 계획 카드**. `metadata` JSON에 유닛·직함·슬롯·상태 등 확장 필드 |
| `TrainingSchedule` / `TrainingBlock` | 기존과 동일 | ERP 타임테이블; **Event와 FK 없음** (서울 달력 `schedule_date` ↔ `Event.startsAt`의 서울 날짜로만 조인) |
| `TeamMember` | `team_members` | 공식 직함(`metadata.seed_title` 등) — 코치 계획 직함 UI와 동기 |

**설계 의도**: 출결·일정·권한은 `Event` 중심으로 통일하고, 레거시 타임테이블은 **점진 이관**·**병합 표시**로 공존한다.

### 목표 제품 흐름 (단일 그림으로 이해하기)

1. **매니저**가 **출결 관리**에서 팀 일정(`Event`)을 만들고 **확정**한다.  
2. 그 **확정 일정**이 코치 화면(**훈련계획 작성**, `/app/coach_plan`)의 작성 대상으로 이어진다.  
3. **코치**들이 해당 Event에 `event_coach_plans`를 채워 넣고(유닛·시간·직함·내용 등) 제출한다.  
4. **감독·매니저**가 컨펌하면, **훈련 계획표**(`/app/practice_plan`)에서 일정별로 카드가 **취합**되고, TEAM / OFFENSE / DEFENSE / SPECIAL **네 파트**로 읽히는 것이 곧 첨부 ERP의 **4열 타임테이블**에 해당한다.

**데이터 축 정리**: 장기적으로 “그리드에 올라가는 본문”은 **취합된 `EventCoachPlan`**이고, `training_schedules` / `training_blocks`는 **이행·참고**용으로 같은 서울 날짜에 맞춰 겹쳐 보여 줄 수 있는 보조 축이다.

## 3. 현재까지 구현된 것 (요약)

- **훈련계획 작성 / 훈련 계획표** Next 페이지: `Event` + `event_coach_plans` CRUD, HC/매니저 컨펌.
- **훈련 계획표(집계)**: 코치 카드만 **시간(행) × 파트(열)** 격자(`CoachPlanTimetableGrid`)에 배치. `metadata.team_wide_break` 인 카드는 **전폭 휴식 행**. 참고 리듬 문구: 50분 훈련 · 10분 전체 휴식(상수, DB 강제 아님).
- **직함 시드**: `GET /api/team/me/coach-context` → `team_members` 기반 `role_title_hint`로 작성 폼 초기화.
- **레거시 DTO(보조)**: `training-merge-batch`·`TrainingTimetableGrid`·`trainingMergeForSeoulYmd` 는 **참고·다른 화면**용으로 코드베이스에 남음(집계 보드에서는 미사용).

## 4. 이후 구현 계획 (권장 순서)

### 4.1 병합 정확도 (선택·중기)

- **같은 날 다중 Event**: 지금은 동일 날짜의 레거시 스케줄을 모든 Event에 동일 반환. 필요 시 `events` ↔ `training_schedules` **명시 FK** 또는 `metadata.linked_training_schedule_id`로 1:1 묶기.
- **시간대**: 이미 서울 기준 슬롯 라벨 사용. 다중 타임존 팀이면 `TrainingSchedule.timezone`과 정책 정리.

### 4.2 타임테이블 UX (중기)

- **완료(집계)**: `CoachPlanTimetableGrid` — 코치 `event_coach_plans`만 시간×파트 격자, `team_wide_break` 전폭 행.
- **남은 과제**: 격자 **셀 안 직접 편집**, 빈 칸 클릭으로 카드 추가, `TrainingTimetableGrid`로 **레거시 블록**을 옵션 탭에서 보기 등.

### 4.3 쓰기 경로 통합 (장기)

- **A안**: 코치 작성은 계속 `EventCoachPlan`만 쓰고, 매니저가 “확정” 시 스냅샷을 `training_blocks`로 복제(배치 잡).
- **B안**: 신규 일정만 `Event` 생성 시 빈 `TrainingSchedule` 자동 생성 후, 그리드 편집이 곧바로 `training_blocks`를 갱신 — `EventCoachPlan`은 요약/코멘트 레이어로 유지.

팀 운영 방식에 맞춰 A/B 중 하나를 문서로 확정하는 것이 좋다.

### 4.4 레거시 JS 제거 조건

- `js/training_plan.js`의 MANAGEMENT/COACHING 진입점이 Next 라우트로 대체되고,
- `training_schedules` CRUD가 서버 API + RLS(또는 데모 인증)로 이전되며,
- QA 시나리오(날짜 변경, 다중 컬럼 블록, 브레이크) 회귀 테스트가 통과한 뒤 단계적 삭제.

### 4.5 관측·운영

- **남은 과제**: `training-merge-batch` 등 레거시 조회를 다시 켤 경우 **청크·로깅** 정리.

---

**참고 파일**: `js/training_plan.js`, `prisma/schema.prisma` (`Event`, `EventCoachPlan`, `TrainingSchedule`, `TrainingBlock`), `src/lib/server/trainingMergeForSeoulYmd.ts`, `src/components/training/CoachPlanPageContent.tsx`, `src/components/training/TrainingTimetableGrid.tsx`, `src/lib/team/trainingBlockTypeMeta.ts`.
