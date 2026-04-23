"use client";

import type { AuthSession, DemoPersona } from "@/lib/auth/sessionTypes";
import {
  allowableViewModes,
  canSwitchToView,
  defaultViewMode,
} from "@/lib/permissions/viewControl";
import { TEAM_ID } from "@/lib/services/local/seed";
import { normalizeTeamRole } from "@/lib/types/roles";
import type { TeamRole } from "@/lib/types/roles";
import type { ViewMode } from "@/lib/types/roles";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SESSION_KEY = "pp_session_v4";

type SessionContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  loginDemo: (persona: DemoPersona, provider?: AuthSession["provider"]) => void;
  logout: () => void;
  setViewMode: (mode: ViewMode) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AuthSession;
    if (!s?.userId) return null;
    if (Date.now() - (s.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return {
      ...s,
      teamRole: normalizeTeamRole(s.teamRole as unknown as string),
      viewMode: sanitizeViewMode(normalizeTeamRole(s.teamRole as unknown as string), s.viewMode),
    };
  } catch {
    return null;
  }
}

function sanitizeViewMode(role: TeamRole, mode: ViewMode | undefined): ViewMode {
  const m = mode ?? defaultViewMode(role);
  return canSwitchToView(role, m) ? m : defaultViewMode(role);
}

function writeSession(s: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!s) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

const DEMO: Record<
  DemoPersona,
  Pick<AuthSession, "userId" | "email" | "displayName" | "teamRole" | "playerId">
> = {
  manager: {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
    email: "manager@seouldragonz.kr",
    displayName: "김매니저",
    teamRole: "manager",
    playerId: null,
  },
  head_coach: {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
    email: "headcoach@seouldragonz.kr",
    displayName: "이헤드코치",
    teamRole: "head_coach",
    playerId: null,
  },
  part_coach: {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddd04",
    email: "partcoach@seouldragonz.kr",
    displayName: "최파트코치",
    teamRole: "part_coach",
    playerId: null,
  },
  player: {
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddd03",
    email: "player1@gmail.com",
    displayName: "박진우",
    teamRole: "player",
    /** 시드 로스터 `seed.ts` 의 박진우 레코드 id 와 동일해야 합니다 */
    playerId: "00000000-0000-4000-8000-000000000007",
  },
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setIsReady(true);
  }, []);

  const loginDemo = useCallback((persona: DemoPersona, provider: AuthSession["provider"] = "google") => {
    const d = DEMO[persona];
    const role = d.teamRole;
    const viewMode = defaultViewMode(role);
    const next: AuthSession = {
      userId: d.userId,
      email: d.email,
      displayName: d.displayName,
      provider,
      teamRole: role,
      teamId: TEAM_ID,
      teamName: "서울 드래곤즈",
      playerId: d.playerId,
      status: "active",
      viewMode,
      savedAt: Date.now(),
    };
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (!canSwitchToView(prev.teamRole, mode)) return prev;
      const next = { ...prev, viewMode: mode, savedAt: Date.now() };
      writeSession(next);
      return next;
    });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isReady,
      loginDemo,
      logout,
      setViewMode,
    }),
    [session, isReady, loginDemo, logout, setViewMode],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function useAllowableViewModes(): ViewMode[] {
  const { session } = useSession();
  if (!session) return ["player"];
  return allowableViewModes(session.teamRole);
}
