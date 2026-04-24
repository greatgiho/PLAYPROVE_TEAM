# Cursor 규칙 대비 소스 일관성 점검 보고서

**기준 시점**: 저장소 정적 점검 (grep·파일 목록·주요 파일 샘플)  
**대상 규칙**: `.cursor/rules/frontend-core.mdc`, `frontend-styles.mdc`, `backend-core.mdc`, `data-platform-alignment.mdc`

---

## 요약

| 규칙 파일 | 전반 |
|-----------|------|
| **frontend-core** | `page.tsx` 얇기·`@/` import·팀 API `credentials` 는 대체로 양호. **로컬 `getTeamDataServices`와 DB API 병존**은 여전히 넓게 남아 있음(의도된 데모 모드와 규칙 문장이 공존). |
| **frontend-styles** | **인라인 `style={{}}`** 가 훈련·마이페이지·모달 등에 다량 — 규칙의 “새·수정은 Tailwind 우선”과 **레거시 볼륨**이 충돌. |
| **backend-core** | `new PrismaClient` 남용 없음, API에서 `process.env.NEXT_PUBLIC_*` 직접 참조 없음, DB 라우트에 `force-dynamic` 대체로 존재. **`requireDemoCookie` 적용 범위가 `/api/team/*` 위주**이고 로스터·프로필·마이페이지는 **미들웨어(또는 인라인 쿠키 검사) 의존**으로 패턴이 갈림. **`docs/api-overview` 등 API 계약 문서 없음**. |
| **data-platform-alignment** | Prisma multi-schema 자체는 규칙 부합. **스키마 경계 전용 문서**는 아직 없음(거버넌스 보고서에서만 권장). |

---

## 상세 표 (이탈·주의)

| # | 규칙 | 점검 내용 | 판정 | 근거·비고 |
|---|------|-----------|------|-----------|
| 1 | frontend-core | `src/app/**/page.tsx` **200줄 초과** | 주의 | `src/app/login/page.tsx` **203줄**. 나머지 앱 `page.tsx`는 대부분 200줄 미만. |
| 2 | frontend-core | 페이지 **얇게**(조립만) | 양호·부분 | `attendance` / `mypage` / `roster` 등은 얇음. **두꺼운 로직**은 `dashboard`(164), `admin`, `injury`, `dues` 등 **컴포넌트 미분리 `page.tsx`**에 남아 있음(Phase 2 범위 밖). |
| 3 | frontend-core | `NEXT_PUBLIC_PLAYPROVE_TEAM_CODE` **직접 사용 금지** | 양호 | 런타임 값은 `src/lib/config/playprove.ts` 집중. UI/에러 문구에 **변수 이름 문자열**이 노출되는 정도(`MypagePageView`, `CoachPlanPageContent`, `apiErrorHint`)는 **설정 읽기**가 아니라 안내 카피로 판단. |
| 4 | frontend-core | `getTeamDataServices()` vs **API 혼선** | 이탈·허용 병존 | `dashboard`, `admin`, `dues`, `injury`, `depthchart` 및 `features/roster`, `features/mypage`, `features/attendance`(로컬 모드), `PlayerEditModal` 등에서 **로컬 서비스 사용**. 출결/로스터는 **팀 코드 유무로 DB/로컬 분기** — 규칙 문장 “새 기능은 API 우선”과 병행 중. |
| 5 | frontend-core | `../../../` **깊은 상대 import** | 양호 | `src` 아래 해당 패턴 **미검출**. |
| 6 | frontend-core | 팀 API `fetch` + `credentials: "include"` | 양호 | 샘플링한 출결·로스터·훈련·마이페이지·모달 등 주요 `fetch`에 **`credentials: "include"`** 존재. |
| 7 | frontend-styles | **인라인 스타일** vs Tailwind·토큰 | 이탈(레거시 규모) | `CoachPlanPageContent`, `TrainingAttendancePanel`, `MypagePlayerDashboard`, `RosterDetailModal` 등 **`style={{}}` 다건** — 규칙상 신규/수정 구간부터 Tailwind·`app.*`/토큰으로 줄이는 방향과 거리 있음. |
| 8 | backend-core | **`@/lib/prisma` 단일 사용** | 양호 | `new PrismaClient`는 `src/lib/prisma.ts` **한곳**만. |
| 9 | backend-core | 팀 코드 **`getPlayproveTeamCode()`** | 양호 | `src/app/api`에서 `process.env.NEXT_PUBLIC_*` **직접 참조 없음**(검색 기준). |
| 10 | backend-core | DB 의존 Route Handler **`force-dynamic`** | 양호·소외 | Prisma 쓰는 라우트는 대부분 선언됨. **`/api/auth/*`** 는 Prisma 미사용으로 **미선언** — 규칙 취지상 무방. |
| 11 | backend-core | **`requireDemoCookie` 등 헬퍼** | 패턴 이탈 | `/api/team/*`·coach-plans 등은 **`requireDemoCookie`**. `/api/roster/*`, `/api/profile/*` 는 **핸들러 내 미호출**, **`/api/mypage/context`는 `cookies()` + `isAllowedAppUserId` 직접**. 동작은 미들웨어와 맞물리나 **규칙의 “가능하면 헬퍼”와 불일치**. |
| 12 | backend-core | **미들웨어 matcher** | 주의 | 신규 보호 API 추가 시 **matcher 누락 위험**(규칙 명시). 현재 나열 경로와 `src/app/api` 트리는 대체로 정합. |
| 13 | backend-core | **API 변경 시 문서** | 이탈 | `docs/api-overview.md` 등 **통합 API 명세 없음**. `backend-core`의 “새 엔드포인트는 docs에 한 줄”은 **자동 충족 불가**. |
| 14 | backend-core | **에러 JSON 형태** | 대체로 양호 | `{ error, message? }` 패턴 광범위. 개별 엔드포인트는 필요 시 샘플링으로 추가 점검. |
| 15 | data-platform-alignment | **스키마 경계 문서** | 미비 | 코드상 multi-schema는 유지. **별도 `docs/` 스키마 경계 문서**는 없음 — 규칙이 기대하는 “판정 문서”는 **거버넌스 보고서 수준만 존재**. |
| 16 | data-platform-alignment | **ERD ↔ 스키마 동기화** | 수동 검증 | 자동 diff는 수행하지 않음. 스키마 변경 시 **`database/ERD.md` 수동 갱신** 여부는 PR 습관에 의존. |

---

## 권장 후속 (우선순위 짧게)

1. **`requireDemoCookie` 정렬**: 로스터·프로필·마이페이지 라우트를 `demoTeamApiAuth`로 통일할지, “미들웨어만”을 문서·규칙에 **예외로 명시**할지 결정.  
2. **`docs/api-overview.md`** 초안 — 엔드포인트 표 + 인증 + 공통 `error` 코드.  
3. **`login/page.tsx`** — 200줄 근접: 컴포넌트 분리로 규칙 여유 확보.  
4. **스타일** — 터치하는 파일부터 인라인 축소(Tailwind·토큰), 전면 일괄은 비권장.

---

*본 보고서는 일회성 스냅샷이며, CI에 포함하려면 스크립트(줄 수·금지 패턴 grep)로 자동화할 수 있다.*
