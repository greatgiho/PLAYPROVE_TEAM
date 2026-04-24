import type { TeamRole } from "@/lib/types/roles";

/** `core.profiles` 에 저장하는 스태프/코치 확장 필드 */
export type MypageStaffDbProfile = {
  academicMajor: string | null;
  staffResponsibilities: string | null;
  coachingCareerNotes: string | null;
  coachingUnit: string | null;
};

/** `GET /api/mypage/context` 응답 — 스태프(매니저·코치) 개인 페이지용 */
export type MypageStaffContext = {
  userId: string;
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  personalAvatarUrl: string | null;
  teamRole: TeamRole;
  teamName: string;
  teamCode: string;
  staffTitle: string | null;
  joinedAtIso: string | null;
  coachFocusSummary: string | null;
  dbProfile: MypageStaffDbProfile;
  /** DB에 저장된 문단·줄 단위 */
  sectionsDb: { title: string; items: string[] }[];
  /** 역할별 추천 체크리스트(템플릿) */
  sectionsGuide: { title: string; items: string[] }[];
  stats: { label: string; value: string }[];
};
