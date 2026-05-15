# 프론트 화면 뎁스·오버레이·도메인 IA

**목적**: URL 라우트(L0)와 모달/시트(L2)·하위 라우트(L3)를 구분해, **마이페이지·훈련계획** 등 화면 설계·구현·리뷰 시 **동일한 기준**을 쓴다.  
**SSOT**: 본 문서. 코드 기준은 `src/lib/permissions/viewControl.ts`(`AppPageId`), `src/components/AppShell.tsx`(네비).  
**관련**: `docs/frontend-refactor-execution-plan.md`, `docs/training-legacy-to-events-implementation-plan.md`, `docs/documentation-governance-report.md`

**갱신 규칙**

| 이벤트 | 갱신할 섹션 |
|--------|-------------|
| 새 `/app/*` 라우트 | §3 페이지 맵 |
| 새 모달·시트·드로어 | §4 오버레이 레지스트리 |
| 훈련계획·계획표 IA 변경 | §5~§6 |
| 마이페이지·모바일 IA 변경 | §7~§8 |
| PR 리뷰 시 | §10 체크리스트 |

---

## 1. 뎁스 정의 (L0 ~ L3)

| 레벨 | 이름 | 판단 기준 | URL | 뒤로가기 |
|------|------|-----------|-----|----------|
| **L0** | App Route | `AppShell` 안 **Next.js `page.tsx` 라우트** | `/app/mypage` 등 | 브라우저/앱 뒤로 → 이전 L0 |
| **L1** | Page Surface | 해당 라우트 **본문 스크롤 영역** (요약·목록·대시보드) | L0와 동일 path | L0 내 스크롤 |
| **L2** | Overlay | URL을 **바꾸지 않는** 모달·바텀시트·드로어 | 없음 (선택: `?overlay=`) | **오버레이 닫기** (히스토리 push 금지) |
| **L3** | Sub-route | **북마크·공유·딥링크**가 필요한 하위 화면 | `/app/mypage/profile` 등 | 브라우저 뒤로 → L0 |

### 결정 규칙 (짧게)

1. **폼·설정·업로드·2단계 작업** → 기본 **L2**. (예: 프로필 사진 편집)
2. **L3 라우트**는 “링크로 열어야 한다”가 있을 때만 추가.
3. L2는 **ESC**, 백드롭 탭, (모바일) 스와이프 다운으로 닫기.
4. L2 열림 중 **배경 스크롤 잠금** (`body overflow: hidden` 또는 기존 `modal-backdrop` 패턴).

### L0 vs L1 vs L2 예시 (마이페이지)

```
L0  /app/mypage
 └─ L1  MypagePageView (히어로 + 통계 + 접힌 섹션)
     └─ L2  ProfileAvatarModal (사진 2슬롯 업로드)  ← URL 변경 없음
```

### L0 vs L1 vs L3 예시 (훈련계획 작성 · 코칭)

제품 단계 **① 일정조회 → ② 세부계획조회 → ③ 세부계획 입력** 은 URL 하위 경로(L3)로 나눈다. (한 화면에 목록+폼을 모두 펼치지 않음)

```
L0  /app/coach_plan
 └─ L1  일정조회 — 훈련 일정 박스 그리드 (출결 확정 Event, session_kind=training)
     └─ L3  /app/coach_plan/[eventId]           세부계획조회 (요약·카드 목록 또는 빈 상태)
         └─ L3  /app/coach_plan/[eventId]/edit  세부계획 입력 (카드 추가·수정 폼)
```

---

## 2. 코드·폴더 규칙

| 구분 | 위치·네이밍 | 담당 |
|------|-------------|------|
| L0 | `src/app/app/**/page.tsx` | 라우트만: `AccessGuard` + `*PageView` |
| L1 | `src/components/features/<domain>/*PageView.tsx` | 페이지 본문·데이터 훅 연결 |
| L1 (도메인 UI) | `src/components/<domain>/` (예: `mypage/`) | 히어로·카드·섹션 |
| L2 | `*Modal.tsx`, `*Sheet.tsx` 또는 `components/overlays/` (도입 시) | 오버레이 전용 |
| 권한(L0 메뉴) | `viewControl.ts` → `AppPageId` | 사이드바 노출·`AccessGuard` |

