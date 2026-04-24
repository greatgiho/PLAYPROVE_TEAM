import type { AttendanceRecord, InjuryReport, MonthlyDue, TeamEvent } from "@/lib/types/entities";

/** 컨디션 로그는 로컬 시드에 없을 수 있어 최소 필드만 사용 */
export type ConditionLogLike = { player_id: string };

export type PlayerGrade = "Rookie" | "Regular" | "Veteran" | "Captain";

export const GRADE_CONFIG: Record<
  PlayerGrade,
  { min: number; max: number; icon: string; color: string; next: PlayerGrade | null; nextMin: number | null }
> = {
  Rookie: { min: 0, max: 99, icon: "🌱", color: "#8899ff", next: "Regular", nextMin: 100 },
  Regular: { min: 100, max: 199, icon: "⚡", color: "#55bb66", next: "Veteran", nextMin: 200 },
  Veteran: { min: 200, max: 349, icon: "🔥", color: "#ffcc44", next: "Captain", nextMin: 350 },
  Captain: { min: 350, max: Number.POSITIVE_INFINITY, icon: "🏆", color: "#ff9966", next: null, nextMin: null },
};

export const GRADE_ORDER: PlayerGrade[] = ["Rookie", "Regular", "Veteran", "Captain"];

export type PlayerGradeResult = {
  grade: PlayerGrade;
  gradeInfo: (typeof GRADE_CONFIG)[PlayerGrade];
  total_points: number;
  attendance_points: number;
  streak_points: number;
  dues_points: number;
  cond_points: number;
  inj_points: number;
  attendance_count: number;
  total_events: number;
  attendance_rate: number;
  current_streak: number;
  best_streak: number;
  next_grade_gap: number;
  in_grade_progress: number;
};

function determineGrade(points: number): PlayerGrade {
  if (points >= 350) return "Captain";
  if (points >= 200) return "Veteran";
  if (points >= 100) return "Regular";
  return "Rookie";
}

export function calcPlayerGrade(
  playerId: string,
  opts: {
    attendance: AttendanceRecord[];
    events: TeamEvent[];
    dues: MonthlyDue[];
    injuries: InjuryReport[];
    conditionLogs?: ConditionLogLike[];
  },
): PlayerGradeResult {
  const { attendance, events, dues, injuries, conditionLogs = [] } = opts;

  const playerAtt = attendance
    .filter((a) => a.player_id === playerId)
    .sort((a, b) => {
      const ea = events.find((e) => e.id === a.event_id);
      const eb = events.find((e) => e.id === b.event_id);
      return new Date(ea?.starts_at ?? 0).getTime() - new Date(eb?.starts_at ?? 0).getTime();
    });

  const mandatoryEvents = events.filter((e) => e.is_mandatory === true);
  const attendingCount = playerAtt.filter((a) => a.status === "attending").length;
  const totalEvents = Math.max(mandatoryEvents.length, 1);
  const attendanceRate = Math.round((attendingCount / totalEvents) * 100);

  let attendancePoints = attendingCount * 10;

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let streakPoints = 0;

  const sortedEvents = [...mandatoryEvents].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  sortedEvents.forEach((ev) => {
    const attRecord = attendance.find((a) => a.player_id === playerId && a.event_id === ev.id);
    if (attRecord?.status === "attending") {
      tempStreak++;
      if (tempStreak >= 7) streakPoints += 15;
      else if (tempStreak >= 3) streakPoints += 5;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });
  currentStreak = tempStreak;

  const playerDues = dues.filter((d) => d.player_id === playerId);
  const duesPoints = playerDues.filter((d) => d.status === "paid").length * 5;

  const condLogs = conditionLogs.filter((c) => c.player_id === playerId);
  const condPoints = condLogs.length * 3;

  const injRecords = injuries.filter((i) => i.player_id === playerId);
  const injPoints = injRecords.length * 5;

  const totalPoints = attendancePoints + streakPoints + duesPoints + condPoints + injPoints;
  const grade = determineGrade(totalPoints);
  const gradeInfo = GRADE_CONFIG[grade];

  const nextGradeGap = gradeInfo.next && gradeInfo.nextMin != null ? Math.max(0, gradeInfo.nextMin - totalPoints) : 0;

  const inGradeProgress = gradeInfo.next && gradeInfo.nextMin != null
    ? Math.round(((totalPoints - gradeInfo.min) / (gradeInfo.nextMin - gradeInfo.min)) * 100)
    : 100;

  return {
    grade,
    gradeInfo,
    total_points: totalPoints,
    attendance_points: attendancePoints,
    streak_points: streakPoints,
    dues_points: duesPoints,
    cond_points: condPoints,
    inj_points: injPoints,
    attendance_count: attendingCount,
    total_events: totalEvents,
    attendance_rate: attendanceRate,
    current_streak: currentStreak,
    best_streak: bestStreak,
    next_grade_gap: nextGradeGap,
    in_grade_progress: Math.min(100, inGradeProgress),
  };
}
