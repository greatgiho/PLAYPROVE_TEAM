"use client";

import {
  calcPlayerGrade,
  GRADE_CONFIG,
  GRADE_ORDER,
  type PlayerGrade,
  type PlayerGradeResult,
} from "@/lib/mypage/calcPlayerGrade";
import { RosterFace } from "@/components/roster/RosterFace";
import type { AttendanceRecord, InjuryReport, MonthlyDue, Player, TeamEvent } from "@/lib/types/entities";
import Link from "next/link";
import { Fragment, useMemo } from "react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function attBadge(status: AttendanceRecord["status"] | "undecided" | null | undefined) {
  const s = status ?? "undecided";
  if (s === "attending") return <span className="badge badge-attending">참석</span>;
  if (s === "absent") return <span className="badge badge-absent">불참</span>;
  return <span className="badge badge-undecided">미정</span>;
}

type Props = {
  player: Player;
  events: TeamEvent[];
  attendance: AttendanceRecord[];
  dues: MonthlyDue[];
  injuries: InjuryReport[];
  /** DB 프로필 — 팀/선수 대표 */
  rosterAvatarUrl?: string | null;
  /** DB 프로필 — 개인용 */
  personalAvatarUrl?: string | null;
};

export function MypagePlayerDashboard({
  player,
  events,
  attendance,
  dues,
  injuries,
  rosterAvatarUrl = null,
  personalAvatarUrl = null,
}: Props) {
  const gradeData: PlayerGradeResult = useMemo(
    () => calcPlayerGrade(player.id, { attendance, events, dues, injuries, conditionLogs: [] }),
    [player.id, attendance, events, dues, injuries],
  );

  const { monthAttRate, nextEvent, myInjuries } = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthEvents = events.filter((e) => e.starts_at.slice(0, 7) === prefix);
    const thisMonthAtt = attendance.filter(
      (a) => a.player_id === player.id && thisMonthEvents.some((e) => e.id === a.event_id),
    );
    const monthAttRate = thisMonthEvents.length
      ? Math.round((thisMonthAtt.filter((a) => a.status === "attending").length / thisMonthEvents.length) * 100)
      : 0;

    const nextEvent =
      events
        .filter((e) => new Date(e.starts_at) > new Date())
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null;

    const myInjuries = injuries.filter(
      (i) => i.player_id === player.id && i.is_active === true && i.approval_status === "confirmed",
    );

    return { monthAttRate, nextEvent, myInjuries };
  }, [player.id, events, attendance, injuries]);

  const allPlayerInjuries = useMemo(
    () => injuries.filter((i) => i.player_id === player.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [injuries, player.id],
  );

  const recentEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()).slice(0, 6),
    [events],
  );

  const currentGradeIdx = GRADE_ORDER.indexOf(gradeData.grade as PlayerGrade);

  const monthColor =
    monthAttRate >= 70 ? "var(--green)" : monthAttRate >= 50 ? "var(--yellow)" : "var(--red)";
  const condDisplay = "-";
  const condColor = "var(--gray-500)";

  const mainHeroPhoto =
    rosterAvatarUrl ?? personalAvatarUrl ?? player.roster_avatar_url ?? player.personal_avatar_url ?? null;
  const showPersonalBadge =
    Boolean(rosterAvatarUrl ?? player.roster_avatar_url) &&
    Boolean(personalAvatarUrl ?? player.personal_avatar_url);

  return (
    <>
      <div className="mypage-hero">
        <div className="mypage-hero-content">
          <div className="mypage-avatar" style={{ padding: 0, overflow: "visible", background: "transparent" }}>
            <div style={{ position: "relative", width: 88, height: 88 }}>
              <RosterFace name={player.full_name} photoUrl={mainHeroPhoto} size={88} />
              {showPersonalBadge ? (
                <img
                  src={personalAvatarUrl ?? player.personal_avatar_url ?? ""}
                  alt=""
                  width={40}
                  height={40}
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid rgba(255,255,255,0.95)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                />
              ) : null}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="mypage-name">{player.full_name}</div>
              <span className={`grade-badge grade-${gradeData.grade}`}>
                <span className="grade-icon">{GRADE_CONFIG[gradeData.grade as PlayerGrade].icon}</span>
                {gradeData.grade}
              </span>
            </div>
            <div className="mypage-pos">
              #{player.jersey_number ?? "—"} · {player.primary_position} · {player.unit.toUpperCase()}
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-label">
                <span>
                  {gradeData.grade} {gradeData.total_points}pt
                </span>
                <span>
                  {gradeData.gradeInfo.next
                    ? `Next: ${gradeData.gradeInfo.next} (${gradeData.next_grade_gap}pt 남음)`
                    : "최고 등급 달성!"}
                </span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${gradeData.in_grade_progress}%` }} />
              </div>
            </div>
          </div>
          {nextEvent ? (
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "12px 16px",
                minWidth: 150,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                }}
              >
                다음 일정
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                {nextEvent.title.length > 16 ? `${nextEvent.title.slice(0, 16)}…` : nextEvent.title}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{formatDateTime(nextEvent.starts_at)}</div>
              {nextEvent.location ? (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    <i className="fas fa-map-marker-alt"></i> {nextEvent.location}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mypage-cards">
        <div className="mypage-stat-card">
          <div style={{ fontSize: 20 }}>📅</div>
          <div className="mypage-stat-val" style={{ color: monthColor }}>
            {monthAttRate}%
          </div>
          <div className="mypage-stat-lbl">이번달 출석률</div>
        </div>
        <div className="mypage-stat-card">
          <div style={{ fontSize: 20 }}>🔥</div>
          <div className="mypage-stat-val" style={{ color: "var(--primary)" }}>{gradeData.current_streak}</div>
          <div className="mypage-stat-lbl">연속 출석</div>
        </div>
        <div className="mypage-stat-card">
          <div style={{ fontSize: 20 }}>💪</div>
          <div className="mypage-stat-val" style={{ color: condColor }}>
            {condDisplay}
          </div>
          <div className="mypage-stat-lbl">평균 컨디션</div>
        </div>
        <div className="mypage-stat-card">
          <div style={{ fontSize: 20 }}>🏆</div>
          <div className="mypage-stat-val" style={{ color: "var(--yellow)" }}>{gradeData.total_points}</div>
          <div className="mypage-stat-lbl">총 포인트</div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="condition-chart-wrap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fas fa-heartbeat" style={{ color: "var(--red)" }}></i> 최근 컨디션 추이
            </div>
            <button type="button" className="btn btn-sm btn-secondary" disabled title="로컬 데모에서 컨디션 로그 API는 아직 연결되지 않았습니다.">
              <i className="fas fa-plus"></i> 오늘 기록
            </button>
          </div>
          <div className="empty-state" style={{ padding: "30px 0" }}>
            <i className="fas fa-chart-line" style={{ opacity: 0.3 }}></i>
            <p>컨디션 기록이 없습니다</p>
          </div>
        </div>

        <div className="grade-progress-section" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fas fa-trophy" style={{ color: "var(--yellow)" }}></i> 선수 등급
          </div>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>활동 데이터 기반 자동 산정</div>

          <div className="grade-tier-track">
            {GRADE_ORDER.map((g, idx) => {
              const cfg = GRADE_CONFIG[g];
              const isDone = idx < currentGradeIdx;
              const isActive = idx === currentGradeIdx;
              const circleCls = isDone ? "done" : isActive ? "active" : "";
              const lineDone = idx < currentGradeIdx;
              return (
                <Fragment key={g}>
                  <div className="grade-tier-node">
                    <div className={`grade-tier-circle ${circleCls}`}>{cfg.icon}</div>
                    <div className={`grade-tier-label ${circleCls}`}>{g}</div>
                  </div>
                  {idx < GRADE_ORDER.length - 1 ? (
                    <div className={`grade-tier-line ${lineDone ? "done" : ""}`} />
                  ) : null}
                </Fragment>
              );
            })}
          </div>

          <div style={{ margin: "14px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{gradeData.grade} 구간 진행도</span>
              <span style={{ fontWeight: 800, color: "var(--primary)" }}>{gradeData.in_grade_progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill primary" style={{ width: `${gradeData.in_grade_progress}%` }} />
            </div>
            {gradeData.gradeInfo.next ? (
              <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 5 }}>
                다음 등급({gradeData.gradeInfo.next})까지 <strong>{gradeData.next_grade_gap}pt</strong> 필요
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 5, fontWeight: 700 }}>
                🏆 최고 등급 달성!
              </div>
            )}
          </div>

          <div className="points-breakdown">
            {(
              [
                {
                  icon: "📅",
                  label: "출석 포인트",
                  val: gradeData.attendance_points,
                  bg: "var(--primary-fade)",
                  color: "var(--primary)",
                },
                {
                  icon: "🔥",
                  label: "스트릭 보너스",
                  val: gradeData.streak_points,
                  bg: "var(--red-bg)",
                  color: "var(--red)",
                },
                {
                  icon: "💰",
                  label: "회비 납부",
                  val: gradeData.dues_points,
                  bg: "var(--green-bg)",
                  color: "var(--green)",
                },
                {
                  icon: "📊",
                  label: "컨디션 리포트",
                  val: gradeData.cond_points,
                  bg: "var(--blue-bg)",
                  color: "var(--blue)",
                },
              ] as const
            ).map((it) => (
              <div className="point-item" key={it.label}>
                <div className="point-icon" style={{ background: it.bg, color: it.color }}>
                  {it.icon}
                </div>
                <div>
                  <div className="point-val" style={{ color: it.color }}>
                    +{it.val}
                  </div>
                  <div className="point-lbl">{it.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-calendar-check"></i> 출석 히스토리
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
              {gradeData.attendance_rate}% 출석
            </span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {recentEvents.map((ev) => {
              const att = attendance.find((a) => a.player_id === player.id && a.event_id === ev.id);
              const s = att?.status ?? "undecided";
              const dot =
                s === "attending" ? "var(--green)" : s === "absent" ? "var(--red)" : "var(--gray-300)";
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--gray-100)",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {ev.title.length > 22 ? `${ev.title.slice(0, 22)}…` : ev.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{formatDate(ev.starts_at)}</div>
                  <div>{attBadge(s)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-medkit"></i> 나의 건강 현황
            </div>
            <Link href="/app/injury" className="btn btn-sm btn-secondary">
              전체 보기
            </Link>
          </div>
          <div className="card-body">
            {myInjuries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: "var(--green)" }}>컨디션 이상 없음</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>현재 활성 부상 없음</div>
              </div>
            ) : (
              myInjuries.map((i) => (
                <div
                  key={i.id}
                  style={{
                    background: "var(--red-bg)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--red)" }}>{i.body_part}</span>
                    <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 800 }}>
                      통증 {i.pain_level}/10
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gray-700)" }}>{i.symptoms ?? ""}</div>
                  {i.expected_return_date ? (
                    <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>
                      복귀 예정: {i.expected_return_date}
                    </div>
                  ) : null}
                </div>
              ))
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--gray-100)" }}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 8, fontWeight: 600 }}>
                이번 시즌 전체 부상 이력
              </div>
              {allPlayerInjuries.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--gray-300)" }}>기록 없음</div>
              ) : (
                allPlayerInjuries.map((i) => (
                  <div
                    key={`hist-${i.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12 }}
                  >
                    <span style={{ color: i.is_active ? "var(--red)" : "var(--green)" }}>
                      {i.is_active ? "●" : "○"}
                    </span>
                    <span>
                      {i.body_part} (통증 {i.pain_level})
                    </span>
                    <span style={{ color: "var(--gray-500)" }}>{i.expected_return_date ?? ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