- `page.tsx`에 200줄 이상 로직 → feature 훅/컴포넌트로 분리 (`frontend-refactor-execution-plan.md` Phase 2와 동일).
- **새 L2 추가 시** 본 문서 §4 레지스트리에 **한 줄** 등록 후 구현.

---

## 3. L0 페이지 맵 (`AppPageId`)

| `AppPageId` | Path | L1 주요 컴포넌트 | 비고 |
|-------------|------|------------------|------|
| `dashboard` | `/app/dashboard` | 팀 대시보드 | |
| `roster` | `/app/roster` | `RosterPageView` | L2: `RosterDetailModal`, `PlayerEditModal` |
| `attendance` | `/app/attendance` | `AttendancePageView` | L2: `EventScheduleModal` |
| `mypage` | `/app/mypage` | `MypagePageView` | §5~§6 리팩 대상 |
| `coach_plan` | `/app/coach_plan` | `CoachPlanWriteSchedulePage` + L3 | `/[eventId]`, `/[eventId]/edit` |
| `practice_plan` | `/app/practice_plan` | `CoachPlanPageContent` (aggregate) | §6 — 취합·컨펌, 작성은 `coach_plan` |
| `video_review` | `/app/video_review` | `VideoReviewPageContent` | |
| … | … | … | 전체 목록: `viewControl.ts` |

**권한**: `AppPageId` = **L0 메뉴·페이지 접근** (`canAccessPage`). L2 오버레이 권한은 **API + 컴포넌트 props**로 별도 명시(§4).

---

## 4. 오버레이 레지스트리 (L2)

| ID | 컴포넌트 | 트리거 | API | 권한 | 상태 |
|----|----------|--------|-----|------|------|
| `roster-detail` | `RosterDetailModal` | 로스터 행 클릭 | `GET /api/roster/players|staff/.../summary` | 뷰 모드·역할 | 구현됨 |
| `player-edit` | `PlayerEditModal` | 로스터 편집 | `PATCH /api/roster/players/:id` | 매니저 등 | 구현됨 |
| `event-schedule` | `EventScheduleModal` | 출결 일정 | `/api/team/events` | 매니저 | 구현됨 |
| **`profile-avatar-edit`** | **`ProfileAvatarModal`** | 마이페이지 히어로 **카메라 버튼** | `GET /api/profile/:userId`, `POST .../avatar` | **본인** (`pp_demo_uid`) | **구현됨** |

### `profile-avatar-edit` 스펙 (구현 전 고정)

- **재사용**: `ProfileAvatarSlots` 업로드 로직 → `ProfileAvatarEditor`로 추출.
- **슬롯**: `team` → `profiles.avatar_url`, `personal` → `profiles.personal_avatar_url` (기존과 동일).
- **UI**: 데스크톱 중앙 모달 / 모바일 바텀시트 (`max-height: 85vh`).
- **패턴**: `PlayerEditModal`과 동일 — `modal-backdrop`, `modal-box`, `role="dialog"`, `aria-modal`.
- **닫기 후**: `onUpdated`로 히어로 `RosterFace`·스태프/선수 대시보드 사진 갱신.

---

## 5. 훈련계획 작성 (`coach_plan`) — 코칭 카테고리

**메뉴**: `AppShell` → **COACHING** → **훈련계획 작성** (`/app/coach_plan`)  
**데이터**: `training.events` + `training.event_coach_plans` (코치별 세부 계획 카드). 출결에서 만든 일정이 소스.  
**관련 API**: `GET /api/team/events?expand=coach_plans`, `POST|PATCH|DELETE .../events/:eventId/coach-plans`  
**권한(클라이언트)**: `canWriteCoachPlanRole` — manager · head_coach · part_coach (`src/lib/team/coachPlanClient.ts`)

### 5.1 제품 뎁스 (고정)

| 단계 | 이름 | 레벨 | URL | 본문 |
|------|------|------|-----|------|
| **①** | **일정조회** | **L1** | `/app/coach_plan` | 확정된 **훈련 일정**을 **박스(카드) 그리드**로 표시. 제목·일시·장소·내 카드 수·제출 상태 요약. 박스 탭 → ② |
| **②** | **세부계획조회** | **L3** | `/app/coach_plan/[eventId]` | 해당 일정에 대한 **세부계획(코치 카드) 조회**. 카드가 없으면 화면 **중앙 `+`(또는 「세부계획 작성」)** 만 노출 → ③. 카드가 있으면 목록·타임슬롯 요약 표시 |
| **③** | **세부계획 입력** | **L3** | `/app/coach_plan/[eventId]/edit` | 유닛·직함·시간·제목·내용·전체 휴식 등 **입력·수정 폼** (현 `EventPlanWriteCard` 하단 폼에 해당). 저장 후 ②로 복귀 |

