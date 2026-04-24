# 프론트 정리·리팩터 실행계획

**목표**: 프론트 개발자 + 디자이너가 붙었을 때 부담이 최소이고, “구조가 명확하다”고 느낄 수 있는 상태로 만든다.  
**전제**: 동작·API 계약은 유지한다. (기능 스펙 변경은 별 PR로 분리)

**이미 반영된 것**

- Tailwind 3 + PostCSS (`tailwind.config.ts`, `preflight: false`) — 레거시 전역 CSS와 충돌을 줄이면서 유틸 도입 가능
- `@/lib/config` (`getPlayproveTeamCode`, `hasPlayproveTeamCode`), `src/styles/app-tokens.css`, `theme.extend`의 `app.*` 색/반경/그림자
- `src/components/ui` (`Card`, `Stack`) 및 `/dev/playprove` 파일럿

---

## 1. 성공 기준 (최고네가 되는 최소 조건)

| 구분 | 기준 |
|------|------|
| **찾기** | 화면 URL → `page.tsx` → 주요 UI 컴포넌트 경로를 **1분 안에** 설명할 수 있다. |
| **스타일** | 새 UI는 **Tailwind 유틸 우선**; 색·간격·반경은 **토큰(CSS 변수)** 한 축을 참조한다. |
| **데이터** | “이 화면 데이터는 어디서 오나”가 **한 줄**(훅 또는 `lib/api/*`)로 답 가능하다. |
| **디자이너** | Figma 토큰 ↔ `--app-*` (또는 Tailwind `theme.extend`) 매핑표가 **한 페이지**에 있다. |
| **회귀** | 단계마다 `npm run build` + 수동 스모크 체크리스트 통과. |

---

## 2. 하지 않을 것 (1차에서 제외)

- Prisma 스키마·API 응답 형식 변경 (프론트 정리와 분리)
- 레거시 `style.css` / `style_v2.css` **전면 삭제** (리스크 과다 → 후순위)
- Tailwind **preflight 켜기** (레거시와 충돌 검증 후 별 단계)
- 모든 인라인 스타일을 한 번에 제거 (비용 대비 효용 낮음)

---

## 3. 폴더·역할 규칙 (목표 구조)

```
src/app/**/page.tsx       # 라우트만: 레이아웃 조합 + AccessGuard + 데이터 훅 연결 (얇게)
src/components/
  ui/                       # 공통 UI (Button, Card, Stack…) — 디자인 시스템 앵커
  features/<domain>/        # 도메인 단위 (training, attendance, roster, mypage)
src/lib/
  config/                   # NEXT_PUBLIC_* , 팀 코드 등 단일 진입
  api/                      # fetch 래퍼, 에러 파싱 (선택, 단계적으로)
  hooks/                    # useTeamCode, useDbEvents 등 (선택)
```

- **규칙**: `page.tsx`에 200줄 이상 로직이 쌓이면 **feature 컴포넌트 또는 훅**으로 분리 검토.

---

## 4. 단계별 실행계획

### Phase 0 — 합의·고정 (반나절 ~ 1일)

| 작업 | 산출물 |
|------|--------|
| 본 문서 리뷰·수정 | 승인된 `docs/frontend-refactor-execution-plan.md` |
| Cursor 규칙 | `.cursor/rules/frontend-core.mdc`, `frontend-styles.mdc` (프론트 작업 시 자동 적용 범위) |
| 브랜치 전략 | `refactor/front-phase-1` 등 이름 규칙 |
| 스모크 체크리스트 | 로그인, 출결(DB), 로스터, 훈련계획표·작성, 마이페이지 (선수/스태프) |

**완료 조건**: 위 체크리스트를 “리팩 전/후 동일하게 통과” 기준으로 고정.

---

### Phase 1 — 설정·토큰·공통 축 (1~2일)

| # | 작업 | 내용 |
|---|------|------|
| 1.1 | `lib/config` | `NEXT_PUBLIC_PLAYPROVE_TEAM_CODE` 등 **한 모듈**에서 export (`getPlayproveTeamCode()` 등). 기존 페이지의 중복 상수 제거. |
| 1.2 | 디자인 토큰 | `src/app/globals.css` 또는 `src/styles/app-tokens.css`에 `:root`에 `--app-surface`, `--app-border`, `--app-text`, `--app-radius` 등 **소수** 정의. |
| 1.3 | Tailwind `theme.extend` | 토큰을 `colors.app.surface` 형태로 매핑 (선택, 디자이너가 Tailwind만 보면 되게). |
| 1.4 | `components/ui/` 시드 | `Card`, `Stack`, `Text`, `PageHeader` 중 **실제 2회 이상 쓸 것만** 1차 도입 (과도한 추상화 금지). |

