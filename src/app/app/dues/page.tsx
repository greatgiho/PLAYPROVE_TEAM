"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { MonthlyDue, Player } from "@/lib/types/entities";
import { useEffect, useMemo, useState } from "react";

export default function DuesPage() {
  return (
    <AccessGuard page="dues">
      <DuesInner />
    </AccessGuard>
  );
}

function DuesInner() {
  const { session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [dues, setDues] = useState<MonthlyDue[]>([]);
  const months = useMemo(() => ["2026-01", "2026-02", "2026-03", "2026-04"], []);

  const load = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    const [p, d] = await Promise.all([
      svc.players.listByTeam(session.teamId),
      svc.dues.listByTeam(session.teamId),
    ]);
    setPlayers(p.filter((x) => x.player_status !== "military_leave"));
    setDues(d);
  };

  useEffect(() => {
    void load();
  }, [session]);

  const map = useMemo(() => {
    const m = new Map<string, MonthlyDue>();
    for (const d of dues) m.set(`${d.player_id}_${d.due_month}`, d);
    return m;
  }, [dues]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-won-sign"></i> 회비 관리
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>선수</th>
                {months.map((m) => (
                  <th key={m} style={{ textAlign: "center" }}>
                    {m.slice(5)}월
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 800 }}>{p.full_name}</td>
                  {months.map((m) => {
                    const d = map.get(`${p.id}_${m}`);
                    const s = d?.status ?? "unpaid";
                    return (
                      <td key={m} style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className={`badge badge-${s === "paid" ? "paid" : "unpaid"}`}
                          style={{ cursor: "pointer", border: "none" }}
                          onClick={async () => {
                            if (!session) return;
                            const next = s === "paid" ? "unpaid" : "paid";
                            const svc = getTeamDataServices();
                            const saved = await svc.dues.upsertMonth(session.teamId, p.id, m, next, session.userId);
                            setDues((prev) => {
                              const others = prev.filter((x) => x.id !== saved.id);
                              return [...others, saved];
                            });
                          }}
                        >
                          {s === "paid" ? "✓" : "✗"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
