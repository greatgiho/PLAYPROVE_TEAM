/* ============================================================
   gamification.js — 선수 등급 계산 엔진
   PlayProve Team ERP v2

   등급 체계:
   ┌──────────┬───────────────┬──────────────────────────────┐
   │  Grade   │  Min Points   │  기준 설명                    │
   ├──────────┼───────────────┼──────────────────────────────┤
   │  Rookie  │      0        │  신입 (포인트 0~99)            │
   │  Regular │    100        │  정규 멤버 (100~199)           │
   │  Veteran │    200        │  베테랑 (200~349)              │
   │  Captain │    350        │  주장급 (350+)                 │
   └──────────┴───────────────┴──────────────────────────────┘

   포인트 계산 기준:
   - 출석 1회  = +10pt
   - 연속 출석 3회 = 추가 +5pt / 회
   - 연속 출석 7회 = 추가 +15pt / 회 (스트릭 보너스)
   - 회비 납부 (매월) = +5pt
   - 컨디션 리포트 제출 = +3pt
   - 부상 리포트 성실 기록 = +5pt
   ============================================================ */

const GRADE_CONFIG = {
  Rookie:  { min: 0,   max: 99,  icon: '🌱', color: '#8899ff', next: 'Regular',  nextMin: 100 },
  Regular: { min: 100, max: 199, icon: '⚡', color: '#55bb66', next: 'Veteran',  nextMin: 200 },
  Veteran: { min: 200, max: 349, icon: '🔥', color: '#ffcc44', next: 'Captain', nextMin: 350 },
  Captain: { min: 350, max: Infinity, icon: '🏆', color: '#ff9966', next: null, nextMin: null }
};

const GRADE_ORDER = ['Rookie', 'Regular', 'Veteran', 'Captain'];

/**
 * 선수의 활동 데이터를 기반으로 포인트를 계산하고 등급을 결정한다.
 * @param {string} playerId
 * @param {object} opts - { players, attendance, events, dues, injuries, conditionLogs }
 * @returns {{ grade, total_points, breakdown, attendance_rate, current_streak, best_streak, next_grade_gap }}
 */
