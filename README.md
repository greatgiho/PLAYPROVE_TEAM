# PlayProve Team ERP — Coaching Hub v3

미국식 풋볼 팀 통합 관리 시스템 (SPA, Static Web App)

---

## 🏈 프로젝트 개요

PlayProve는 아마추어 미식축구팀을 위한 ERP 플랫폼입니다. 선수단 관리, 출결/부상/회비 추적, 역량 평가, AI 전술 어시스턴트, 훈련 타임테이블까지 하나의 화면에서 통합 관리합니다.

---

## ✅ 완료된 기능

### 인증 / 온보딩
- Google / Apple 소셜 로그인 (데모 모드 포함)
- 역할별 데모 로그인 (Owner/Admin, Coach, Player, New 가입)
- 팀 생성 / 팀 검색 & 가입 신청 온보딩 플로우

### MANAGEMENT (관리자·코치 화면)
| 화면 | 설명 |
|---|---|
| 팀 대시보드 | KPI 카드, 다가오는 일정, 출결 파이차트, 부상자 현황, 유닛 분포 |
| 선수단 관리 | 로스터 CRUD, 검색·필터, 유닛별 그룹화 |
| 출결 관리 | 일정별 출결 현황, 출석/불참/미정 토글 |
| 부상·컨디션 | 부상 신고/수정, 통증 레벨 시각화 |
| 회비 관리 | 월별 납부 현황, 미납자 알림 (Admin 전용) |
| 뎁스 차트 | 포지션별 선수 순위 관리 |
| **훈련 계획** | **타임테이블 (세로=시간, 가로=TEAM/OFFENSE/DEFENSE/SPECIAL), 날짜탭, 블록 카드, AI 추천** |

### COACHING (코치 화면)
| 화면 | 설명 |
|---|---|
| 역량 평가 | 레이더 차트, 5개 지표 평가 입력, 코치 코멘트 키워드 분석 |
| Roster 시뮬레이터 | 선수 제외 시 전력 손실 계산, 드래그 시뮬레이션 |
| 훈련 즉시평가 | 훈련 후 빠른 선수별 평가 (RapidCheck) |
| IIP 관리 | 드릴 라이브러리, 과제 배정, XP 추적 |
| AI 전술 어시스턴트 | ERP 데이터 기반 전술 추천 챗봇 (데모) |
| 성장 속도 분석 | Growth Velocity 지수, 팀 랭킹 차트 |
| **훈련계획 작성** | **날짜 선택 후 TEAM/OFFENSE/DEFENSE/SPECIAL 컬럼별 블록 카드 작성** |

### MY SPACE (선수 화면)
- 내 페이지 (개인 대시보드, 등급, 성장 분석, 알림 설정)
- 나의 훈련 과제 (IIP 진행 상황)
- My Feed (공지 피드)
- 공지사항

### ADMIN
- 가입 승인 관리 (승인/거절/역할 변경)
- 팀 설정 (팀명, 초대코드)

---

## 📁 파일 구조

```
index.html              — SPA 진입점 (로그인 / 온보딩 / 앱 3-스크린)
css/
  style.css             — 전역 스타일, 반응형 (모바일 ~ 4K)
  style_v2.css          — v3 추가 컴포넌트, 타임테이블 전용 CSS
  auth.css              — 로그인/온보딩/어드민 전용 스타일
js/
  auth.js               — 인증, 세션, 역할 관리
  data.js               — API 헬퍼, 유틸리티
  app.js                — SPA 라우터, 페이지 렌더러 (Dashboard ~ Admin)
  gamification.js       — 등급/XP/리더보드 계산
  coaching.js           — 역량평가, RapidCheck, AI 전술
  simulator.js          — Roster 시뮬레이터, 유닛 전력 계산
  iip.js                — IIP 과제 배정, 드릴 라이브러리
  mypage.js             — 내 페이지, 컨디션 차트, 성장 분석
  notifications.js      — 알림 패널, 설정
  admin.js              — 가입 승인, 팀 설정
  viewcontrol.js        — 뷰 모드 전환 (Admin/Coach/Player), 성장 속도 분석
  training_plan.js      — 훈련 타임테이블, 블록 카드, AI 추천
```

---

## 🗃️ REST API (상대 경로)

| 테이블 | 설명 |
|---|---|
| `tables/players` | 선수 정보 |
| `tables/events` | 일정 |
| `tables/attendance` | 출결 |
| `tables/injury_reports` | 부상 |
| `tables/monthly_dues` | 회비 |
| `tables/notices` | 공지사항 |
| `tables/notifications` | 알림 |
| `tables/condition_logs` | 컨디션 로그 |
| `tables/player_grades` | 선수 등급 |
| `tables/performance_scores` | 역량 평가 점수 |
| `tables/drill_library` | 드릴 라이브러리 |
| `tables/iip_assignments` | IIP 과제 배정 |
| `tables/practice_checkins` | 훈련 즉시 체크인 |
| `tables/training_schedules` | 훈련 일정 (날짜·시간·장소) |
| `tables/training_blocks` | 타임블록 카드 (유닛별) |
| `tables/practice_plans` | 훈련계획 (코치 작성, 기존 시스템) |

