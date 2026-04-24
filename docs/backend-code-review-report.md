# 백엔드 코드·문서 점검 결과 보고서

**대상**: 채용된 백엔드 개발자가 “문서 관리·개발 일관성” 관점에서 1차로 판단할 수 있는 수준의 점검  
**범위**: Next.js App Router `src/app/api/*`, `src/middleware.ts`, `src/lib/server/*`, `src/lib/prisma.ts`, Prisma 스키마·마이그레이션, 루트·`database/` 문서  
**작성일**: 2026-04-24  
**방법**: 정적 코드 구조 분석 + `npm run build` 성공 여부(타입·린트 통과) — 런타임 부하·보안 침투 테스트는 본 보고서 범위 밖

---

## 1. 종합 판단 (한 줄)

**데이터 계층(Prisma·스키마·마이그레이션)과 API 내부의 권한·팀 스코프 패턴은 일관되게 잡혀 있으나, “백엔드만 담당하는 사람”이 의지할 **API·아키텍처 전용 문서는 부족**하고, **루트 README는 현재 코드베이스(Next + Prisma API)와 불일치**하여 온보딩 리스크가 있다.

---

## 2. 평가 기준 (신규 백엔드가 보는 것)

| 영역 | 기대 | 본 레포 상태 |
|------|------|----------------|
| **문서** | API 목록, 인증·환경, DB 변경 절차가 한눈에 들어옴 | `.env.example`, `database/ERD.md`, `docs/training-…` 등 **부분적으로 우수**. **통합 API 가이드 없음**, README는 레거시 SPA 설명 위주 |
| **일관성** | 인증·에러 형식·팀 스코프가 라우트마다 동일한 패턴 | **팀 코드 + 데모 쿠키** 패턴이 `lib/server/demoTeamApiAuth.ts` 등으로 **상당 부분 공통화**됨. 라우트마다 세부는 다소 상이 |
| **데이터** | 단일 DB 클라이언트, 스키마 버전 관리 | **Prisma 단일 인스턴스**, **multi-schema**, **마이그레이션 SQL 존재** — 양호 |
| **품질 보증** | API 단위 테스트 또는 최소 계약 테스트 | **자동화된 API 테스트 스크립트 없음** (`package.json` 기준) |
| **운영·보안** | 프로덕션 인증·비밀 관리 명확 | **데모 쿠키 + 허용 UID** 중심 — 의도된 스테이지로 보이나, 프로덕션 전환 시 별도 설계 필요 |

---

## 3. 잘 된 점 (강점)

### 3.1 데이터 모델·이력

- **`prisma/schema.prisma`**: PostgreSQL + **다중 스키마**(`auth`, `core`, `development`, `management`, `training`)로 도메인 경계가 코드에 반영됨.
- **`prisma/migrations/`**: 타임스탬프 기반 마이그레이션으로 변경 이력이 추적 가능.
- **`database/ERD.md`**: “기준 소스는 Prisma + 마이그레이션”이라고 명시하고 Mermaid로 관계를 요약 — **DB 온보딩 자료로 유효**.

### 3.2 API 구현 패턴

- **`src/lib/prisma.ts`**: 개발 환경에서의 싱글톤 패턴으로 연결 폭주를 완화하는 일반적인 관행.
- **`src/lib/server/demoTeamApiAuth.ts`**: `requireDemoCookie`, `requireTeamFromCode`, `getTeamMember`, 역할별 `canEditAttendance` / `canWriteCoachPlan` 등 — **권한·팀 스코프 로직이 한 파일에 모여** 재사용·리뷰가 쉬움.
- **`src/lib/config` + `getPlayproveTeamCode()`**: 팀 코드 참조가 여러 API·클라이언트와 맞물릴 때 **단일 진입**으로 정리된 편.
- **에러 응답**: `NextResponse.json({ error: "…", message?: "…" }, { status })` 형태가 반복되어, 클라이언트가 코드로 분기하기 좋음.
- **`export const dynamic = "force-dynamic"`**: DB 의존 API에서 캐시 오해를 줄이려는 의도가 분명함.
- **입력 검증 예시**: `team/attendance`의 UUID 정규식 검사, JSON 파싱 실패 시 400 등 — **방어적 처리가 일부 라우트에 잘 들어가 있음**.
- **내결함성 예시**: `team/events`에서 `event_coach_plans` 테이블 미존재(P2021) 시 폴백 — **배포 순서/스키마 드리프트**를 고려한 코드.

### 3.3 경로 보호

- **`src/middleware.ts`**: `/app`, `/api/roster`, `/api/profile`, `/api/mypage`, `/api/team`, `/dev` 등에 대해 쿠키·허용 UID 검사 — **“로그인 없이 API가 열리지 않게”** 하는 최소 게이트가 명확함.

### 3.4 운영 힌트

- **`.env.example`**: `DATABASE_URL` 형식, Supabase 키, 시드용 변수에 대한 주석이 있어 **환경 구성 실수를 줄이려는 노력**이 보임.

---

## 4. 개선이 필요한 점 (리스크·일관성 갭)

### 4.1 문서와 실제 스택의 괴리

