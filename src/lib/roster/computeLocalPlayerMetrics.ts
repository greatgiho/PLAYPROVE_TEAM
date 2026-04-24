import type { Player } from "@/lib/types/entities";
import { readTeamDb } from "@/lib/services/local/teamDb";

/** 로컬(LocalStorage) 데모용: 해당 팀·선수의 출석·회비 건수 기반 비율 */
export function computeLocalPlayerMetrics(teamId: string, playerId: string) {
  const db = readTeamDb();
  const events = db.events.filter((e) => e.team_id === teamId && e.deleted_at == null);
  const eventIdSet = new Set(events.map((e) => e.id));
  const att = db.attendance.filter(
    (a) => a.team_id === teamId && a.player_id === playerId && a.deleted_at == null && eventIdSet.has(a.event_id),
  );
  const totalAttRows = att.length;
  const attended = att.filter((a) => a.status === "attending").length;
  const attendanceRatePercent = totalAttRows > 0 ? Math.round((100 * attended) / totalAttRows) : null;

  const dues = db.monthly_dues.filter((d) => d.team_id === teamId && d.player_id === playerId && d.deleted_at == null);
  const paid = dues.filter((d) => d.status === "paid").length;
  const duesRatePercent = dues.length > 0 ? Math.round((100 * paid) / dues.length) : null;

  return {
    attendanceRatePercent,
    attended,
    attendanceTotal: totalAttRows,
    duesRatePercent,
    duesPaid: paid,
    duesTotal: dues.length,
    periodNote: "로컬 데모: 등록된 일정·출석·회비 행 기준",
  };
}

/** 상세 모달용: 선수 엔티티 + 지표 + 활성 부상 건수 */
export function getLocalPlayerForDetailModal(teamId: string, playerId: string): {
  player: Player | null;
  metrics: ReturnType<typeof computeLocalPlayerMetrics>;
  activeInjuryCount: number;
} {
  const db = readTeamDb();
  const player =
    db.players.find((p) => p.id === playerId && p.team_id === teamId && p.deleted_at == null) ?? null;
  const metrics = computeLocalPlayerMetrics(teamId, playerId);
  const activeInjuryCount = db.injury_reports.filter(
    (ir) => ir.team_id === teamId && ir.player_id === playerId && ir.deleted_at == null && ir.is_active,
  ).length;
  return { player, metrics, activeInjuryCount };
}