---

## 📱 화면 접근 권한

| 화면 | Admin | Coach | Player |
|---|:---:|:---:|:---:|
| 대시보드 | ✅ | ✅ | ✅ |
| 선수단·출결·부상·뎁스차트 | ✅ | ✅ | ✅ |
| 회비 관리 | ✅ | ❌ | ❌ |
| 역량평가·시뮬레이터·즉시평가 | ✅ | ✅ | ❌ |
| 훈련계획 (타임테이블 조회) | ✅ | ✅ | ✅ |
| 훈련계획 작성 (코치) | ✅ | ✅ | ❌ |
| IIP·AI전술·성장분석 | ✅ | ✅ | ✅ |
| 가입 승인 관리 | ✅ | ❌ | ❌ |
| MY SPACE | ✅ | ✅ | ✅ |

---

## 🎨 반응형 브레이크포인트

| 구간 | 적용 |
|---|---|
| 1600px+ | padding 32px 40px, KPI minmax 220px, grid-2 gap 28px |
| 1200~1599px | grid-2 gap 24px, grid-3 gap 22px |
| ~1200px | page-content padding 24px, KPI minmax 180px |
| ~1024px | 3컬럼 → 2컬럼, page-content 22px |
| ~900px | 2컬럼 → 1컬럼, KPI 2열, page-content 18px |
| ~768px | 사이드바 슬라이드, 모바일 레이아웃, 타임테이블 min-width 560px |
| ~600px | 전문화면 최소화 (perf-metrics 2열, sim-unit 1열) |
| ~480px | 최소 최적화, date-badge 숨김, page-content 12px |

### 주요 레이아웃 수정 이력 (2026-04-23)
- `#screen-app.active` → `display:flex` 로 변경 (사이드바+메인 수평 배치)
- `.main-wrap` → `width: calc(100% - var(--sidebar-w))`, `min-width: 0` 추가 (오버플로우 방지)
- `.topbar` → `flex-shrink: 0`, `width: 100%`, `box-sizing: border-box` 추가
- `.page-content` 중복 정의 제거 (style.css 232번 단일 소스)
- `.card-header` min-height: 54px, padding 통일
- `.topbar-title` → font-size 18px, font-weight 800, ellipsis 처리
- 대시보드 퀵 배너 inline style → `.quick-banner` CSS 클래스로 전환
- 훈련계획 `form-input` → `form-control` 통일
- `grid-2 style="margin-bottom:22px"` → `.grid-2.mb-24` 유틸리티 클래스로 전환 (app.js, mypage.js, coaching.js, simulator.js, iip.js)
- auth.css 768px 반응형 추가 (admin 탭, 요청카드, 멤버 패널)

### 타임테이블 엔진 교체 (2026-04-23 v2)
- **HTML `<table>` → CSS Grid 완전 전환** (`buildTimeTable()` 재작성)
- `grid-template-columns: 68px repeat(4, 1fr)` — TIME + 4유닛 컬럼
- `grid-template-rows: 44px repeat(N, 20px)` — 헤더 + 5분 단위 row
- 블록 배치: `grid-row: [startRow] / [endRow]`, `grid-column: [colIdx]`
- BREAK 블록: `grid-column: 1 / -1` (TIME 포함 전체 가로) + 빗금 배경으로 표시
- 브레이크 시간대 훈련 블록 완전 배제 (slotColMap 구성 시 브레이크 슬롯 Skip)
- 블록 추가 모달: `block_type === 'break'` 선택 시 컬럼/강도/포지션 필드 자동 숨김
- 기존 `.tp-timetable` 관련 CSS 전체 제거 → `.tpg-*` 네임스페이스로 교체

---

## 🚀 데모 로그인 역할

| 역할 | 접근 범위 |
|---|---|
| Owner / Admin | 모든 화면 + 가입 승인 |
| Coach | MANAGEMENT + COACHING + MY SPACE |
| Player | MY SPACE 전용 |
| New | 온보딩 → 팀 가입 신청 |

---

## 🔮 미구현 / 향후 개선사항

- 실제 OAuth (Google/Apple) 연동
- 훈련 블록 AI 자동 생성 (실제 LLM API 연동)
- 푸시 알림 / 이메일 알림
- 프로필 사진 업로드
- 멀티 시즌 지원
- PWA 전환 (오프라인 지원)
- 코치별 권한 세분화 (포지션 코치 → 본인 컬럼만 수정)

---

## 🛠️ 기술 스택

- HTML5 / CSS3 / Vanilla JavaScript (SPA)
- Chart.js (레이더 차트, 파이차트, 바차트)
- Font Awesome 6 (아이콘)
- Google Fonts (Inter, Bebas Neue)
- RESTful Table API (상대 경로)

---

*배포: Publish 탭에서 원클릭 퍼블리시*
