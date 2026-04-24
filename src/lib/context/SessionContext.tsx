"use client";

import type { AuthSession, DemoPersona } from "@/lib/auth/sessionTypes";
import { isAllowedAppUserId } from "@/lib/auth/allowedAppUsers";
import { buildDemoAuthSession, DEMO_PERSONA_IDS } from "@/lib/auth/demoLoginPersonas";
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
  loginDemo: (persona: DemoPersona, provider?: AuthSession["provider"]) => Promise<void>;
  logout: () => Promise<void>;
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
    if (!isAllowedAppUserId(s.userId)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/auth/demo-session", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { userId?: string | null };
      const cookieUid = j.userId?.trim() || null;
      const ls = readSession();

      if (!cookieUid) {
        if (ls) writeSession(null);
        if (!cancelled) setSession(null);
        if (!cancelled) setIsReady(true);
        return;
      }

      if (!ls || ls.userId !== cookieUid) {
        const rebuilt = buildDemoAuthSession(cookieUid);
        if (rebuilt) {
          writeSession(rebuilt);
          if (!cancelled) setSession(rebuilt);
        } else {
          writeSession(null);
          if (!cancelled) setSession(null);
        }
      } else if (!cancelled) {
        setSession(ls);
      }
      if (!cancelled) setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginDemo = useCallback(async (persona: DemoPersona, provider: AuthSession["provider"] = "google") => {
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
      credentials: "include",
    });
    if (!res.ok) return;

    const d = DEMO_PERSONA_IDS[persona];
    const role = normalizeTeamRole(d.teamRole);
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

  const logout = useCallback(async () => {
    await fetch("/api/auth/demo-logout", { method: "POST", credentials: "include" }).catch(() => {});
    writeSession(null);
    setSession(null);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (!isAllowedAppUserId(prev.userId)) return null;
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
