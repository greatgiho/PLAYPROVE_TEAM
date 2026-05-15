"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { getPlayproveTeamCode, hasPlayproveTeamCode } from "@/lib/config";
import { useCallback, useEffect, useState } from "react";

const teamCode = getPlayproveTeamCode();

export function useCoachPlanEvents() {
  const [events, setEvents] = useState<TeamEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [coachPlansSchemaMissing, setCoachPlansSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    if (!hasPlayproveTeamCode()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/team/events?teamCode=${encodeURIComponent(teamCode)}&expand=coach_plans`,
        { credentials: "include", cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        events?: TeamEventDto[];
        coach_plans_schema_missing?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
      }
      setEvents(j.events ?? []);
      setCoachPlansSchemaMissing(Boolean(j.coach_plans_schema_missing));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { events, loading, err, coachPlansSchemaMissing, reload: load, teamCode };
}