**용어**

- **일정** = `Event` (훈련 1회)
- **세부계획** = 해당 일정에 코치가 등록한 `event_coach_plans` **묶음** (카드 0~N건). ②에서 “있음/없음”, ③에서 카드 CRUD.

**뒤로가기**

- ③ → ② (`/edit` → `/[eventId]`)
- ② → ① (`/[eventId]` → `/coach_plan`)
- ①에서 브라우저 뒤로 → 이전 L0

**L2(모달) 사용 여부**: ①~③은 **전면 화면(L3)** 우선. 빠른 확인용 미리보기가 필요해지면 그때 §4에 L2 등록.

### 5.2 수정 가능 시각 (고정)

| 규칙 | 내용 |
|------|------|
| **수정 버튼** | ② **세부계획조회** 화면에 **「수정」** 노출 → ③ 진입 |
| **활성 조건** | `now < event.starts_at − 1시간` (훈련 **시작 1시간 전**까지 수정 가능) |
| **잠금** | `now ≥ event.starts_at − 1시간` 이면 ③ 진입·저장·삭제 **불가**, ②는 **읽기 전용**. 버튼 비활성 + 안내 문구: *「훈련 시작 1시간 전부터는 훈련계획을 수정할 수 없습니다.」* |
| **구현 위치** | `src/lib/team/coachPlanEditWindow.ts` (예정) `canEditCoachPlanEvent(startsAt: string): boolean` — UI·API 공용 |
| **API** | `POST/PATCH/DELETE` coach-plans 에도 동일 가드 **서버 적용** (2차, T4) |

기준 시각은 `Event.starts_at` (ISO, 팀 타임존 정책은 출결·일정과 동일).

### 5.3 L1 와이어 — 일정조회

