"use client";

import { RosterFace } from "@/components/roster/RosterFace";
import { getLocalPlayerForDetailModal } from "@/lib/roster/computeLocalPlayerMetrics";
import type { Player } from "@/lib/types/entities";
import type { RosterTableRow } from "@/lib/types/rosterTable";
import { apiErrorUserHint, type ApiErrorBody } from "@/lib/client/apiErrorHint";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = {
  isOpen: boolean;
  row: RosterTableRow | null;
  onClose: () => void;
  teamCode: string | null;
  teamId: string | null;
  onEditPlayer?: (playerId: string) => void;
  canEditPlayers?: boolean;
};

function playerStatusKo(code: string): string {
  switch (code) {
    case "active":
      return "활성";
    case "injured":
      return "부상";
    case "leave_absence":
      return "휴학";
    case "military_leave":
      return "군휴학";
    default:
      return code;
  }
}

function staffMemberStatusKo(code: string): string {
  switch (code) {
    case "active":
      return "활성";
    case "pending":
      return "대기";
    case "suspended":
      return "정지";
    case "left":
      return "퇴단";
    default:
      return code;
  }
}

function statusBadgeStyle(playerStatus: string): { bg: string; color: string } {
  switch (playerStatus) {
    case "active":
      return { bg: "var(--green-bg)", color: "var(--green)" };
    case "injured":
      return { bg: "var(--red-bg)", color: "var(--red)" };
    case "leave_absence":
    case "military_leave":
      return { bg: "var(--yellow-bg)", color: "var(--yellow)" };
    default:
      return { bg: "var(--gray-100)", color: "var(--gray-700)" };
  }
}

function staffBadgeStyle(memberStatus: string): { bg: string; color: string } {
  switch (memberStatus) {
    case "active":
      return { bg: "var(--green-bg)", color: "var(--green)" };
    case "pending":
      return { bg: "var(--yellow-bg)", color: "var(--yellow)" };
    case "suspended":
      return { bg: "var(--red-bg)", color: "var(--red)" };
    case "left":
      return { bg: "var(--gray-100)", color: "var(--gray-700)" };
    default:
      return { bg: "var(--gray-100)", color: "var(--gray-700)" };
  }
}

type PlayerSummaryPayload = {
  kind: "player";
  player: Player;
  metrics: {
    attendance: { ratePercent: number | null; attended: number; total: number; note: string };
    dues: { ratePercent: number | null; paid: number; total: number; note: string };
    injury?: { activeCount: number };
  };
};

type StaffSummaryPayload = {
  kind: "staff";
  staff: {
    full_name: string;
    phone: string | null;
    email: string | null;
    roleLabel: string;
    title: string;
    memberStatus: string;
    joinedAt: string | null;
  };
  metrics: { note: string };
};

function GridItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-900)" }}>{children}</div>
    </div>
  );
}

