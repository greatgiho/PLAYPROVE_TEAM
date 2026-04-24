import type { MypageStaffDbProfile } from "@/lib/types/mypageStaffContext";
import type { TeamRole } from "@/lib/types/roles";

export function splitNoteLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** DB 컬럼 기반 섹션 (없으면 빈 배열) */
export function staffDbSections(role: TeamRole, db: MypageStaffDbProfile): { title: string; items: string[] }[] {
  const out: { title: string; items: string[] }[] = [];
  const major = db.academicMajor?.trim();
  if (major) {
    out.push({ title: "전공·자격", items: [major] });
  }
  const resp = db.staffResponsibilities?.trim();
  if (resp) {
    const lines = splitNoteLines(resp);
    out.push({ title: "담당 업무 (DB)", items: lines.length ? lines : [resp] });
  }
  const unit = db.coachingUnit?.trim();
  const career = db.coachingCareerNotes?.trim();
  if (unit || career) {
    const items: string[] = [];
    if (unit) items.push(`담당 유닛/파트: ${unit}`);
    if (career) items.push(...splitNoteLines(career));
    if (items.length) {
      out.push({
        title: role === "manager" ? "추가 기록 (DB)" : "코칭 경력·담당 (DB)",
        items,
      });
    }
  }
  return out;
}

/** 히어로 요약: DB 코칭 필드 우선, 없으면 직함 휴리스틱 */
export function coachHeroSummary(teamRole: TeamRole, staffTitle: string | null, db: MypageStaffDbProfile): string | null {
  if (teamRole === "manager") return null;
  const career = db.coachingCareerNotes?.trim();
  if (career) {
    const lines = splitNoteLines(career);
    const first = lines[0] ?? career;
    return first.length > 260 ? `${first.slice(0, 260)}…` : first;
  }
  const unit = db.coachingUnit?.trim();
  if (unit) {
    const hint = coachFocusSummary(staffTitle);
    return hint ? `담당 유닛: ${unit}. ${hint}` : `담당 유닛: ${unit}.`;
  }
  return coachFocusSummary(staffTitle);
}

function titleLine(staffTitle: string | null): string[] {
  if (!staffTitle?.trim()) return [];
  return [`시드 직함: ${staffTitle.trim()}`];
}

/** 코치 직함 문자열로 담당 파트·경력 요약(데모용 카피) */
export function coachFocusSummary(staffTitle: string | null): string | null {
  if (!staffTitle?.trim()) return "팀 코칭 플랜·선수 기술 발전에 참여합니다.";
  const t = staffTitle;
  if (/헤드|감독|head/i.test(t)) {
    return "훈련 커리큘럼, 경기 전술, 코치진 조율을 총괄합니다.";
  }
  if (/오펜스|공격|리시버|라인|쿼터백/i.test(t)) {
    return "공격 유닛 기술·루트·블로킹 스킴을 맡고, 포지션 미팅·필름 스터디를 진행합니다.";
  }
  if (/디펜스|수비|라인배커|백필드|DB/i.test(t)) {
    return "수비 프론트·커버리지·터오버 상황을 담당하고, 상대 스카우팅 자료를 정리합니다.";
  }
  if (/스페셜|특수/i.test(t)) {
    return "킥·펀트·리턴 유닛 전담, 게임 속 특수팀 리허설을 관리합니다.";
  }
  return `${t} 포지션에서 선수 개별 피드백과 경기 준비를 지원합니다.`;
}

export function staffResponsibilityBlocks(role: TeamRole, staffTitle: string | null): { title: string; items: string[] }[] {
  const head = titleLine(staffTitle);

  if (role === "manager") {
    return [
      {
        title: "팀 운영 · 기록 유지",
        items: [
          ...head,
          "회비·월별 청구 상태 집계, 미납 알림 및 납부 확인",
          "가입 요청(Join) 검토, 로스터 명단·동의서 보관",
          "시설·버스·원정 일정 예약 및 비용 정리",
        ],
      },
      {
        title: "컴플라이언스 · 커뮤니케이션",
        items: [
          "의무 교육·안전 서약 이행 여부 추적",
          "부상·출결 공지, 팀 공지 채널 정리",
          "스폰서·협회 제출용 공식 명단 출력",
        ],
      },
    ];
  }

  if (role === "head_coach") {
    return [
      {
        title: "코칭 · 전술",
        items: [
          ...head,
          "시즌 롱플랜·주간 훈련 블록 설계, 드릴 라이브러리 관리",
          "경기 전 상대 분석, 킥오프 전 작전 보드 정리",
          "파트 코치 업무 배분·미팅 아젠다 확정",
        ],
      },
      {
        title: "선수 경력 · 평가",
        items: [
          "포지션별 스킬 체크리스트·그레이딩 기준 운영",
          "출석·컨디션 로그를 바탕으로 주전·백업 로테이션 제안",
          "부상 복귀 RTP(Return to play) 일정과 의무진 공유",
        ],
      },
    ];
  }

  if (role === "part_coach") {
    return [
      {
        title: "담당 파트 · 코칭",
        items: [
          ...head,
          "담당 유닛(포지션 그룹) 개별 코칭 포인트·영상 클립 정리",
          "헤드코치 플랜에 맞춘 서브패키지·스카우트 노트 작성",
          "경기 중 시드 라인 호출·타임아웃 시 플레이 제안",
        ],
      },
      {
        title: "선수 이력 · 트래킹",
        items: [
          "담당 선수 스냅 수·에피시언시 지표 주간 업데이트",
          "하이스쿼·대학 경력·트랜스퍼 이력 요약(로스터 메모 연동)",
          "부상 이력·제한 스냅 태그를 트레이닝 스태프와 공유",
        ],
      },
    ];
  }

  return [
    {
      title: "내 페이지",
      items: [...head, "역할별 정보를 준비 중입니다."],
    },
  ];
}