```
┌─────────────────────────────────────────┐
│ 훈련계획 작성                    [계획표]│
├─────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 5/16(금) │ │ 5/18(일) │ │ 5/20(화) │ │  ← 훈련 Event 박스
│ │ 오후훈련 │ │ 전술미팅 │ │ …        │ │
│ │ 카드 2건 │ │ 미작성   │ │ 제출완료 │ │
│ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

- 박스 클릭 → `/app/coach_plan/[eventId]`
- 상단 링크: **훈련 계획표** (`/app/practice_plan`), **출결·일정** (`/app/attendance`)

### 5.4 L3 와이어 — 세부계획조회 · 입력

**② 카드 없음**

```
┌─────────────────────────────────────────┐
│ ← 일정 목록    5/16 금 · 오후 훈련       │
├─────────────────────────────────────────┤
│                                         │
│              ┌─────┐                    │
│              │  +  │  세부계획 작성       │  → /edit
│              └─────┘                    │
│                                         │
└─────────────────────────────────────────┘
```

**② 카드 있음**

```
┌─────────────────────────────────────────┐
│ ← 일정 목록    5/16 금 · 오후 훈련  [수정]│  ← 수정: 1시간 전까지만 enabled
├─────────────────────────────────────────┤
│ [OFF 14:00–14:50] 패스 프로 · 초안       │
│ [DEF 15:00–15:40] 커버리지 · 제출됨      │
│ …                                       │
└─────────────────────────────────────────┘
```

**③ 세부계획 입력** — 기존 작성 UI(유닛·직함·시간·제목·내용·전체 휴식·초안 저장·감독 제출)를 **해당 일정 전용 전면**으로 이동.

### 5.5 구현 상태 (T1~T5)

| 구역 | 구현 | 파일 |
|------|------|------|
| ① 일정조회 L1 | **완료** | `CoachPlanWriteSchedulePage`, `CoachPlanScheduleGrid` |
| ② 세부계획조회 L3 | **완료** | `app/coach_plan/[eventId]/page.tsx`, `CoachPlanEventDetailView` |
| ③ 세부계획 입력 L3 | **완료** | `app/coach_plan/[eventId]/edit/page.tsx`, `CoachPlanEventEditor` |
| 수정 1시간 전 잠금 | **완료** | `coachPlanEditWindow.ts`, API POST/PATCH/DELETE 가드 |
| 집계 보드 | **유지** | `CoachPlanPageContent` (`practice_plan` 전용) |

### 5.6 구현 단계 (문서 승인 후 코드)

| 단계 | 작업 | 산출물 | 완료 기준 |
|------|------|--------|-----------|
| **T0** | 본 §5 리뷰 | 본 문서 | 팀 합의 |
| **T1** | L1 `CoachPlanScheduleGrid` | `components/training/` | ✅ |
| **T2** | L3 조회 | `[eventId]/page.tsx` | ✅ |
| **T3** | L3 입력 | `[eventId]/edit/page.tsx` | ✅ |
| **T4** | `canEditCoachPlanEvent` + API | `lib/team/`, `lib/server/` | ✅ |
| **T5** | write 모드 제거 | `CoachPlanPageContent` 집계 전용 | ✅ |
| **D1** | §3·§5·§10 갱신 | 본 문서 | PR마다 |

**하지 않을 것 (1차)**

- `practice_plan` 에서 코치용 작성 폼 (취합·컨펌만 유지)
- 레거시 `training_blocks` 그리드 직접 편집 (→ `training-legacy-to-events-implementation-plan.md` 장기)

---

## 6. 훈련 계획표 (`practice_plan`) — 매니지먼트

**메뉴**: **MANAGEMENT** → **훈련 계획표** (`/app/practice_plan`)  
**역할**: 코치가 ③에서 제출한 카드를 **일정별로 취합**·감독 **컨펌** (시간 × TEAM/OFFENSE/DEFENSE/SPECIAL 격자).

| 단계 | 이름 | 레벨 | URL | 비고 |
|------|------|------|-----|------|
| ① | 일정조회 | L1 | `/app/practice_plan` | 훈련 일정 **탭/칩** (현 UI 유지) |
| ② | 세부계획조회(취합) | L1 (동일 L0) | `/app/practice_plan` + 선택 일정 | `CoachPlanTimetableGrid` — **읽기 중심**, 셀 편집은 2차 |
| ③ | 세부계획 입력 | — | **`coach_plan` 으로 이동** | 계획표에서는 작성하지 않음 |

코치에게 「계획 작성」 링크는 `coach_plan` L1으로만 연결.

---

## 7. 마이페이지 현황·문제

**경로**: `src/app/app/mypage/page.tsx` → `MypagePageView` → (`ProfileAvatarModal` L2 + `MypageStaffDashboard` | `MypagePlayerDashboard`)

| 구역 | 파일 | 현재 |
|------|------|------|
| 프로필 사진 | `ProfileAvatarModal.tsx` + `ProfileAvatarEditor.tsx` | 히어로 **카메라 버튼** → L2 모달 (인라인 카드 제거) |
| 스태프 히어로 | `MypageStaffDashboard.tsx` (`mypage-hero`) | 이름·팀·역할·합류일·바로가기·**사진 수정(L2)** |
| 통계 | `mypage-cards` | 5개 카드 그리드 |
| DB 프로필 편집 | `StaffProfileForm` | 항상 펼침 |
| 가이드 | `SectionList` | 항상 펼침 |

**모바일 이슈**: L1에 편집·가이드·사진 업로드가 **한 스크롤에 연속** → 히어로·핵심 KPI 도달 전 피로도 큼.

---

## 8. 마이페이지 모바일 IA (목표)

### L1 구성 (스태프·선수 공통 원칙)

1. **히어로** — 이름·팀·역할·대표 사진·**사진 수정 진입(L2)**·바로가기 (첨부 대시보드 레이아웃 유지).
2. **통계 카드** — 모바일 **2열** (`mypage-cards` 반응형).
3. **접기 섹션** — DB 프로필 편집·체크리스트·기타 장문은 **기본 collapsed** (아코디언).
4. **프로필 사진 인라인 카드 제거** — `ProfileAvatarSlots` 페이지 상단 노출 삭제, **L2 전용**.

### 스태프 L1 와이어 (목표)

```
┌─────────────────────────────────┐
│ [히어로] 아바타 + 📷 수정        │  ← sticky optional (상단 고정 검토)
│ 이름 / 팀 / 역할 / 합류일        │
│ [바로가기: 로스터 | 대시보드]    │
├─────────────────────────────────┤
│ [통계 2x2 + 1]                  │
├─────────────────────────────────┤
│ ▶ 프로필 상세 편집 (DB)          │  collapsed
│ ▶ 역할별 체크리스트              │  collapsed
└─────────────────────────────────┘
```

### 선수 L1

- 동일: 히어로 + 사진 L2 + 핵심 KPI 우선.
- 출결·회비·부상 등은 **접기** 또는 「더 보기」로 2단계 노출 (구현 시 `MypagePlayerDashboard` 점검).

---

## 9. 마이페이지 구현 단계 (문서 승인 후 코드)

| 단계 | 작업 | 산출물 | 완료 기준 |
|------|------|--------|-----------|
| **D0** | 본 문서 리뷰 | `frontend-navigation-depth.md` | 팀 합의 |
| **I1** | `ProfileAvatarEditor` + `ProfileAvatarModal` | `components/mypage/` | 업로드·미리보기·API 동작 |
| **I2** | `MypageHero` + 스태프 히어로 카메라 버튼 | `MypageStaffDashboard` | 첨부 UI와 동일 진입점 |
| **I3** | `MypagePageView`에서 인라인 `ProfileAvatarSlots` 제거 | 스크롤 단축 | 사진 변경은 L2만 |
| **I4** | 아코디언 + 모바일 카드 그리드 | CSS/컴포넌트 | 기본 collapsed |
| **I5** | 선수 대시보드 parity | `MypagePlayerDashboard` | I2~I4 동일 패턴 |
| **D1** | §4·§3·§5 맵 갱신 | 본 문서 | PR마다 |

**하지 않을 것 (1차)**

- `/app/mypage/profile` 같은 L3 라우트 (필요 시 2차).
- 프로필 API·스토리지 계약 변경 (프론트 구조만).

---

## 10. PR·리뷰 체크리스트

- [ ] 새 UI가 **L1 / L2 / L3** 중 어디인지 PR 설명에 명시했는가?
- [ ] `coach_plan` 변경 시 **수정 1시간 전** 규칙(§5.2)을 UI·API에 반영했는가?
- [ ] L2 추가 시 §4 레지스트리 한 줄 갱신했는가?
- [ ] L2가 **히스토리 push 없이** 닫히는가?
- [ ] 모바일에서 터치 타깃 **≥ 44px**, 바텀시트 스크롤·키보드 겹침 없는가?
- [ ] `npm run build` + 마이페이지 스모크 (스태프/선수, 사진 저장) 통과?

**마이페이지 스모크 (최소)**

1. 로그인 → `/app/mypage`
2. 히어로 **사진 수정** → L2 열림 → 팀 대표/개인 각 1회 업로드(또는 스킵)
3. 히어로·로스터에 반영 확인
4. DB 편집 접기 열기 → 저장
5. 모바일 뷰포트(375px)에서 레이아웃 깨짐 없음

---

**훈련계획 스모크 (최소)**

1. 코치 로그인 → `/app/coach_plan` — 훈련 일정 **박스**만 보이는지
2. 박스 탭 → `/[eventId]` — 미작성 시 **중앙 +**, 작성 후 카드 목록
3. **수정** → `/[eventId]/edit` — 저장·제출 후 ② 복귀
4. 일정 시작 **1시간 이내** mock 시 수정 버튼 비활성·API 거부 확인
5. `/app/practice_plan` — 동일 일정 취합 격자 표시

---

## 11. 용어·다른 문서와의 관계

| 문서 | 역할 |
|------|------|
| **본 문서** | 뎁스·오버레이·마이페이지·**훈련계획** IA |
| `frontend-refactor-execution-plan.md` | 폴더 구조·Phase 0~2 리팩 |
| `training-legacy-to-events-implementation-plan.md` | Event ↔ EventCoachPlan 데이터·레거시 이관 |
| `viewControl.ts` | L0 메뉴·페이지 ACL |
| `database/ERD.md` · `database/training_event_coach_plans.sql` | 일정·코치 계획 테이블 |
| `backend-code-review-report.md` | API 경로 요약 |

---

*갱신: 마이페이지(I1~I5), 훈련계획 작성 T0~T5(§5). 구현 PR에서는 단계 ID(`I1`, `T2`, …)를 PR 제목/설명에引用하면 추적이 쉽다.*
