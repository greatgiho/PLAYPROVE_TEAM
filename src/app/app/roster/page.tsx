"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { PlayerEditModal } from "@/components/PlayerEditModal";
import { RosterDetailModal } from "@/components/RosterDetailModal";
import { useSession } from "@/lib/context/SessionContext";
import { playerEntityToRosterRow } from "@/lib/mappers/playerEntityToRosterRow";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player } from "@/lib/types/entities";
import type { RosterTableRow } from "@/lib/types/rosterTable";
import { useCallback, useEffect, useMemo, useState } from "react";

/** 설정 시 Prisma(DB) 로스터 사용, 비우면 기존 LocalStorage 데모 */
const DB_TEAM_CODE = process.env.NEXT_PUBLIC_PLAYPROVE_TEAM_CODE?.trim() ?? "";

export default function RosterPage() {
  return (
    <AccessGuard page="roster">
      <RosterInner />
    </AccessGuard>
  );
}

function RosterTable({
  rows,
  showEdit,
  onEdit,
  onRowClick,
}: {
  rows: RosterTableRow[];
  showEdit?: boolean;
  onEdit?: (playerId: string) => void;
  onRowClick?: (row: RosterTableRow) => void;
}) {
  return (
    <div className="tbl-wrap">
      <table className="erp-table">
        <thead>
          <tr>
            <th>선수</th>
            <th>번호</th>
            <th>유닛</th>
            <th>포지션</th>
            <th>상태</th>
            {showEdit ? <th style={{ width: 100 }}>관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              style={onRowClick ? { cursor: "pointer" } : undefined}
              onClick={() => onRowClick?.(p)}
            >
              <td>
                <div style={{ fontWeight: 800 }}>{p.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{p.phone ?? ""}</div>
              </td>
              <td>
                <span className="jersey-badge">{p.jersey_number ?? "-"}</span>
              </td>
              <td>{p.unit}</td>
              <td style={{ fontWeight: 800 }}>{p.primary_position}</td>
              <td>{p.player_status}</td>
              {showEdit && onEdit ? (
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p.id);
                    }}
                  >
                    수정
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterInner() {
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
    if (DB_TEAM_CODE) {
      const res = await fetch(`/api/roster?teamCode=${encodeURIComponent(DB_TEAM_CODE)}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        setLoadError(body?.message ?? `로스터 API 오류 (${res.status})`);
        setPlayerRows([]);
        setStaffRows([]);
        return;
      }
      const data = (await res.json()) as { players: RosterTableRow[]; staff: RosterTableRow[] };
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

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-users"></i> 팀 로스터
        </div>
      </div>

      {DB_TEAM_CODE ? (
        <div className="card" style={{ marginBottom: 12, padding: "10px 14px", fontSize: 13, color: "var(--gray-600)" }}>
          DB 연동 (팀 코드: <code>{DB_TEAM_CODE}</code>)
        </div>
      ) : null}
      {loadError ? (
        <div className="card" style={{ marginBottom: 12, padding: "10px 14px", color: "var(--danger, #b42318)" }}>
          {loadError}
        </div>
      ) : null}

      {DB_TEAM_CODE ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={tab === "players" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("players")}
          >
            선수단 ({playerRows.length})
          </button>
          <button
            type="button"
            className={tab === "staff" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTab("staff")}
          >
            코칭스태프 ({staffRows.length})
          </button>
        </div>
      ) : null}

      <div className="filter-bar">
        <div className="search-wrap">
          <i className="fas fa-search"></i>
          <input className="search-input" placeholder="이름, 포지션, 번호, 유닛 검색…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <RosterTable
          rows={filtered}
          showEdit={tab === "players" && session?.viewMode !== "player"}
          onEdit={(id) => setEditPlayerId(id)}
          onRowClick={(row) => setDetailRow(row)}
        />
      </div>

      <PlayerEditModal
        isOpen={editPlayerId !== null}
        playerId={editPlayerId}
        onClose={() => setEditPlayerId(null)}
        onSaved={() => void load()}
        teamCode={DB_TEAM_CODE || null}
        teamId={session?.teamId ?? null}
        actorUserId={session?.userId ?? "system"}
      />

      <RosterDetailModal
        isOpen={detailRow !== null}
        row={detailRow}
        onClose={() => setDetailRow(null)}
        teamCode={DB_TEAM_CODE || null}
        teamId={session?.teamId ?? null}
        canEditPlayers={tab === "players" && session?.viewMode !== "player"}
        onEditPlayer={(id) => setEditPlayerId(id)}
      />

      {session?.viewMode !== "player" && !DB_TEAM_CODE ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">빠른 등록 (데모)</div>
          </div>
          <div className="card-body">
            <form
              className="grid-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!session) return;
                const fd = new FormData(e.currentTarget);
                const svc = getTeamDataServices();
                await svc.players.create(
                  session.teamId,
                  {
                    full_name: String(fd.get("full_name") || ""),
                    phone: String(fd.get("phone") || ""),
                    jersey_number: Number(fd.get("jersey_number") || 0) || null,
                    join_year: new Date().getFullYear(),
                    height_cm: null,
                    weight_kg: null,
                    unit: String(fd.get("unit") || "offense") as Player["unit"],
                    primary_position: String(fd.get("primary_position") || "WR"),
                    secondary_position: null,
                    player_status: "active",
                    notes: null,
                    linked_user_id: null,
                  },
                  session.userId,
                );
                e.currentTarget.reset();
                await load();
              }}
            >
              <div className="form-group">
                <label className="form-label">이름</label>
                <input className="form-control" name="full_name" required />
              </div>
              <div className="form-group">
                <label className="form-label">연락처</label>
                <input className="form-control" name="phone" required />
              </div>
              <div className="form-group">
                <label className="form-label">번호</label>
                <input className="form-control" name="jersey_number" type="number" />
              </div>
              <div className="form-group">
                <label className="form-label">유닛</label>
                <select className="form-control" name="unit" defaultValue="offense">
                  <option value="offense">offense</option>
                  <option value="defense">defense</option>
                  <option value="special">special</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">포지션</label>
                <input className="form-control" name="primary_position" defaultValue="WR" />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <button className="btn btn-primary" type="submit">
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
