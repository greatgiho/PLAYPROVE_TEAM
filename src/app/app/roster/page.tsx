"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player } from "@/lib/types/entities";
import { useEffect, useMemo, useState } from "react";

export default function RosterPage() {
  return (
    <AccessGuard page="roster">
      <RosterInner />
    </AccessGuard>
  );
}

function RosterInner() {
  const { session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    setPlayers(await svc.players.listByTeam(session.teamId));
  };

  useEffect(() => {
    void load();
  }, [session]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter(
      (p) =>
        p.full_name.toLowerCase().includes(s) ||
        p.primary_position.toLowerCase().includes(s) ||
        String(p.jersey_number ?? "").includes(s),
    );
  }, [players, q]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-users"></i> 선수단 로스터
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <i className="fas fa-search"></i>
          <input className="search-input" placeholder="이름, 포지션, 번호 검색…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>선수</th>
                <th>번호</th>
                <th>유닛</th>
                <th>포지션</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {session?.viewMode !== "player" ? (
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
                    unit: (String(fd.get("unit") || "offense") as Player["unit"]),
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