**완료 조건**: 신규 코드는 팀 코드를 `lib/config`만 참조; 새 조각 UI는 Tailwind + 토큰 조합으로 1화면 이상 적용(파일럿).

---

### Phase 2 — “두꺼운 페이지” 분리 (2~4일, 병렬 가능)

우선순위는 **라인 수·분기 수·디자인 터치 빈도** 기준.

| 순서 | 대상 | 방향 |
|------|------|------|
| P2-1 | `app/app/attendance/page.tsx` | `features/attendance/` — 이벤트 목록, DB 그리드, 로컬 모드, 스케줄 모달을 컴포넌트+훅으로 분리. `page.tsx`는 조립만. |
| P2-2 | `app/app/mypage/page.tsx` | 이미 하위 컴포넌트 있음 → **데이터 로드·분기**만 `useMypageData` 등으로 이동. |
| P2-3 | `app/app/roster/page.tsx` | `RosterTable` 등 파일 분리, DB/로컬 분기 정리. |

**진행 현황**: P2-1 출결 → `src/components/features/attendance/`; P2-2 마이페이지 → `features/mypage/` (`useMypagePageState`, `MypagePageView`); P2-3 로스터 → `features/roster/` (`RosterTable`, `useRosterPageState`, `RosterPageView`). 각 라우트 `page.tsx`는 `AccessGuard` + 해당 `*PageView` 조립만.

**완료 조건**: 각 대상 `page.tsx` **라인 수 목표** (예: 400줄 미만 또는 팀 합의치); 빌드·스모크 통과.

---

### Phase 3 — 스타일 이행 (지속, 1주 단위 권장)

| # | 작업 | 내용 |
|---|------|------|
| 3.1 | 신규·수정 구간 | 인라인 `style={{}}` → Tailwind + 토큰으로 **갈아타기** (전면 금지, 터치한 파일만). |
| 3.2 | 훈련 영역 | `components/training/*` 우선 정리 (이미 응집도 높음 → 디자인 시연용으로 좋음). |
| 3.3 | AppShell | 사이드·헤더만 토큰/Tailwind 정렬 (전역 레거시는 최소 건드림). |

**완료 조건**: “디자이너가 바꿀 색/간격”이 토큰 또는 `tailwind.config`에 모여 있음 (문서 1페이지로 설명 가능).

---

### Phase 4 — 데이터 진입 단일화 (선택, 별도 기획 후)

| 작업 | 설명 |
|------|------|
| 로컬 vs API | `getTeamDataServices()` 사용처를 줄이고, `NEXT_PUBLIC_PLAYPROVE_TEAM_CODE`가 있을 때는 **API 우선**으로 통일하는 정책 문서화. |
| `lib/api/team.ts` | `fetchEvents`, `fetchAttendance` 등 **한 곳**에서 URL·에러 처리. |

**완료 조건**: 신규 화면은 `lib/api` 또는 React Query 등 **한 패턴**만 사용 (도입 시점은 팀 합의).

---

## 5. 디자이너 핸드오프 체크리스트 (반복용)

- [ ] 토큰 표: Figma 변수 ↔ `--app-*` / Tailwind 키
- [ ] 레이아웃 그리드: 최대 너비, 카드 패딩, 섹션 간격
- [ ] 컴포넌트 인벤토리: `components/ui` 목록 + 스토리북 여부 (선택)
- [ ] 아이콘: Font Awesome 유지 vs Lucide 전환 (선택, Phase 3 이후)

---

## 6. 리스크·완화

| 리스크 | 완화 |
|--------|------|
| 레거시 CSS와 Tailwind 특이성 충돌 | preflight 끔 유지; 한 파일씩 이행. |
| 대형 PR | Phase별로 PR 분리 (1: config+tokens, 2: attendance only, …). |
| 회귀 | 매 Phase 끝 `build` + 스모크 체크리스트. |

---

## 7. 다음 액션 (검토 후)

1. 본 문서에 **일정·우선순위 수정** (팀 일정 반영).  
2. **Phase 1 착수** PR 생성 (`lib/config` + 토큰 + 파일럿 1화면).  
3. Phase 2는 **attendance부터** 착수 권장 (임팩트 대비 구조 개선 폭이 큼).

---

*문서 버전: 초안 — 검토 후 수정해 주세요.*
