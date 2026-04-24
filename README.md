# PlayProve Team — Coaching Hub

아마추어 미식축구 팀을 위한 통합 관리 웹앱입니다. 선수·스태프 로스터, 일정·출결, 훈련/이벤트, 마이페이지 등을 한곳에서 다룹니다.

---

## 현재 제품 스택 (이 레포의 기준)

| 구분 | 기술 |
|------|------|
| 앱 | **Next.js 15** (App Router), **React 19**, TypeScript |
| DB | **PostgreSQL** (Supabase), **Prisma** (`prisma/schema.prisma`, multi-schema) |
| API | **Route Handlers** — `src/app/api/**/route.ts` |
| 스타일 | 레거시 전역 CSS + Tailwind(점진적), Chart.js |

레거시 **정적 SPA**(`index.html`, `css/`, `js/` 등)는 저장소에 남아 있을 수 있으나, **일상 개발·배포의 기준은 위 Next 앱**입니다.

---

## 빠른 시작

1. **환경 변수**: 루트에 `.env`를 만들고 [`.env.example`](.env.example)을 참고해 `DATABASE_URL` 등을 채웁니다.  
2. **의존성**: `npm install`  
3. **Prisma**: `npx prisma migrate deploy` (또는 로컬에서는 `migrate dev`) 후 필요 시 `npm run db:seed`  
4. **개발 서버**: `npm run dev` → [http://localhost:3000](http://localhost:3000)

데모 로그인은 `/login`에서 제공됩니다. 보호된 `/app/*`·일부 `/api/*`는 쿠키 기반 데모 세션과 미들웨어로 게이트됩니다.

---

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | Next 개발 서버 |
| `npm run build` | `prisma generate` + 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npm run db:seed` | 시드 (`prisma/seed.ts`) |
| `npm run db:pull` | DB → Prisma 스키마 동기화 (주의해서 사용) |

---

## 디렉터리 가이드

```
src/app/              # 라우트·페이지·레이아웃
  app/                # 로그인 후 앱 영역 (/app/...)
  api/                # HTTP API (Route Handlers)
src/middleware.ts     # /app, 일부 /api 등 인증 게이트
src/lib/
  prisma.ts           # Prisma 클라이언트 싱글톤
  config/             # NEXT_PUBLIC_* 등 단일 진입
  server/             # API 공통 (데모 인증·팀 스코프 등)
  mappers/            # Prisma 모델 → DTO/화면용 타입
prisma/
  schema.prisma
  migrations/
docs/                 # 실행계획·점검 보고서 등
database/             # ERD 등 보조 문서
```

---

## 문서

실행계획·보고서·거버넌스 가이드는 **`docs/`**에 두고, **DB 관점 다이어그램·ERD**는 **`database/`**에 둡니다. 환경 변수 예시는 루트 [`.env.example`](.env.example), 에이전트 코딩 규칙은 [`.cursor/rules/`](.cursor/rules/) — 일반적인 레포 관행에 맞춘 배치입니다.

| 문서 | 내용 |
|------|------|
| [docs/frontend-refactor-execution-plan.md](docs/frontend-refactor-execution-plan.md) | 프론트 구조·단계 계획 |
| [docs/training-legacy-to-events-implementation-plan.md](docs/training-legacy-to-events-implementation-plan.md) | 훈련/이벤트 도메인 이행 |
| [docs/backend-code-review-report.md](docs/backend-code-review-report.md) | 백엔드 구조·문서 점검 요약 |
| [docs/documentation-governance-report.md](docs/documentation-governance-report.md) | 문서 거버넌스 — 백엔드·DBA 유지 문서·역할·모듈식 DB |
| [docs/cursor-rules-consistency-audit.md](docs/cursor-rules-consistency-audit.md) | Cursor 규칙 대비 소스 일관성 점검 |
| [docs/codebase-maturity-assessment.md](docs/codebase-maturity-assessment.md) | 폴더·구조 인상 정리(초보 틱 vs 전문가 시선) + 데이터 모드(로컬/API) |
| [database/ERD.md](database/ERD.md) | 엔티티 관계 (Prisma·마이그레이션 기준) |

---

## 기능 개요 (화면)

제품 기능 범위는 넓습니다. 대표적으로:

- **관리**: 대시보드, 로스터, 출결, 부상·컨디션, 회비, 뎁스차트, 훈련 계획/일정  
- **코치**: 역량 평가, 시뮬레이터, RapidCheck, IIP, AI 전술(데모), 성장 분석  
- **선수·공통**: 마이페이지, 공지 등  
- **어드민**: 가입 승인 등 (역할에 따라 노출)

역할별 접근은 화면마다 다릅니다. 세부 매트릭스는 필요 시 `docs/` 또는 UI `AccessGuard`와 함께 정리합니다.

---

## 미구현 / 향후

- 프로덕션 **OAuth**(Google/Apple) 및 세션 모델 본격화  
- 푸시·이메일 알림, 멀티 시즌, PWA 등  

(데모 인증·로컬 데모 데이터와 프로덕션 요구사항은 별도 설계가 필요합니다.)

---

## Cursor 규칙

- 프론트: `.cursor/rules/frontend-core.mdc`, `frontend-styles.mdc`  
- 백엔드(API·Prisma·미들웨어): `.cursor/rules/backend-core.mdc`  
- **DBA·백엔드 정렬**(스키마·마이그레이션·문서 동기화 리마인더): `.cursor/rules/data-platform-alignment.mdc`

---

*배포 방식은 호스팅 환경에 맞게 `next build` / `next start` 또는 플랫폼 가이드를 따르면 됩니다.*