- **루트 `README.md`**: Vanilla SPA·`js/`·`tables/*` REST 등 **현재 Next + Prisma Route Handler 중심 백엔드와 맞지 않는 설명**이 많음. 신규 백엔드 입사자가 README만 읽으면 **잘못된 mental model**을 갖기 쉬움.
- **권장**: `README.md` 상단에 “현재 제품 백엔드는 Next.js Route Handlers + Prisma” 한 단락과, **상세는 `docs/backend-…` 링크**로 유도하거나, README를 두 층(레거시 / 현행)으로 분리.

### 4.2 API 계약 문서 부재

- OpenAPI/Swagger, `docs/api/*.md` 수준의 **엔드포인트·쿼리스트링·본문 스키마·에러 코드 표**가 없음.
- **권장**: 최소한 `docs/api-overview.md`(표 형식: 메서드, 경로, 인증, 주요 query/body, `error` 코드) 또는 Postman 컬렉션.

### 4.3 인증·권한 검사 위치의 이중성

- 미들웨어에서 1차 차단 + 일부 라우트에서 `requireDemoCookie()` 재검증 — **보안상 나쁘지 않음**.
- 다만 **어떤 API가 미들웨어 matcher에 포함되는지**와 **라우트 내부 검증**이 항상 같이 움직이도록 문서화하지 않으면, **새 API 추가 시 누락** 가능성이 있음.
- **권장**: “신규 보호 API는 matcher 추가 + 핸들러에서 `requireDemoCookie`”를 `docs/` 한 줄 규칙으로 고정.

### 4.4 라우트별 스타일 차이

- 예: `/api/roster` GET은 핸들러 내부에서 쿠키를 다시 읽지 않고 **미들웨어에만 의존**하는 반면, `team/*` 계열은 **`requireDemoCookie`로 명시적 검증** — 동작은 맞을 수 있으나 **팀 컨벤션 문서 없이는 신규 기여자가 혼동**하기 쉬움.
- 응답 필드 네이밍: 일부는 **snake_case**(`player_id` 등), Prisma/TS 쪽은 camelCase — **의도적이면 문서에 “공개 API는 snake_case”** 한 줄이 있으면 좋음.

### 4.5 테스트·회귀

- `package.json`에 **API/통합 테스트 스크립트가 없음**. 리팩터·스키마 변경 시 회귀는 수동 스모크에 의존할 가능성이 큼.
- **권장**: 핵심 3~5개 라우트에 대해 Vitest + `Request` 모킹 또는 최소 E2E 한 줄이라도 CI에 고정.

### 4.6 프로덕션 관점 (참고)

- 현재는 **데모 UID 쿠키 + allowlist** 모델로 보이며, README “미구현”에 OAuth 등이 명시됨 — **스테이징/데모에는 적합**, 프로덕션 전환 시에는 별도 인증·감사 로그·Rate limit 설계가 필요함(코드만으로는 미완으로 판단하는 것이 타당).

---

## 5. 백엔드 관련 문서 인벤토리

| 문서 | 역할 | 백엔드 온보딩 적합도 |
|------|------|----------------------|
| `.env.example` | DB·Supabase·팀 코드·시드 변수 | 높음 |
| `database/ERD.md` | 엔티티 관계 요약 | 높음 |
| `docs/training-legacy-to-events-implementation-plan.md` | 훈련/이벤트 도메인 이행 | 도메인 이해에 유용 |
| `docs/frontend-refactor-execution-plan.md` | 프론트 구조 | 백엔드 직접 참고는 제한적 |
| 루트 `README.md` | 제품·SPA 설명 | **현행 백엔드와 불일치 — 주의** |

---

## 6. 결론: “문서·일관성이 잘 되어 있다”고 말하기 위한 조건

- **지금도 말할 수 있는 긍정적 문장**: “DB 스키마·마이그레이션·ERD·Prisma 사용·팀/역할 가드 헬퍼는 정돈되어 있고, API 핸들러는 비교적 읽기 쉬운 편이다.”
- **신규 백엔드가 ‘문서 관리가 잘 되었다’고까지 말하려면**: **README와 실제 스택 정렬**, **API 계약 문서 1페이지**, **인증/matcher 규칙 한 페이지**, **테스트 또는 체크리스트 자동화** 중 최소 2~3개가 보완되는 것이 합리적 기준으로 보임.

---

## 7. 권장 다음 액션 (우선순위)

1. **`README.md` 현행화** — 완료(Next + Prisma 기준). 상세 아키텍처는 필요 시 `docs/backend-architecture.md` 추가.
2. **에이전트 규칙**: `.cursor/rules/backend-core.mdc`로 API·Prisma·미들웨어 일관성 유지.
3. **`docs/api-overview.md`**: 엔드포인트 표 + 공통 에러 코드 + `teamCode`/`pp_demo_uid` 설명.
4. **`npm run test:api`** 수준의 최소 자동화(또는 CI에 `npm run build`는 이미 있으므로 여기에 smoke 스크립트 추가).
5. (선택) **응답 필드 네이밍 규칙**을 문서화하거나, 신규 API부터 일관되게 정리하는 정책 합의.

---

*본 보고서는 저장소 스냅샷 기준이며, 배포 환경·실제 Supabase 정책·RLS는 별도 점검이 필요할 수 있습니다.*
