"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { InjuryReport, Player } from "@/lib/types/entities";
import { useEffect, useMemo, useState } from "react";

export default function InjuryPage() {
  return (
    <AccessGuard page="injury">
      <InjuryInner />
    </AccessGuard>
  );
}

function InjuryInner() {
  const { session } = useSession();
  const [rows, setRows] = useState<InjuryReport[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const load = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    const [i, p] = await Promise.all([
      svc.injuries.listByTeam(session.teamId),
      svc.players.listByTeam(session.teamId),
    ]);
    setRows(i);
    setPlayers(p);
  };

  useEffect(() => {
    void load();
  }, [session]);

  const isPlayer = session?.viewMode === "player";
  const isManagerView = session?.viewMode === "manager";

  const visible = useMemo(() => {
    if (!session) return [];
    return rows.filter((r) => {
      if (isPlayer && session.playerId) return r.player_id === session.playerId;
      return true;
    });
  }, [rows, isPlayer, session]);

  const name = (id: string) => players.find((p) => p.id === id)?.full_name ?? id;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-medkit"></i> 부상·컨디션
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            if (!session) return;
            const body = window.prompt("부상 부위") || "";
            if (!body) return;
            const pain = Number(window.prompt("통증(1-10)", "5") || "5");
            const playerId =
              isPlayer && session.playerId
                ? session.playerId
                : window.prompt("player UUID (데모)") || players[0]?.id;
            if (!playerId) return;
            const svc = getTeamDataServices();
            await svc.injuries.create(
              session.teamId,
              {
                player_id: playerId,
                body_part: body,
                pain_level: Number.isFinite(pain) ? pain : 5,
                symptoms: "",
                participation_level: "limited",
                expected_return_date: null,
              },
              session.userId,
              isPlayer,
            );
            await load();
          }}
        >
          <i className="fas fa-plus"></i> {isPlayer ? "부상 신청" : "리포트 등록"}
        </button>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>선수</th>
                <th>부위</th>
                <th>통증</th>
                <th>승인</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{name(r.player_id)}</td>
                  <td style={{ fontWeight: 800 }}>{r.body_part}</td>
                  <td>{r.pain_level}</td>
                  <td>{r.approval_status}</td>
                  <td>
                    {r.approval_status === "pending" && isManagerView ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={async () => {
                          if (!session) return;
                          const svc = getTeamDataServices();
                          await svc.injuries.patch(
                            session.teamId,
                            r.id,
                            { approval_status: "confirmed", is_active: true },
                            session.userId,
                          );
                          const player = players.find((p) => p.id === r.player_id);
                          if (player) {
                            await svc.players.patchStatus(session.teamId, player.id, "injured", session.userId);
                          }
                          await load();
                        }}
                      >
                        확정
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
