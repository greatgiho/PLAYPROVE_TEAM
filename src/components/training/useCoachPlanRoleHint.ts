"use client";

import { getPlayproveTeamCode, hasPlayproveTeamCode } from "@/lib/config";
import { canWriteCoachPlanRole } from "@/lib/team/coachPlanClient";
import { useEffect, useState } from "react";

const teamCode = getPlayproveTeamCode();

export function useCoachPlanRoleHint(teamRole: string | undefined) {
  const [roleTitleHint, setRoleTitleHint] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!hasPlayproveTeamCode() || !canWriteCoachPlanRole(teamRole)) {
      setRoleTitleHint(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/team/me/coach-context?teamCode=${encodeURIComponent(teamCode)}`,
          { credentials: "include", cache: "no-store" },
        );
        const j = (await res.json().catch(() => ({}))) as { role_title_hint?: string };
        if (cancelled) return;
        const raw = typeof j.role_title_hint === "string" ? j.role_title_hint.trim() : "";
        setRoleTitleHint(raw || null);
      } catch {
        if (!cancelled) setRoleTitleHint(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamRole]);

  return roleTitleHint;
}
