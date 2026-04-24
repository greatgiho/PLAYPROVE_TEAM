"use client";

import { PlayerEditModal } from "@/components/PlayerEditModal";
import { RosterDetailModal } from "@/components/RosterDetailModal";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player } from "@/lib/types/entities";
import { RosterTable } from "./RosterTable";
import { useRosterPageState } from "./useRosterPageState";

export function RosterPageView() {
  const s = useRosterPageState();

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-users"></i> 팀 로스터
        </div>
      </div>

      {s.teamCode ? (
        <div className="card" style={{ marginBottom: 12, padding: "10px 14px", fontSize: 13, color: "var(--gray-600)" }}>
          DB 연동 (팀 코드: <code>{s.teamCode}</code>)
        </div>
      ) : null}
      {s.loadError ? (
        <div
          className="card"
          style={{
            marginBottom: 12,
            padding: "12px 16px",
            color: "var(--danger, #b42318)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          <strong>로스터 API</strong> — {s.loadError}
        </div>
      ) : null}

      {s.teamCode ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={s.tab === "players" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => s.setTab("players")}
          >
            선수단 ({s.playerRows.length})
          </button>
          <button
            type="button"
            className={s.tab === "staff" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => s.setTab("staff")}
          >
            코칭스태프 ({s.staffRows.length})
          </button>
        </div>
      ) : null}

      <div className="filter-bar">
        <div className="search-wrap">
          <i className="fas fa-search"></i>
          <input
            className="search-input"
            placeholder="이름, 포지션, 번호, 유닛 검색…"
            value={s.q}
            onChange={(e) => s.setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <RosterTable
          rows={s.filtered}
          showEdit={s.tab === "players" && s.session?.viewMode !== "player"}
          onEdit={(id) => s.setEditPlayerId(id)}
          onRowClick={(row) => s.setDetailRow(row)}
        />
      </div>

      <PlayerEditModal
        isOpen={s.editPlayerId !== null}
        playerId={s.editPlayerId}
        onClose={() => s.setEditPlayerId(null)}
        onSaved={() => void s.load()}
        teamCode={s.teamCode || null}
        teamId={s.session?.teamId ?? null}
        actorUserId={s.session?.userId ?? "system"}
      />

      <RosterDetailModal
        isOpen={s.detailRow !== null}
        row={s.detailRow}
        onClose={() => s.setDetailRow(null)}
        teamCode={s.teamCode || null}
        teamId={s.session?.teamId ?? null}
        canEditPlayers={s.tab === "players" && s.session?.viewMode !== "player"}
        onEditPlayer={(id) => s.setEditPlayerId(id)}
      />

      {s.session?.viewMode !== "player" && !s.teamCode ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">빠른 등록 (데모)</div>
          </div>
          <div className="card-body">
            <form
              className="grid-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!s.session) return;
                const fd = new FormData(e.currentTarget);
                const svc = getTeamDataServices();
                await svc.players.create(
                  s.session.teamId,
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
                  s.session.userId,
                );
                e.currentTarget.reset();
                await s.load();
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
