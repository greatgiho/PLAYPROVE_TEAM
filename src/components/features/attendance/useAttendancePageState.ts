"use client";

import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { getPlayproveTeamCode, hasPlayproveTeamCode } from "@/lib/config";
import type { TeamEventDto } from "@/lib/mappers/prismaEventToDto";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { AttendanceRecord, Player, TeamEvent } from "@/lib/types/entities";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DbAttendanceRow } from "./types";

const teamCode = getPlayproveTeamCode();

export function useAttendancePageState() {
  const { session } = useSession();
  const useDb = hasPlayproveTeamCode();

  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [att, setAtt] = useState<AttendanceRecord[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const [dbEvents, setDbEvents] = useState<TeamEventDto[]>([]);
  const [dbRows, setDbRows] = useState<DbAttendanceRow[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbErr, setDbErr] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState<null | { mode: "create" } | { mode: "edit"; event: TeamEventDto }>(
    null,
  );

  const isManager = session?.teamRole === "manager";
  const isPlayerView = session?.viewMode === "player";
  const myPlayerId = session?.playerId;

  const loadLocal = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    const [p, e, a] = await Promise.all([
      svc.players.listByTeam(session.teamId),
      svc.events.listByTeam(session.teamId),
      svc.attendance.listByTeam(session.teamId),
    ]);
    setPlayers(p.filter((x) => x.player_status === "active" || x.player_status === "injured"));
    setEvents([...e].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    setAtt(a);
    setActiveEventId((cur) => {
      if (cur && e.some((x) => x.id === cur)) return cur;
      return e[0]?.id ?? null;
    });
  };

  const loadDbEvents = useCallback(async () => {
    const res = await fetch(
      `/api/team/events?teamCode=${encodeURIComponent(teamCode)}&withAttendanceCounts=1`,
      { credentials: "include", cache: "no-store" },
    );
    const j = (await res.json().catch(() => ({}))) as { events?: TeamEventDto[]; error?: string };
    if (!res.ok) {
      throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
    }
    const list = j.events ?? [];
    setDbEvents(list);
    setActiveEventId((cur) => {
      if (cur && list.some((x) => x.id === cur)) return cur;
      return list[0]?.id ?? null;
    });
  }, []);

  const loadDbAttendance = useCallback(async (eventId: string) => {
    const res = await fetch(
      `/api/team/attendance?teamCode=${encodeURIComponent(teamCode)}&eventId=${encodeURIComponent(eventId)}`,
      { credentials: "include", cache: "no-store" },
    );
    const j = (await res.json().catch(() => ({}))) as { rows?: DbAttendanceRow[]; error?: string };
    if (!res.ok) {
      throw new Error(apiErrorUserHint(res.status, j as ApiErrorBody));
    }
    setDbRows(j.rows ?? []);
  }, []);

  const loadDb = useCallback(async () => {
    if (!teamCode) return;
    setDbLoading(true);
    setDbErr(null);
    try {
      await loadDbEvents();
    } catch (e) {
      setDbErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setDbLoading(false);
    }
  }, [loadDbEvents]);

  useEffect(() => {
    if (useDb) void loadDb();
    else void loadLocal();
  }, [session, useDb, loadDb]);

  useEffect(() => {
    if (!useDb || !activeEventId) {
      setDbRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadDbAttendance(activeEventId);
      } catch (e) {
        if (!cancelled) setDbErr(e instanceof Error ? e.message : "출결 불러오기 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useDb, activeEventId, loadDbAttendance]);

  const activeEvent = useMemo(() => events.find((x) => x.id === activeEventId) ?? null, [events, activeEventId]);
  const activeDbEvent = useMemo(() => dbEvents.find((x) => x.id === activeEventId) ?? null, [dbEvents, activeEventId]);

  const map = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    if (!activeEvent) return m;
    for (const r of att) {
      if (r.event_id === activeEvent.id) m.set(r.player_id, r);
    }
    return m;
  }, [att, activeEvent]);

  const visibleDbRows = useMemo(() => {
    return dbRows.filter((r) => r.player_status === "active" || r.player_status === "injured");
  }, [dbRows]);

  const dbStats = useMemo(() => {
    const pool = dbRows.filter((r) => r.player_status === "active" || r.player_status === "injured");
    const attending = pool.filter((r) => r.status === "attending").length;
    const absent = pool.filter((r) => r.status === "absent").length;
    const undecided = pool.length - attending - absent;
    return { attending, absent, undecided, total: pool.length };
  }, [dbRows]);

  const refreshDbEventCounts = useCallback(async () => {
    try {
      await loadDbEvents();
    } catch {
      /* ignore */
    }
  }, [loadDbEvents]);

  return {
    session,
    useDb,
    teamCode,
    isManager,
    isPlayerView,
    myPlayerId,
    players,
    events,
    att,
    setAtt,
    activeEventId,
    setActiveEventId,
    activeEvent,
    map,
    dbEvents,
    dbRows,
    setDbRows,
    dbLoading,
    dbErr,
    activeDbEvent,
    visibleDbRows,
    dbStats,
    loadDb,
    refreshDbEventCounts,
    scheduleModal,
    setScheduleModal,
  };
}
