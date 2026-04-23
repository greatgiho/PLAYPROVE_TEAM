"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player } from "@/lib/types/entities";
import { useEffect, useMemo, useState } from "react";

export default function DepthChartPage() {
  return (
    <AccessGuard page="depthchart">
      <DepthInner />
    </AccessGuard>
  );
}

function DepthInner() {
  const { session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [unit, setUnit] = useState<Player["unit"]>("offense");

  useEffect(() => {
    if (!session) return;
    void getTeamDataServices()
      .players.listByTeam(session.teamId)
      .then(setPlayers);
  }, [session]);

  const grouped = useMemo(() => {
    const m = new Map<string, Player[]>();
    for (const p of players.filter((x) => x.unit === unit && x.player_status === "active")) {
      const k = p.primary_position || "UNK";
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [players, unit]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-sitemap"></i> 뎁스 차트
        </div>
      </div>

      <div className="tabs">
        {(["offense", "defense", "special"] as const).map((u) => (
          <button key={u} type="button" className={`tab-btn ${unit === u ? "active" : ""}`} onClick={() => setUnit(u)}>
            {u}
          </button>
        ))}
      </div>

      {[...grouped.entries()].map(([pos, plist]) => (
        <div key={pos} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gray-500)", marginBottom: 10 }}>{pos}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {plist.slice(0, 3).map((p) => (
              <div key={p.id} className="depth-slot" style={{ minWidth: 120 }}>
                <div className="depth-player-name">{p.full_name}</div>
                <div style={{ fontSize: 10, color: "var(--gray-500)" }}>#{p.jersey_number}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
