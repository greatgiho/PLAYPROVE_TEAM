import type { AuthSession, DemoPersona } from "@/lib/auth/sessionTypes";
import { TEAM_ID } from "@/lib/services/local/seed";
import { defaultViewMode } from "@/lib/permissions/viewControl";
import { normalizeTeamRole } from "@/lib/types/roles";

/** 서버 `POST /api/auth/demo-login` 과 클라이언트 세션이 공유하는 페르소나 → userId 매핑 */
export const DEMO_PERSONA_IDS: Record<
  DemoPersona,
  Pick<AuthSession, "userId" | "email" | "displayName" | "teamRole" | "playerId">
> = {
  manager: {
    userId: "fc94c261-9d2c-4393-8f3e-d79ce755d164",
    email: "bulk.mgr-0@seed.playprove.local",
    displayName: "김매니저",
    teamRole: "manager",
    playerId: null,
  },
  head_coach: {
    userId: "658adec7-83e5-4451-bb01-48e3d327768f",
    email: "bulk.coach-0@seed.playprove.local",
    displayName: "이헤드코치",
    teamRole: "head_coach",
    playerId: null,
  },
  part_coach: {
    userId: "87f4567d-940b-48e3-a06f-3770ee10fa38",
    email: "bulk.coach-1@seed.playprove.local",
    displayName: "파트 코치 (데모)",
    teamRole: "part_coach",
    playerId: null,
  },
  player: {
    userId: "9a51eb17-47a4-4f38-9e87-35bfa9619f31",
    email: "bulk.player-0@seed.playprove.local",
    displayName: "박진우",
    teamRole: "player",
    playerId: "00000000-0000-4000-8000-000000000007",
  },
};

const DEMO_PERSONA_ORDER: DemoPersona[] = ["manager", "head_coach", "part_coach", "player"];

export function isDemoPersona(v: unknown): v is DemoPersona {
  return typeof v === "string" && (DEMO_PERSONA_ORDER as readonly string[]).includes(v);
}

/** HttpOnly 쿠키만 있는 경우 로컬 세션 복원용 */
export function buildDemoAuthSession(
  userId: string,
  provider: AuthSession["provider"] = "google",
): AuthSession | null {
  const row = Object.values(DEMO_PERSONA_IDS).find((r) => r.userId === userId);
  if (!row) return null;
  const role = normalizeTeamRole(row.teamRole);
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    provider,
    teamRole: role,
    teamId: TEAM_ID,
    teamName: "서울 드래곤즈",
    playerId: row.playerId,
    status: "active",
    viewMode: defaultViewMode(role),
    savedAt: Date.now(),
  };
}