function calcPlayerGrade(playerId, opts) {
  const { attendance, events, dues, injuries, conditionLogs } = opts;

  // ── 1. 출석 분석 ──────────────────────────────────────
  const playerAtt = attendance
    .filter(a => a.player_id === playerId)
    .sort((a, b) => {
      const ea = events.find(e => e.id === a.event_id);
      const eb = events.find(e => e.id === b.event_id);
      return new Date(ea?.starts_at || 0) - new Date(eb?.starts_at || 0);
    });

  const mandatoryEvents = events.filter(e => e.is_mandatory === true || e.is_mandatory === 'true');
  const attendingCount = playerAtt.filter(a => a.status === 'attending').length;
  const totalEvents = mandatoryEvents.length || 1;
  const attendanceRate = Math.round((attendingCount / totalEvents) * 100);

  let attendancePoints = attendingCount * 10;

  // ── 2. 스트릭(연속 출석) 계산 ───────────────────────────
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let streakPoints = 0;

  const sortedEvents = [...mandatoryEvents].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  sortedEvents.forEach(ev => {
    const attRecord = attendance.find(a => a.player_id === playerId && a.event_id === ev.id);
    if (attRecord?.status === 'attending') {
      tempStreak++;
      if (tempStreak >= 7)       streakPoints += 15;
      else if (tempStreak >= 3)  streakPoints += 5;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });
  currentStreak = tempStreak;

  // ── 3. 회비 포인트 ──────────────────────────────────────
  const playerDues = dues.filter(d => d.player_id === playerId);
  const duesPoints = playerDues.filter(d => d.status === 'paid').length * 5;

  // ── 4. 컨디션 리포트 포인트 ────────────────────────────
  const condLogs = conditionLogs.filter(c => c.player_id === playerId);
  const condPoints = condLogs.length * 3;

  // ── 5. 부상 리포트 포인트 ──────────────────────────────
  const injRecords = injuries.filter(i => i.player_id === playerId);
  const injPoints = injRecords.length * 5;

  // ── 6. 총 포인트 & 등급 결정 ────────────────────────────
  const totalPoints = attendancePoints + streakPoints + duesPoints + condPoints + injPoints;
  const grade = determineGrade(totalPoints);
  const gradeInfo = GRADE_CONFIG[grade];

  // 다음 등급까지 필요 포인트
  const nextGradeGap = gradeInfo.next
    ? Math.max(0, gradeInfo.nextMin - totalPoints)
    : 0;

  // 현재 등급 내 진행률 (%)
  const inGradeProgress = gradeInfo.next
    ? Math.round(((totalPoints - gradeInfo.min) / (gradeInfo.nextMin - gradeInfo.min)) * 100)
    : 100;

  return {
    grade,
    gradeInfo,
    total_points:       totalPoints,
    attendance_points:  attendancePoints,
    streak_points:      streakPoints,
    dues_points:        duesPoints,
    cond_points:        condPoints,
    inj_points:         injPoints,
    attendance_count:   attendingCount,
    total_events:       totalEvents,
    attendance_rate:    attendanceRate,
    current_streak:     currentStreak,
    best_streak:        bestStreak,
    next_grade_gap:     nextGradeGap,
    in_grade_progress:  Math.min(100, inGradeProgress)
  };
}

function determineGrade(points) {
  if (points >= 350) return 'Captain';
  if (points >= 200) return 'Veteran';
  if (points >= 100) return 'Regular';
  return 'Rookie';
}

/** 등급 배지 HTML 반환 */
function gradeBadgeHTML(grade, large = false) {
  const g = GRADE_CONFIG[grade] || GRADE_CONFIG['Rookie'];
  const cls = large ? 'grade-badge grade-badge-lg' : 'grade-badge';
  return `<span class="${cls} grade-${grade}"><span class="grade-icon">${g.icon}</span>${grade}</span>`;
}

/** 등급 진행 트랙 HTML 반환 */
function gradeTierTrackHTML(currentGrade) {
  const currentIdx = GRADE_ORDER.indexOf(currentGrade);
  let html = '<div class="grade-tier-track">';

  GRADE_ORDER.forEach((g, idx) => {
    const isDone   = idx < currentIdx;
    const isActive = idx === currentIdx;
    const cfg = GRADE_CONFIG[g];
    const cls = isDone ? 'done' : isActive ? 'active' : '';

    html += `<div class="grade-tier-node">
      <div class="grade-tier-circle ${cls}">${cfg.icon}</div>
      <div class="grade-tier-label ${cls}">${g}</div>
    </div>`;

    if (idx < GRADE_ORDER.length - 1) {
      html += `<div class="grade-tier-line ${isDone ? 'done' : ''}"></div>`;
    }
  });

  html += '</div>';
  return html;
}

/** 포인트 내역 카드 HTML */
function pointsBreakdownHTML(gradeData) {
  const items = [
    { icon: '📅', label: '출석 포인트',     val: gradeData.attendance_points, bg: 'var(--primary-fade)',  color: 'var(--primary)' },
    { icon: '🔥', label: '스트릭 보너스',   val: gradeData.streak_points,     bg: 'var(--red-bg)',        color: 'var(--red)' },
    { icon: '💰', label: '회비 납부',        val: gradeData.dues_points,       bg: 'var(--green-bg)',      color: 'var(--green)' },
    { icon: '📊', label: '컨디션 리포트',   val: gradeData.cond_points,       bg: 'var(--blue-bg)',       color: 'var(--blue)' },
  ];
  return `<div class="points-breakdown">
    ${items.map(it => `
      <div class="point-item">
        <div class="point-icon" style="background:${it.bg};color:${it.color}">${it.icon}</div>
        <div>
          <div class="point-val" style="color:${it.color}">+${it.val}</div>
          <div class="point-lbl">${it.label}</div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

/* Leaderboard 랭킹 생성 */
function buildLeaderboard(players, attendance, events, dues, injuries, conditionLogs) {
  return players
    .filter(p => p.player_status !== 'military_leave')
    .map(p => {
      const g = calcPlayerGrade(p.id, { attendance, events, dues, injuries, conditionLogs });
      return { player: p, ...g };
    })
    .sort((a, b) => b.total_points - a.total_points);
}
