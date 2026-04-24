import type { TeamRole } from "@/lib/types/roles";
import type { ViewMode } from "@/lib/types/roles";

export type AuthProvider = "google" | "apple";

export type SessionStatus = "active" | "pending" | "no_team";

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  /** 정규화된 팀 역할 */
  teamRole: TeamRole;
  teamId: string;
  teamName: string;
  /** 선수 페르소나일 때 로스터 연결 */
  playerId: string | null;
  status: SessionStatus;
  /** UI 관점 (허용 범위는 teamRole이 제한) */
  viewMode: ViewMode;
  savedAt: number;
}

/** 데모 로그인에 쓰는 페르소나 (허용 계정만) */
export type DemoPersona = "manager" | "head_coach" | "part_coach" | "player";
