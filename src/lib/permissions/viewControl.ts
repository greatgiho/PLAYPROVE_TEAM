import type { TeamRole } from "@/lib/types/roles";
import type { ViewMode } from "@/lib/types/roles";
import { normalizeTeamRole } from "@/lib/types/roles";

export type AppPageId =
  | "dashboard"
  | "roster"
  | "attendance"
  | "injury"
  | "dues"
  | "depthchart"
  | "mypage"
  | "myfeed"
  | "notices"
  | "performance"
  | "simulator"
  | "rapidcheck"
  | "iip_coach"
  | "my_iip"
  | "ai_tactical"
  | "growth"
  | "admin"
  | "practice_plan"
  | "coach_plan";

const ALL_VIEWS: ViewMode[] = ["manager", "coach", "player"];

/** 뷰 모드별 기본 접근 (레거시 PAGE_ACCESS 정렬) */
const PAGE_ACCESS_BY_VIEW: Record<AppPageId, ViewMode[]> = {
  dashboard: ALL_VIEWS,
  roster: ALL_VIEWS,
  attendance: ALL_VIEWS,
  injury: ALL_VIEWS,
  depthchart: ALL_VIEWS,
  iip_coach: ALL_VIEWS,
  ai_tactical: ALL_VIEWS,
  mypage: ALL_VIEWS,
  my_iip: ALL_VIEWS,
  myfeed: ALL_VIEWS,
  notices: ALL_VIEWS,
  growth: ALL_VIEWS,
  practice_plan: ALL_VIEWS,
  dues: ["manager"],
  admin: ["manager"],
  performance: ["manager", "coach"],
  simulator: ["manager", "coach"],
  rapidcheck: ["manager", "coach"],
  coach_plan: ["manager", "coach"],
};

/** 파트 코치는 코칭 중 일부 고위험/기획 화면을 제한합니다. */
/** 레거시 COACHING·훈련계획 작성은 파트 코치도 사용 (포지션 코치). */
const PART_COACH_BLOCKED: AppPageId[] = ["simulator"];

export function allowableViewModes(teamRole: TeamRole): ViewMode[] {
  switch (teamRole) {
    case "manager":
      return ["manager", "coach", "player"];
    case "head_coach":
    case "part_coach":
      return ["coach", "player"];
    case "player":
      return ["player"];
    default:
      return ["player"];
  }
}

export function defaultViewMode(teamRole: TeamRole): ViewMode {
  const modes = allowableViewModes(teamRole);
  return modes[0] ?? "player";
}

export function canSwitchToView(teamRole: TeamRole, view: ViewMode): boolean {
  return allowableViewModes(teamRole).includes(view);
}

/**
 * 페이지 접근: (1) 현재 뷰 모드가 허용하는지 (2) 팀 역할이 매니저 전용 화면을 볼 수 있는지
 * (3) 파트 코치 제한
 */
export function canAccessPage(
  teamRole: TeamRole,
  viewMode: ViewMode,
  page: AppPageId,
): boolean {
  if (!canSwitchToView(teamRole, viewMode)) return false;

  const allowedViews = PAGE_ACCESS_BY_VIEW[page] ?? ["manager"];
  if (!allowedViews.includes(viewMode)) return false;

  if ((page === "dues" || page === "admin") && teamRole !== "manager") {
    return false;
  }

  if (teamRole === "part_coach" && PART_COACH_BLOCKED.includes(page)) {
    return false;
  }

  return true;
}

export function normalizeRoleForStorage(role: string): TeamRole {
  return normalizeTeamRole(role);
}

export function accessDeniedMessage(
  teamRole: TeamRole,
  viewMode: ViewMode,
  page: AppPageId,
): string {
  if ((page === "dues" || page === "admin") && teamRole !== "manager") {
    return "매니저 전용 메뉴입니다.";
  }
  if (teamRole === "part_coach" && PART_COACH_BLOCKED.includes(page)) {
    return "파트 코치 권한으로는 이 화면에 접근할 수 없습니다.";
  }
  const allowed = PAGE_ACCESS_BY_VIEW[page] ?? [];
  return `${viewMode} 뷰에서는 이 페이지를 열 수 없습니다. (허용: ${allowed.join(", ")})`;
}