function StatCard({ value, label, valueColor }: { value: ReactNode; label: string; valueColor: string }) {
  return (
    <div
      style={{
        background: "var(--gray-100)",
        borderRadius: 10,
        padding: "18px 12px",
        textAlign: "center",
        minHeight: 88,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ color: valueColor, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
      <div style={{ color: "var(--gray-500)", fontSize: 12, marginTop: 10, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function RosterDetailModal({ isOpen, row, onClose, teamCode, teamId, onEditPlayer, canEditPlayers }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [playerPayload, setPlayerPayload] = useState<PlayerSummaryPayload | null>(null);
  const [staffPayload, setStaffPayload] = useState<StaffSummaryPayload | null>(null);
  const [localDetail, setLocalDetail] = useState<ReturnType<typeof getLocalPlayerForDetailModal> | null>(null);

  const useDb = Boolean(teamCode?.trim());

  const reset = useCallback(() => {
    setErr(null);
    setPlayerPayload(null);
    setStaffPayload(null);
    setLocalDetail(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !row) {
      reset();
      return;
    }
    const r = row;
    reset();
    let cancelled = false;

    async function run() {
      if (r.kind === "player") {
        if (useDb && teamCode) {
          setLoading(true);
          try {
            const res = await fetch(
              `/api/roster/players/${encodeURIComponent(r.id)}/summary?teamCode=${encodeURIComponent(teamCode)}`,
              { cache: "no-store", credentials: "include" },
            );
            const json = (await res.json().catch(() => null)) as PlayerSummaryPayload | ApiErrorBody | null;
            if (!res.ok) {
              if (!cancelled) setErr(apiErrorUserHint(res.status, json as ApiErrorBody));
            } else if (!cancelled) {
              setPlayerPayload(json as PlayerSummaryPayload);
            }
          } catch (e) {
            if (!cancelled) setErr(e instanceof Error ? e.message : "load_failed");
          } finally {
            if (!cancelled) setLoading(false);
          }
          return;
        }
        if (teamId) {
          const detail = getLocalPlayerForDetailModal(teamId, r.id);
          if (!cancelled) setLocalDetail(detail);
          return;
        }
        if (!cancelled) setErr("team_context_missing");
        return;
      }

      if (r.kind === "staff") {
        if (useDb && teamCode) {
          setLoading(true);
          try {
            const res = await fetch(
              `/api/roster/staff/${encodeURIComponent(r.id)}/summary?teamCode=${encodeURIComponent(teamCode)}`,
              { cache: "no-store", credentials: "include" },
            );
            const json = (await res.json().catch(() => null)) as StaffSummaryPayload | ApiErrorBody | null;
            if (!res.ok) {
              if (!cancelled) setErr(apiErrorUserHint(res.status, json as ApiErrorBody));
            } else if (!cancelled) {
              setStaffPayload(json as StaffSummaryPayload);
            }
          } catch (e) {
            if (!cancelled) setErr(e instanceof Error ? e.message : "load_failed");
          } finally {
            if (!cancelled) setLoading(false);
          }
          return;
        }
        if (!cancelled) setErr("staff_summary_requires_db");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, row, reset, teamCode, teamId, useDb]);

  if (!isOpen || !row) return null;

  const isPlayer = row.kind === "player";
  const modalTitle = isPlayer ? "선수 상세 정보" : "스태프 상세 정보";

  const playerEntity = isPlayer ? (playerPayload?.player ?? localDetail?.player ?? null) : null;
  const awaitingPlayerDetail = isPlayer && loading && !playerEntity;

  const displayStatus = isPlayer
    ? playerEntity?.player_status ?? row.player_status
    : staffPayload
      ? staffPayload.staff.memberStatus
      : row.player_status;
  const statusLabel = isPlayer ? playerStatusKo(displayStatus) : staffMemberStatusKo(displayStatus);
  const badgeColors = isPlayer ? statusBadgeStyle(displayStatus) : staffBadgeStyle(displayStatus);

  const contact = isPlayer
    ? awaitingPlayerDetail
      ? "…"
      : (playerEntity?.phone ?? row.phone ?? "—")
    : staffPayload
      ? (staffPayload.staff.phone ?? "—")
      : row.phone ?? "—";

  const joinYearText = !isPlayer
    ? "—"
    : awaitingPlayerDetail
      ? "…"
      : playerEntity?.join_year != null
        ? `${playerEntity.join_year}년`
        : "—";

  const heightText = !isPlayer
    ? "—"
    : awaitingPlayerDetail
      ? "…"
      : playerEntity?.height_cm != null
        ? `${playerEntity.height_cm} cm`
        : "—";
  const weightText = !isPlayer
    ? "—"
    : awaitingPlayerDetail
      ? "…"
      : playerEntity?.weight_kg != null
        ? `${playerEntity.weight_kg} kg`
        : "—";

  const primaryPos = isPlayer
    ? awaitingPlayerDetail
      ? "…"
      : (playerEntity?.primary_position ?? row.primary_position)
    : row.primary_position;
  const secondaryPos = isPlayer
    ? awaitingPlayerDetail
      ? "…"
      : playerEntity?.secondary_position?.trim()
        ? playerEntity.secondary_position
        : "—"
    : "—";

  const memoText = isPlayer
    ? awaitingPlayerDetail
      ? "…"
      : playerEntity?.notes?.trim()
        ? playerEntity.notes
        : "—"
    : "—";

  const jersey = row.jersey_number != null ? `#${row.jersey_number}` : "#—";
  const subtitleLine = isPlayer
    ? `${jersey} · ${row.primary_position} · ${row.unit}`
    : `${row.unit} · ${row.primary_position}`;

  const attendancePercent =
    isPlayer && playerPayload
      ? playerPayload.metrics.attendance.ratePercent ?? 0
      : isPlayer && localDetail
        ? localDetail.metrics.attendanceRatePercent ?? 0
        : null;

  const activeInjuryCount =
    isPlayer && playerPayload
      ? playerPayload.metrics.injury?.activeCount ?? 0
      : isPlayer && localDetail
        ? localDetail.activeInjuryCount
        : null;

  const duesPaid =
    isPlayer && playerPayload
      ? playerPayload.metrics.dues.paid
      : isPlayer && localDetail
        ? localDetail.metrics.duesPaid
        : null;
  const duesTotal =
    isPlayer && playerPayload
      ? playerPayload.metrics.dues.total
      : isPlayer && localDetail
        ? localDetail.metrics.duesTotal
        : null;

  const showPlayerStats = isPlayer && !err && (playerPayload != null || localDetail != null) && !loading;
  const duesLine =
    duesPaid != null && duesTotal != null ? `${duesPaid}/${duesTotal}` : isPlayer && loading ? "…" : "—";

  return (
    <div
      className="modal-backdrop show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rosterDetailTitle"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 640 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="rosterDetailTitle">
            {modalTitle}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: 8 }}>
          {/* 헤더: 아바타 + 이름 + 뱃지 + 한 줄 요약 */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <RosterFace name={row.full_name} photoUrl={row.roster_photo_url} size={64} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: "var(--gray-900)" }}>{row.full_name}</div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    background: badgeColors.bg,
                    color: badgeColors.color,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 6 }}>{subtitleLine}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--gray-100)", marginBottom: 18 }} />

          {loading ? (
            <p style={{ margin: "0 0 16px", color: "var(--gray-600)", fontSize: 14 }}>상세 정보를 불러오는 중…</p>
          ) : null}

          {err ? (
            <div style={{ color: "var(--danger, #b42318)", marginBottom: 16, fontSize: 13 }}>{err}</div>
          ) : null}

          {!isPlayer && staffPayload ? (
            <div className="form-row" style={{ marginBottom: 8 }}>
              <GridItem label="연락처">{staffPayload.staff.phone ?? "—"}</GridItem>
              <GridItem label="이메일">{staffPayload.staff.email ?? "—"}</GridItem>
            </div>
          ) : null}
          {!isPlayer && staffPayload ? (
            <div className="form-row" style={{ marginBottom: 8 }}>
              <GridItem label="역할">{staffPayload.staff.roleLabel}</GridItem>
              <GridItem label="직함">{staffPayload.staff.title}</GridItem>
            </div>
          ) : null}

          {isPlayer && !err ? (
            <>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <GridItem label="연락처">{contact}</GridItem>
                <GridItem label="입단">{joinYearText}</GridItem>
              </div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <GridItem label="신장">{heightText}</GridItem>
                <GridItem label="체중">{weightText}</GridItem>
              </div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <GridItem label="주포지션">
                  <span style={{ fontWeight: 800 }}>{primaryPos}</span>
                </GridItem>
                <GridItem label="부포지션">{secondaryPos}</GridItem>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 4 }}>메모</div>
                <div style={{ fontSize: 14, color: "var(--gray-900)", lineHeight: 1.5 }}>{memoText}</div>
              </div>
            </>
          ) : null}

          {isPlayer && showPlayerStats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <StatCard value={`${attendancePercent ?? 0}%`} label="출석률" valueColor="var(--red)" />
              <StatCard value={activeInjuryCount ?? 0} label="활성 부상" valueColor="var(--green)" />
              <StatCard value={duesLine} label="회비 납부" valueColor="var(--blue)" />
            </div>
          ) : null}

          {!isPlayer && staffPayload ? (
            <>
              <div style={{ borderTop: "1px solid var(--gray-100)", margin: "16px 0" }} />
              <p style={{ margin: 0, fontSize: 13, color: "var(--gray-600)" }}>{staffPayload.metrics.note}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <StatCard value="—" label="출석률" valueColor="var(--gray-500)" />
                <StatCard value="—" label="활성 부상" valueColor="var(--gray-500)" />
                <StatCard value="—" label="회비 납부" valueColor="var(--gray-500)" />
              </div>
            </>
          ) : null}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
          {isPlayer && canEditPlayers && onEditPlayer ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onEditPlayer(row.id);
                onClose();
              }}
            >
              수정
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
