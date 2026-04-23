"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { useSession } from "@/lib/context/SessionContext";
import { getTeamDataServices } from "@/lib/services/getTeamDataServices";
import type { Player, TeamEvent } from "@/lib/types/entities";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function DashboardPage() {
  return (
    <AccessGuard page="dashboard">
      <DashboardInner />
    </AccessGuard>
  );
}

function DashboardInner() {
  const { session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [injuries, setInjuries] = useState(0);
  const pieRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!session) return;
    const svc = getTeamDataServices();
    void (async () => {
      const [p, e, inj] = await Promise.all([
        svc.players.listByTeam(session.teamId),
        svc.events.listByTeam(session.teamId),
        svc.injuries.listByTeam(session.teamId),
      ]);
      setPlayers(p);
      setEvents(e);
      setInjuries(inj.filter((i) => i.is_active).length);
    })();
  }, [session]);

  const latestEvent = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0] ?? null;
  }, [events]);

  useEffect(() => {
    if (!latestEvent || !pieRef.current) return;
    const svc = getTeamDataServices();
    void (async () => {
      if (!session) return;
      const att = await svc.attendance.listByTeam(session.teamId);
      const evAtt = att.filter((a) => a.event_id === latestEvent.id);
      const attending = evAtt.filter((a) => a.status === "attending").length;
      const absent = evAtt.filter((a) => a.status === "absent").length;
      const undecided = Math.max(0, players.length - attending - absent);

      const ctx = pieRef.current!;
      const inst = Chart.getChart(ctx);
      inst?.destroy();
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["참석", "불참", "미정"],
          datasets: [
            {
              data: [attending, absent, undecided],
              backgroundColor: ["#1a8a4a", "#c0392b", "#8a8a8a"],
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          cutout: "65%",
          plugins: { legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12 } } },
        },
      });
    })();
  }, [latestEvent, players.length, session]);

  const active = players.filter((p) => p.player_status === "active").length;
  const injuredPlayers = players.filter((p) => p.player_status === "injured").length;

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="kpi-label">전체 선수</div>
          <div className="kpi-value">{players.length}</div>
          <div className="kpi-sub">활성 {active}명</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon">
            <i className="fas fa-medkit"></i>
          </div>
          <div className="kpi-label">활성 부상 케이스</div>
          <div className="kpi-value">{injuries}</div>
          <div className="kpi-sub">부상 상태 선수 {injuredPlayers}명</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div className="kpi-label">등록 일정</div>
          <div className="kpi-value">{events.length}</div>
          <div className="kpi-sub">{latestEvent ? latestEvent.title : "일정 없음"}</div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-calendar-alt"></i> 다가오는 일정
            </div>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {events.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 0" }}>
                <i className="fas fa-calendar"></i>
                <p>일정 없음</p>
              </div>
            ) : (
              [...events]
                .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                .slice(0, 4)
                .map((e) => (
                  <div key={e.id} className={`event-card ${e.event_type}`} style={{ marginBottom: 8 }}>
                    <div className="event-type-icon">📅</div>
                    <div className="event-meta">
                      <div className="event-title">{e.title}</div>
                      <div className="event-info">
                        <span>
                          <i className="far fa-clock"></i>
                          {new Date(e.starts_at).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-chart-pie"></i> 최근 일정 출결(선택)
            </div>
          </div>
          <div className="card-body" style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {latestEvent ? <canvas ref={pieRef} style={{ maxHeight: 220 }} /> : <div className="empty-state">데이터 없음</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
