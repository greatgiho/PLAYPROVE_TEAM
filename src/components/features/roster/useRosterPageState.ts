"use client";

import { playerEntityToRosterRow } from "@/lib/mappers/playerEntityToRosterRow";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player } from "@/lib/types/entities";
import type { RosterTableRow } from "@/lib/types/rosterTable";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { getPlayproveTeamCode } from "@/lib/config";
import { useSession } from "@/lib/context/SessionContext";
import { useCallback, useEffect, useMemo, useState } from "react";

const teamCode = getPlayproveTeamCode();

export function useRosterPageState() {
  const { session } = useSession();
  const [tab, setTab] = useState<"players" | "staff">("players");
  const [playerRows, setPlayerRows] = useState<RosterTableRow[]>([]);
  const [staffRows, setStaffRows] = useState<RosterTableRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<RosterTableRow | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoadError(null);
    if (teamCode) {
      const res = await fetch(`/api/roster?teamCode=${encodeURIComponent(teamCode)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as
        | (ApiErrorBody & { players?: RosterTableRow[]; staff?: RosterTableRow[] })
        | null;
      if (!res.ok) {
        setLoadError(apiErrorUserHint(res.status, json));
        setPlayerRows([]);
        setStaffRows([]);
        return;
      }
      const data = json as { players: RosterTableRow[]; staff: RosterTableRow[] };
      setPlayerRows(data.players ?? []);
      setStaffRows(data.staff ?? []);
      return;
    }
    const svc = getTeamDataServices();
    const list: Player[] = await svc.players.listByTeam(session.teamId);
    setPlayerRows(list.map(playerEntityToRosterRow));
    setStaffRows([]);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const base = tab === "players" ? playerRows : staffRows;
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter(
      (p) =>
        p.full_name.toLowerCase().includes(s) ||
        p.primary_position.toLowerCase().includes(s) ||
        p.unit.toLowerCase().includes(s) ||
        String(p.jersey_number ?? "").includes(s),
    );
  }, [playerRows, staffRows, tab, q]);

  return {
    teamCode,
    session,
    tab,
    setTab,
    playerRows,
    staffRows,
    loadError,
    q,
    setQ,
    editPlayerId,
    setEditPlayerId,
    detailRow,
    setDetailRow,
    load,
    filtered,
  };
}
