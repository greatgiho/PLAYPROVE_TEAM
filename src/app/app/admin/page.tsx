"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { JoinRequest } from "@/lib/types/entities";
import { useEffect, useState } from "react";

export default function AdminPage() {
  return (
    <AccessGuard page="admin">
      <AdminInner />
    </AccessGuard>
  );
}

function AdminInner() {
  const { session } = useSession();
  const [rows, setRows] = useState<JoinRequest[]>([]);

  const load = async () => {
    if (!session) return;
    const svc = getTeamDataServices();
    setRows(await svc.joinRequests.listByTeam(session.teamId));
  };

  useEffect(() => {
    void load();
  }, [session]);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-user-check"></i> 가입 승인 관리
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {rows.filter((r) => r.status === "pending").length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-check-circle" style={{ color: "var(--green)" }}></i>
              <p>대기 중인 요청이 없습니다</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rows
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <div key={r.id} className="team-result-card" style={{ border: "1px solid var(--gray-100)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900 }}>{r.user_id}</div>
                      <div style={{ fontSize: 12, color: "var(--gray-600)" }}>
                        역할: {r.requested_role} · 포지션: {r.requested_position ?? "-"}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 8 }}>{r.message}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={async () => {
                          if (!session) return;
                          const svc = getTeamDataServices();
                          await svc.joinRequests.patch(
                            session.teamId,
                            r.id,
                            {
                              status: "approved",
                              reviewed_by: session.userId,
                              reviewed_at: new Date().toISOString(),
                              reject_reason: null,
                            },
                            session.userId,
                          );
                          await load();
                        }}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={async () => {
                          if (!session) return;
                          const svc = getTeamDataServices();
                          await svc.joinRequests.patch(
                            session.teamId,
                            r.id,
                            {
                              status: "rejected",
                              reviewed_by: session.userId,
                              reviewed_at: new Date().toISOString(),
                              reject_reason: "데모 거절",
                            },
                            session.userId,
                          );
                          await load();
                        }}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
