/* ============================================================
   training_plan.js — 훈련 타임테이블 + 카드 시스템
   MANAGEMENT > 훈련 계획  /  COACHING > 훈련계획 작성
   PlayProve ERP v3
   ============================================================ */

/* ─────────────────────────────────────────────
   상수 & 메타
───────────────────────────────────────────── */
const TP = {
  COLS: {
    team:    { label: 'TEAM OVERALL', icon: 'fa-users',       color: '#374151', bg: '#f3f4f6', border: '#374151' },
    offense: { label: 'OFFENSE',      icon: 'fa-arrow-right', color: '#1a5ca8', bg: '#eff6ff', border: '#1a5ca8' },
    defense: { label: 'DEFENSE',      icon: 'fa-shield-alt',  color: '#7B1818', bg: '#fff1f1', border: '#7B1818' },
    special: { label: 'SPECIAL',      icon: 'fa-star',        color: '#a87b00', bg: '#fffbeb', border: '#a87b00' },
  },
  BLOCK_TYPES: {
    warmup:       { label: '워밍업',       icon: 'fa-fire',            color: '#f97316' },
    stretch:      { label: '스트레칭',     icon: 'fa-child',           color: '#10b981' },
    conditioning: { label: '컨디셔닝',     icon: 'fa-heartbeat',       color: '#ef4444' },
    drill:        { label: '포지션 드릴',  icon: 'fa-dumbbell',        color: '#1a5ca8' },
    walkthroughs: { label: 'Walk-Through', icon: 'fa-walking',         color: '#7c3aed' },
    scrimmage:    { label: '스크리미지',   icon: 'fa-football-ball',   color: '#374151' },
    film:         { label: '필름 분석',    icon: 'fa-film',            color: '#0891b2' },
    meeting:      { label: '팀 미팅',      icon: 'fa-comments',        color: '#059669' },
    ladder:       { label: '사다리 드릴',  icon: 'fa-th',              color: '#7c3aed' },
    individual:   { label: '개인 훈련',   icon: 'fa-user',            color: '#d97706' },
    break:        { label: 'BREAK',        icon: 'fa-coffee',          color: '#6b7280' },
  },
  INTENSITY: {
    low:    { label: '저강도', color: '#10b981' },
    medium: { label: '중강도', color: '#f59e0b' },
    high:   { label: '고강도', color: '#ef4444' },
  },
  STATUS: {
    draft:     { label: '초안',   icon: 'fa-pencil-alt',     color: '#9ca3af' },
    approved:  { label: '승인됨', icon: 'fa-check-circle',   color: '#10b981' },
    active:    { label: '진행중', icon: 'fa-play-circle',    color: '#1a5ca8' },
    completed: { label: '완료',   icon: 'fa-flag-checkered', color: '#6b7280' },
  },
  POSITIONS: {
    offense: ['QB','WR','TE','RB','OL'],
    defense: ['DL','LB','DB'],
    special: ['K','P','LS','KR','PR'],
    team:    ['전체'],
  },
};

/* ─────────────────────────────────────────────
   상태
───────────────────────────────────────────── */
const TPState = {
  schedules:    [],   // 훈련 일정 목록 (날짜별 헤더)
  blocks:       [],   // 타임블록 카드 목록
  activeScheduleId: null,
  editingBlockId:   null,
  loading: false,
};

/* ─────────────────────────────────────────────
   [MANAGEMENT] renderPracticePlan()
───────────────────────────────────────────── */
function renderPracticePlan() {
  return `
  <div id="tpRoot">

    <!-- ① 상단 액션 바 -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:800;color:var(--gray-900);margin:0 0 4px">
          <i class="fas fa-calendar-alt" style="color:#1a5ca8;margin-right:8px"></i>훈련 타임테이블
        </h2>
        <p style="font-size:13px;color:var(--gray-500);margin:0">
          TEAM OVERALL · OFFENSE · DEFENSE · SPECIAL 통합 훈련계획
        </p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <!-- 날짜 선택 -->
        <div style="display:flex;align-items:center;gap:8px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:6px 12px">
          <i class="fas fa-calendar" style="color:var(--gray-400);font-size:13px"></i>
          <input type="date" id="tpDatePicker" value="${new Date().toISOString().slice(0,10)}"
            onchange="onTPDateChange(this.value)"
            style="border:none;background:transparent;font-size:13px;font-weight:600;color:var(--gray-700);cursor:pointer;outline:none">
        </div>
        <button class="btn btn-primary" onclick="openScheduleCreateModal()">
          <i class="fas fa-plus"></i> 새 훈련일 만들기
        </button>
        <button class="btn btn-outline" onclick="openAIPlanModal()">
          <i class="fas fa-robot"></i> AI 추천
        </button>
      </div>
    </div>

    <!-- ② 훈련일 탭 (날짜별) -->
    <div id="tpScheduleTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      <div style="color:var(--gray-400);font-size:13px;padding:8px 4px"><i class="fas fa-spinner fa-spin"></i> 로딩 중…</div>
    </div>

    <!-- ③ 타임테이블 본문 -->
    <div id="tpTableWrap">
      <div style="text-align:center;padding:60px;color:var(--gray-300)">
        <i class="fas fa-calendar-alt fa-3x" style="margin-bottom:16px"></i>
        <p style="font-size:15px;font-weight:600">훈련일을 선택하거나 새로 만들어보세요</p>
      </div>
    </div>

  </div>`;
}

/* ─────────────────────────────────────────────
   afterRender 훅
───────────────────────────────────────────── */
async function afterRenderPracticePlan() {
  TPState.editingBlockId = null;
  await loadTPSchedules();
}

/* ─────────────────────────────────────────────
   스케줄 목록 로드
───────────────────────────────────────────── */
async function loadTPSchedules() {
  try {
    const resp = await fetch('tables/training_schedules?limit=30&sort=schedule_date');
    const json = await resp.json();
    TPState.schedules = (json.data || []).sort((a,b) => (b.schedule_date||'').localeCompare(a.schedule_date||''));
    renderTPScheduleTabs();

    // 가장 최근 훈련일 자동 선택
    if (TPState.schedules.length > 0) {
      const latest = TPState.schedules[0];
      TPState.activeScheduleId = latest.id;
      document.getElementById('tpDatePicker').value = latest.schedule_date || new Date().toISOString().slice(0,10);
      await loadTPBlocks(latest.id);
    }
  } catch(e) {
    console.warn('schedules load:', e);
    TPState.schedules = [];
    renderTPScheduleTabs();
  }
}

/* ─────────────────────────────────────────────
   날짜 탭 렌더
───────────────────────────────────────────── */
function renderTPScheduleTabs() {
  const el = document.getElementById('tpScheduleTabs');
  if (!el) return;

  if (TPState.schedules.length === 0) {
    el.innerHTML = `<div style="color:var(--gray-400);font-size:13px;padding:8px 4px">
      아직 등록된 훈련일이 없습니다. 우측 상단 "새 훈련일 만들기"를 눌러보세요.
    </div>`;
    return;
  }

  el.innerHTML = TPState.schedules.map(s => {
    const isActive = s.id === TPState.activeScheduleId;
    const d = s.schedule_date ? new Date(s.schedule_date) : null;
    const dayLabel = d ? d.toLocaleDateString('ko-KR', {month:'numeric',day:'numeric',weekday:'short'}) : '날짜 미정';
    const status = TP.STATUS[s.status] || TP.STATUS.draft;
    return `
    <button onclick="selectTPSchedule('${s.id}')"
      style="display:flex;flex-direction:column;align-items:flex-start;padding:8px 14px;border-radius:10px;border:2px solid ${isActive?'#1a5ca8':'var(--gray-200)'};
        background:${isActive?'#eff6ff':'#fff'};cursor:pointer;transition:all .15s;min-width:100px">
      <span style="font-size:12px;font-weight:800;color:${isActive?'#1a5ca8':'var(--gray-700)'}">
        ${dayLabel}
      </span>
      <span style="font-size:11px;color:${status.color};margin-top:2px">
        <i class="fas ${status.icon}"></i> ${status.label}
      </span>
    </button>`;
  }).join('');
}

async function selectTPSchedule(id) {
  TPState.activeScheduleId = id;
  const s = TPState.schedules.find(x => x.id === id);
  if (s && s.schedule_date) document.getElementById('tpDatePicker').value = s.schedule_date;
  renderTPScheduleTabs();
  await loadTPBlocks(id);
}

async function onTPDateChange(dateVal) {
  // 해당 날짜 스케줄이 있으면 선택, 없으면 새로 만들기 안내
  const match = TPState.schedules.find(s => s.schedule_date === dateVal);
  if (match) {
    await selectTPSchedule(match.id);
  } else {
    openScheduleCreateModal(dateVal);
  }
}

/* ─────────────────────────────────────────────
   타임블록 로드 & 타임테이블 렌더
───────────────────────────────────────────── */
async function loadTPBlocks(scheduleId) {
  const wrap = document.getElementById('tpTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray-400)">
    <i class="fas fa-spinner fa-spin fa-2x"></i></div>`;

  try {
    const resp = await fetch(`tables/training_blocks?limit=200`);
    const json = await resp.json();
    const allBlocks = json.data || [];
    TPState.blocks = allBlocks.filter(b => b.schedule_id === scheduleId);
    renderTPTable(scheduleId);
  } catch(e) {
    wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#c33">오류: ${e.message}</div>`;
  }
}

/* ─────────────────────────────────────────────
   타임테이블 렌더링 (핵심)
───────────────────────────────────────────── */
function renderTPTable(scheduleId) {
  const wrap = document.getElementById('tpTableWrap');
  if (!wrap) return;

  const schedule = TPState.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  // 시간 슬롯 생성 (5분 단위, 시작~종료)
  const slots = buildTimeSlots(schedule.start_time || '11:00', schedule.end_time || '14:00', 5);
  const canEdit = (typeof _currentView !== 'undefined') && (_currentView === 'manager' || _currentView === 'coach');

  // 스케줄 메타 헤더
  const headerInfo = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;
    background:linear-gradient(135deg,#1a5ca808,#7B181808);border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px">훈련일</div>
        <div style="font-size:18px;font-weight:800;color:var(--gray-900)">
          ${schedule.schedule_date ? new Date(schedule.schedule_date).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}) : '날짜 미정'}
        </div>
      </div>
      <div style="width:1px;height:36px;background:var(--gray-200)"></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="font-size:13px;color:var(--gray-600)">
          <i class="fas fa-clock" style="color:#1a5ca8;margin-right:6px"></i>
          <strong>${schedule.start_time||'11:00'} ~ ${schedule.end_time||'14:00'}</strong>
        </div>
        ${schedule.location ? `<div style="font-size:13px;color:var(--gray-600)">
          <i class="fas fa-map-marker-alt" style="color:#7B1818;margin-right:6px"></i>${schedule.location}
        </div>` : ''}
        ${schedule.head_coach ? `<div style="font-size:13px;color:var(--gray-600)">
          <i class="fas fa-user-tie" style="color:#a87b00;margin-right:6px"></i>${schedule.head_coach}
        </div>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:8px">
      ${canEdit ? `
      <button class="btn btn-outline" onclick="openScheduleEditModal('${scheduleId}')" style="font-size:12px;padding:6px 12px">
        <i class="fas fa-edit"></i> 일정 수정
      </button>` : ''}
    </div>
  </div>`;

  // 범례
  const legend = `
  <div class="tp-legend">
    <span class="tp-legend-label">범례</span>
    ${Object.entries(TP.BLOCK_TYPES).filter(([k])=>k!=='break').map(([k,v])=>`
      <span class="tp-legend-item" style="color:${v.color};background:${v.color}12;border-color:${v.color}30">
        <i class="fas ${v.icon}" style="font-size:10px"></i>${v.label}
      </span>`).join('')}
  </div>`;

  // 타임테이블 HTML
  const tableHTML = buildTimeTable(slots, scheduleId, canEdit);

  wrap.innerHTML = headerInfo + legend + tableHTML;
}

/* ─────────────────────────────────────────────
   시간 슬롯 생성 유틸
───────────────────────────────────────────── */
function buildTimeSlots(startTime, endTime, stepMin = 5) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal   = eh * 60 + em;
  const slots = [];
  for (let t = startTotal; t <= endTotal; t += stepMin) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/* ─────────────────────────────────────────────
   타임테이블 HTML 빌더 (CSS Grid 엔진)
   ─ 세로축: 5분 = 1 grid-row
   ─ 가로축: [TIME(68px)] [TEAM] [OFFENSE] [DEFENSE] [SPECIAL]
   ─ 각 블록: grid-row = (startMin - originMin)/5 + 2 ~ (endMin - originMin)/5 + 2
   ─ 브레이크: grid-column 1/-1 (TIME 포함 전체 가로)
───────────────────────────────────────────── */
function buildTimeTable(slots, scheduleId, canEdit) {
  const blocks = TPState.blocks;
  const COLS = ['team','offense','defense','special'];

  if (slots.length === 0) {
    return `<div style="text-align:center;padding:60px;color:var(--gray-300)">
      <i class="fas fa-clock fa-2x" style="margin-bottom:12px"></i>
      <p>시간 슬롯이 없습니다</p></div>`;
  }

  // Grid 기준: 원점 분(origin)
  const originMin = timeToMin(slots[0]);
  const totalRows = slots.length; // 5분 단위 행 수

  // 분 → grid-row 인덱스 (1-based, 헤더가 row 1)
  // 데이터 영역은 row 2 ~ row (totalRows + 1)
  const minToRow = (min) => Math.round((min - originMin) / 5) + 2;

  /* ══════════════════════════════════════════════
     CSS Grid 컬럼 맵:
       grid-col 1 = TIME  (68px 고정)
       grid-col 2 = TEAM OVERALL
       grid-col 3 = OFFENSE
       grid-col 4 = DEFENSE
       grid-col 5 = SPECIAL
     grid-row 1  = 헤더
     grid-row 2+ = 5분 슬롯 (row N = originMin + (N-2)*5분)
  ═══════════════════════════════════════════════ */
  const COL_IDX = { team: 2, offense: 3, defense: 4, special: 5 };

  /* ─── 타임라인 마커 (5·10·15·30·60분마다 강도 다른 라인) ─── */
  const timeMarkers = slots.map((slot, i) => {
    const min = timeToMin(slot);
    const row = minToRow(min);
    const isHour    = min % 60 === 0;
    const isHalf    = min % 30 === 0 && !isHour;
    const isQuarter = min % 15 === 0 && !isHour && !isHalf;
    const isTen     = min % 10 === 0 && !isHour && !isHalf && !isQuarter;
    const showLabel = isHour || isHalf || min % 10 === 0;

    // 수평 그리드 라인 (전체 컬럼 걸침)
    const lineOpacity = isHour ? '0.18' : isHalf ? '0.11' : isQuarter ? '0.07' : '0.04';
    const lineStyle   = isHour ? 'solid' : 'dashed';
    const lineColor   = isHour ? '#374151' : '#9ca3af';

    return `
    <!-- 타임 셀 -->
    <div class="tpg-time-cell${isHour?' tpg-time-hour':isHalf?' tpg-time-half':''}"
      style="grid-column:1;grid-row:${row}">
      ${showLabel ? `<span class="tpg-time-label${isHour?' tpg-hour-label':''}">${slot}</span>` : ''}
    </div>
    <!-- 수평 구분선 -->
    <div class="tpg-hline" style="grid-column:2/6;grid-row:${row};
      border-top:1px ${lineStyle} rgba(0,0,0,${lineOpacity});pointer-events:none"></div>`;
  }).join('');

  /* ─── 브레이크 구간 목록 사전 추출 (겹침 판별용) ─── */
  const breakRanges = blocks
    .filter(b => b.block_type === 'break' && b.start_time && b.end_time)
    .map(b => ({ s: timeToMin(b.start_time), e: timeToMin(b.end_time) }));

  /**
   * 주어진 [startMin, endMin) 구간이 브레이크 구간과 1분이라도 겹치는지 검사
   * @param {number} s
   * @param {number} e
   * @returns {boolean}
   */
  const overlapsBreak = (s, e) =>
    breakRanges.some(br => s < br.e && e > br.s);

  /* ─── 일반 훈련 블록 렌더 ─── */
  const renderedBlockIds = new Set();
  const blockItems = [];

  blocks.forEach(b => {
    if (!b.start_time || !b.end_time) return;
    if (b.block_type === 'break') return; // 브레이크는 별도

    const startMin = timeToMin(b.start_time);
    const endMin   = timeToMin(b.end_time);
    if (endMin <= startMin) return;

    // ★ 브레이크 구간과 겹치면 렌더 차단 (휴식시간에는 훈련 없음)
    if (overlapsBreak(startMin, endMin)) return;

    // 스케줄 범위 클램프
    const clampedStart = Math.max(startMin, originMin);
    const clampedEnd   = Math.min(endMin, originMin + totalRows * 5);
    if (clampedEnd <= clampedStart) return;

    const rowStart = minToRow(clampedStart);
    const rowEnd   = minToRow(clampedEnd);

    // 컬럼 결정
    let cols = b.columns ? b.columns.split(',').map(s => s.trim()) : [b.column || 'team'];
    const isAll = cols.includes('all') ||
      (cols.includes('team') && cols.includes('offense') && cols.includes('defense') && cols.includes('special'));

    const btype    = TP.BLOCK_TYPES[b.block_type] || TP.BLOCK_TYPES.drill;
    const intensity = b.intensity ? (TP.INTENSITY[b.intensity] || {}) : null;
    const durationMin = endMin - startMin;

    // ── 카드 내부 공통 HTML 생성 헬퍼 ──
    // rowSpanPx: 블록이 차지하는 총 픽셀 높이 추정 (20px * rowCount)
    const rowCount  = rowEnd - rowStart;
    const heightPx  = rowCount * 20 - 4; // margin 2px 상하
    const isTiny    = heightPx < 36;     // 36px 미만: 제목만 표시
    const isSmall   = heightPx < 60;     // 60px 미만: 요약 숨김
    const isMedium  = heightPx < 90;     // 90px 미만: 메타 축약

    // 포지션을 pill 배지로 변환
    const posTags = b.positions
      ? b.positions.split(',').map(p => p.trim()).filter(Boolean)
          .map(p => `<span class="tpg-pos-tag" style="background:${btype.color}15;color:${btype.color};">${p}</span>`).join('')
      : '';

    // 툴팁 내용 조합 (제목 + 요약 + 담당자)
    const tooltipParts = [b.title || ''];
    if (b.summary) tooltipParts.push(b.summary);
    if (b.coach_name) tooltipParts.push('👤 ' + b.coach_name);
    if (b.positions) tooltipParts.push('🏈 ' + b.positions);
    tooltipParts.push(`⏱ ${b.start_time}~${b.end_time} (${durationMin}분)`);
    const tooltipText = tooltipParts.join('\n');

    const buildCardInner = (showSummary, showMeta) => `
      <div class="tpg-block-inner">
        ${!isTiny ? `
        <div class="tpg-block-top">
          <span class="tpg-type-badge" style="background:${btype.color}18;color:${btype.color}">
            <i class="fas ${btype.icon}"></i> ${btype.label}
          </span>
          <span class="tpg-time-badge">${b.start_time}~${b.end_time}</span>
        </div>` : ''}
        <div class="tpg-block-title${rowCount >= 8 ? ' multiline' : ''}"
          data-tooltip="${tooltipText.replace(/"/g,'&quot;')}">${b.title || '제목 없음'}</div>
        ${showSummary && b.summary ? `
        <div class="tpg-block-summary"
          data-tooltip="${b.summary.replace(/"/g,'&quot;')}">${b.summary}</div>` : ''}
        ${showMeta ? `
        <div class="tpg-block-meta">
          ${intensity ? `<span class="tpg-intensity" style="color:${intensity.color}">${intensity.label}</span>` : ''}
          ${b.coach_name ? `<span class="tpg-coach" data-tooltip="${b.coach_name}"><i class="fas fa-user-tie"></i> ${b.coach_name}</span>` : ''}
          ${posTags ? `<div class="tpg-pos-tags">${posTags}</div>` : ''}
        </div>` : ''}
      </div>`;

    if (isAll) {
      blockItems.push(`
      <div class="tpg-block tpg-block-all" onclick="openBlockDetailModal('${b.id}')"
        style="grid-column:2/6;grid-row:${rowStart}/${rowEnd};
          background:linear-gradient(135deg,${btype.color}0d,${btype.color}06);
          border:1.5px solid ${btype.color}40;border-left:4px solid ${btype.color}">
        ${buildCardInner(!isSmall, !isMedium)}
      </div>`);
    } else {
      cols.forEach(col => {
        const colIdx = COL_IDX[col];
        if (!colIdx) return;
        const colMeta = TP.COLS[col] || TP.COLS.team;
        blockItems.push(`
        <div class="tpg-block" onclick="openBlockDetailModal('${b.id}')"
          style="grid-column:${colIdx};grid-row:${rowStart}/${rowEnd};
            background:${colMeta.bg};
            border:1.5px solid ${colMeta.border}28;border-left:4px solid ${colMeta.border}">
          ${buildCardInner(!isSmall, !isMedium)}
        </div>`);
      });
    }
  });

  /* ─── 브레이크 블록 렌더 (grid-column: 1 / -1 → TIME 포함 전체) ─── */
  const breakItems = blocks
    .filter(b => b.block_type === 'break' && b.start_time && b.end_time)
    .map(bb => {
      const bbStart    = timeToMin(bb.start_time);
      const bbEnd      = timeToMin(bb.end_time);
      const clampedS   = Math.max(bbStart, originMin);
      const clampedE   = Math.min(bbEnd, originMin + totalRows * 5);
      if (clampedE <= clampedS) return '';
      const rowStart   = minToRow(clampedS);
      const rowEnd     = minToRow(clampedE);
      const durationMin = bbEnd - bbStart;

      return `
      <div class="tpg-break" style="grid-column:1/-1;grid-row:${rowStart}/${rowEnd}">
        <div class="tpg-break-inner">
          <span class="tpg-break-icon">☕</span>
          <div>
            <div class="tpg-break-title">BREAK${bb.title && bb.title !== 'BREAK' ? ` — ${bb.title}` : ''}</div>
            <div class="tpg-break-sub">${bb.start_time} ~ ${bb.end_time} · ${durationMin}분 휴식</div>
          </div>
        </div>
      </div>`;
    }).join('');

  /* ─── 빈 셀 클릭 영역 (canEdit) ─── */
  // ★ 브레이크 구간에 해당하는 슬롯은 빈 셀 클릭 영역에서도 제외
  const emptyCells = canEdit ? COLS.map((col, ci) => {
    return slots.map(slot => {
      const min = timeToMin(slot);
      // 이 슬롯(5분 단위)이 브레이크 구간 안에 있으면 렌더 스킵
      if (overlapsBreak(min, min + 5)) return '';
      const row = minToRow(min);
      const colIdx = ci + 2;
      return `<div class="tpg-empty-cell" data-slot="${slot}" data-col="${col}"
        onclick="openBlockWriteModal('${scheduleId}','${slot}','${col}')"
        style="grid-column:${colIdx};grid-row:${row}">
        <div class="tpg-add-hint"><i class="fas fa-plus"></i></div>
      </div>`;
    }).join('');
  }).join('') : '';

  /* ─── 컬럼 헤더 ─── */
  const headers = COLS.map((col, ci) => {
    const meta = TP.COLS[col];
    return `<div class="tpg-col-header" style="grid-column:${ci+2};grid-row:1;background:${meta.color}">
      <i class="fas ${meta.icon}"></i> ${meta.label}
    </div>`;
  }).join('');
  const timeHeader = `<div class="tpg-time-header" style="grid-column:1;grid-row:1">TIME</div>`;

  /* ─── grid-template-rows 생성 (헤더 44px + 슬롯 * 20px) ─── */
  const gridRows = `44px repeat(${totalRows}, 20px)`;

  /* ─── 최종 HTML ─── */
  return `
  <div class="tpg-outer">
    <div class="tpg-grid" style="
      display:grid;
      grid-template-columns:68px repeat(4,1fr);
      grid-template-rows:${gridRows};
      min-width:640px;
      position:relative;
    ">
      ${timeHeader}
      ${headers}
      ${timeMarkers}
      ${emptyCells}
      ${blockItems.join('')}
      ${breakItems}
    </div>
  </div>
  ${canEdit ? `
  <div style="margin-top:14px;text-align:right">
    <button class="btn btn-secondary btn-sm" onclick="openBlockWriteModal('${scheduleId}',null,null)">
      <i class="fas fa-plus"></i> 블록 직접 추가
    </button>
  </div>` : ''}`;
}

/* ─────────────────────────────────────────────
   새 훈련일 만들기 모달
───────────────────────────────────────────── */
function openScheduleCreateModal(prefillDate) {
  openModal('새 훈련일 만들기', `
    <form id="scheduleForm" onsubmit="submitScheduleForm(event)" style="max-width:480px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="grid-column:1/-1">
          <label class="form-label">훈련 날짜 *</label>
          <input class="form-control" type="date" name="schedule_date" required
            value="${prefillDate || new Date().toISOString().slice(0,10)}">
        </div>
        <div>
          <label class="form-label">시작 시간 *</label>
          <input class="form-control" type="time" name="start_time" value="11:00" required>
        </div>
        <div>
          <label class="form-label">종료 시간 *</label>
          <input class="form-control" type="time" name="end_time" value="14:00" required>
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">장소</label>
          <input class="form-control" name="location" placeholder="예: 단대 대운동장">
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">총괄 코치 / 감독</label>
          <input class="form-control" name="head_coach" placeholder="예: 배승환 감독"
            value="${window.__sessionUser ? (window.__sessionUser.displayName||'') : ''}">
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">메모</label>
          <textarea class="form-control" name="notes" rows="2"
            placeholder="장비 준비사항, 특이사항 등…" style="resize:vertical"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-calendar-plus"></i> 훈련일 생성
        </button>
      </div>
    </form>
  `);
}

async function submitScheduleForm(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    schedule_date: fd.get('schedule_date'),
    start_time:    fd.get('start_time'),
    end_time:      fd.get('end_time'),
    location:      fd.get('location') || '',
    head_coach:    fd.get('head_coach') || '',
    notes:         fd.get('notes') || '',
    status:        'draft',
    team_id:       window.__sessionUser ? (window.__sessionUser.teamId||'') : '',
  };
  try {
    const resp = await fetch('tables/training_schedules', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('저장 실패');
    const newSched = await resp.json();
    closeModal();
    showToast('훈련일이 생성되었습니다!', 'success');
    await loadTPSchedules();
    // 생성된 스케줄 선택
    if (newSched.id) {
      await selectTPSchedule(newSched.id);
      // 샘플 BREAK 블록 자동 생성
      await autoCreateBreaks(newSched.id, payload.start_time, payload.end_time);
      await loadTPBlocks(newSched.id);
    }
  } catch(err) {
    showToast('오류: ' + err.message, 'error');
  }
}

/* BREAK 블록 자동 생성 */
async function autoCreateBreaks(scheduleId, startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMin = (eh*60+em) - (sh*60+sm);
  // 대략 30분마다 5분 break 제안
  const breaks = [];
  let cursor = sh*60+sm + 30;
  while (cursor + 30 < eh*60+em) {
    const bh = String(Math.floor(cursor/60)).padStart(2,'0');
    const bm = String(cursor%60).padStart(2,'0');
    const eh2= String(Math.floor((cursor+5)/60)).padStart(2,'0');
    const em2= String((cursor+5)%60).padStart(2,'0');
    breaks.push({ bStart:`${bh}:${bm}`, bEnd:`${eh2}:${em2}` });
    cursor += 35;
  }
  for (const b of breaks) {
    await fetch('tables/training_blocks', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        schedule_id: scheduleId,
        title: 'BREAK',
        block_type: 'break',
        columns: 'all',
        start_time: b.bStart,
        end_time: b.bEnd,
        intensity: 'low',
        coach_name: '',
        team_id: window.__sessionUser ? (window.__sessionUser.teamId||'') : '',
      })
    });
  }
}

/* ─────────────────────────────────────────────
   블록 작성 모달 (코치가 카드 작성)
───────────────────────────────────────────── */
function openBlockWriteModal(scheduleId, prefillSlot, prefillCol) {
  const editing = TPState.editingBlockId ? TPState.blocks.find(b=>b.id===TPState.editingBlockId) : null;
  const role = window.__sessionRole || 'coach';

  // 코치 역할에 따라 기본 컬럼 제한
  let defaultCol = prefillCol || (editing && editing.column) || 'team';
  if (role === 'coach' && !editing) {
    // 세션에 unit 정보가 있으면 반영 가능 (확장 가능)
  }

  const isEditingBreak = editing && editing.block_type === 'break';

  openModal(editing ? '훈련 블록 수정' : '훈련 블록 추가', `
    <form id="blockForm" onsubmit="submitBlockForm(event,'${scheduleId}')" style="max-width:520px">

      <!-- 컬럼(유닛) 선택 -->
      <div id="colPickerWrap" style="margin-bottom:14px;${isEditingBreak ? 'display:none' : ''}">
        <label class="form-label">배치 컬럼 *</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="colPicker">
          ${Object.entries(TP.COLS).map(([k,v]) => `
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
            border:2px solid ${(editing?editing.column||editing.columns:defaultCol)===k||
              (editing&&editing.columns&&editing.columns.includes(k))?v.color:'var(--gray-200)'};
            background:${(editing?editing.column||editing.columns:defaultCol)===k||
              (editing&&editing.columns&&editing.columns.includes(k))?v.bg:'#fff'};
            padding:7px 12px;border-radius:8px;transition:all .1s">
            <input type="checkbox" name="columns" value="${k}"
              ${(editing&&editing.columns&&editing.columns.includes(k))||(!editing&&defaultCol===k)?'checked':''}
              onchange="toggleColPicker(this,'${v.color}','${v.bg}')"
              style="display:none">
            <i class="fas ${v.icon}" style="color:${v.color};font-size:12px"></i>
            <span style="font-size:12px;font-weight:700;color:${v.color}">${v.label}</span>
          </label>`).join('')}
        </div>
        <p style="font-size:11px;color:var(--gray-400);margin:6px 0 0">
          여러 개 선택 시 해당 컬럼 전체에 걸쳐 표시됩니다 (예: 전체 스크리미지)
        </p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <!-- 블록 타입 -->
        <div style="grid-column:1/-1">
          <label class="form-label">블록 타입 *</label>
          <select class="form-control" name="block_type" id="blockTypeSelect" onchange="updateBlockTypeUI(this.value)">
            ${Object.entries(TP.BLOCK_TYPES).map(([k,v])=>`
              <option value="${k}" ${editing&&editing.block_type===k?'selected':''}>
                ${v.label}
              </option>`).join('')}
          </select>
        </div>
        <!-- 제목 -->
        <div style="grid-column:1/-1">
          <label class="form-label">제목 *</label>
          <input class="form-control" name="title" required placeholder="예: WARM-UP / OL 포지션 드릴 / 스크리미지 A"
            value="${editing ? (editing.title||'') : ''}">
        </div>
        <!-- 시간 -->
        <div>
          <label class="form-label">시작 시간 *</label>
          <input class="form-control" type="time" name="start_time" required
            value="${editing ? (editing.start_time||prefillSlot||'') : (prefillSlot||'')}">
        </div>
        <div>
          <label class="form-label">종료 시간 *</label>
          <input class="form-control" type="time" name="end_time" required
            value="${editing ? (editing.end_time||'') : ''}">
        </div>
        <!-- 강도 -->
        <div>
          <label class="form-label">훈련 강도</label>
          <select class="form-control" name="intensity">
            <option value="">선택 안 함</option>
            ${Object.entries(TP.INTENSITY).map(([k,v])=>`
              <option value="${k}" ${editing&&editing.intensity===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <!-- 담당 포지션 -->
        <div>
          <label class="form-label">담당 포지션</label>
          <input class="form-control" name="positions" placeholder="예: QB, WR, OL"
            value="${editing ? (editing.positions||'') : ''}">
        </div>
        <!-- 담당 코치 -->
        <div style="grid-column:1/-1">
          <label class="form-label">담당 코치</label>
          <input class="form-control" name="coach_name" placeholder="코치 이름"
            value="${editing ? (editing.coach_name||'') : (window.__sessionUser?window.__sessionUser.displayName||'':'')}">
        </div>
      </div>

      <!-- 요약 설명 -->
      <div style="margin-bottom:14px">
        <label class="form-label">요약 설명 <span style="color:var(--gray-400)">(타임테이블에 표시)</span></label>
        <textarea class="form-control" name="summary" rows="2"
          placeholder="예: 사다리 풋워크, 카리오카 등…"
          style="resize:vertical">${editing ? (editing.summary||'') : ''}</textarea>
      </div>

      <!-- 상세 내용 (팝업에서 표시) -->
      <div style="margin-bottom:14px">
        <label class="form-label">상세 내용 <span style="color:var(--gray-400)">(카드 클릭 팝업에 표시)</span></label>
        <textarea class="form-control" name="detail" rows="5"
          placeholder="드릴 목록, 세부 지시사항, 포지션별 역할 등을 자유롭게 작성하세요…
예)
1. Stance & Starts - Left/Right/Middle
2. Drive Block - 사이드 타겟 → 파워 스텝
3. Pass Protection - 세트 포지션 → 핸드 플레이"
          style="resize:vertical;font-size:13px">${editing ? (editing.detail||'') : ''}</textarea>
      </div>

      <!-- 관련 드릴 링크 -->
      <div style="margin-bottom:20px">
        <label class="form-label">관련 드릴 <span style="color:var(--gray-400)">(IIP 드릴 라이브러리 연동)</span></label>
        <div id="drillLinkList" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${buildDrillChips(editing ? editing.drill_ids : '')}
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        ${editing ? `<button type="button" class="btn" style="background:#fee2e2;color:#c33;margin-right:auto"
          onclick="deleteBlock('${editing.id}')">
          <i class="fas fa-trash"></i> 삭제
        </button>` : ''}
        <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${editing ? '수정 저장' : '블록 추가'}
        </button>
      </div>
    </form>
  `, true);

  // 모달 열린 직후 현재 타입에 맞게 UI 초기화
  setTimeout(() => {
    const sel = document.getElementById('blockTypeSelect');
    if (sel) updateBlockTypeUI(sel.value);
  }, 50);
}

/* 컬럼 체크박스 토글 */
function toggleColPicker(chk, color, bg) {
  const lbl = chk.closest('label');
  if (!lbl) return;
  lbl.style.borderColor  = chk.checked ? color : 'var(--gray-200)';
  lbl.style.background   = chk.checked ? bg : '#fff';
}

/* 드릴 칩 빌더 */
function buildDrillChips(drillIds) {
  if (!drillIds || !State || !State.drillLibrary) return '<span style="font-size:12px;color:var(--gray-400)">드릴 라이브러리에서 자동 연동됩니다</span>';
  const ids = drillIds.split(',').map(s=>s.trim()).filter(Boolean);
  const drills = State.drillLibrary.filter(d=>ids.includes(d.id));
  if (drills.length === 0) return '<span style="font-size:12px;color:var(--gray-400)">연결된 드릴 없음</span>';
  return drills.map(d=>`
    <span style="background:#eff6ff;color:#1a5ca8;border:1px solid #bfdbfe;padding:3px 10px;
      border-radius:12px;font-size:12px;font-weight:600">${d.title}</span>`).join('');
}

/* 블록 타입 변경 시 UI 업데이트 */
function updateBlockTypeUI(val) {
  const bt = TP.BLOCK_TYPES[val];
  const form = document.getElementById('blockForm');
  if (!form) return;

  // 브레이크 타입이면 컬럼/강도/포지션/코치명 숨기기
  const isBreak = val === 'break';
  const colPickerWrap = form.querySelector('#colPickerWrap');
  if (colPickerWrap) colPickerWrap.style.display = isBreak ? 'none' : '';

  // 강도, 포지션 셀 감추기
  const intensityWrap = form.querySelector('select[name="intensity"]')?.closest('div');
  if (intensityWrap) intensityWrap.style.display = isBreak ? 'none' : '';
  const posWrap = form.querySelector('input[name="positions"]')?.closest('div');
  if (posWrap) posWrap.style.display = isBreak ? 'none' : '';
  const coachWrap = form.querySelector('input[name="coach_name"]')?.closest('div');
  if (coachWrap) coachWrap.style.display = isBreak ? 'none' : '';

  // 브레이크면 제목 자동 채우기
  const titleInput = form.querySelector('input[name="title"]');
  if (titleInput) {
    if (isBreak && !titleInput.value) titleInput.value = 'BREAK';
    else if (!isBreak && titleInput.value === 'BREAK') titleInput.value = '';
    titleInput.placeholder = isBreak ? '휴식 메모 (선택)' : (bt ? `예: ${bt.label} 세션` : '');
  }
}

/* ─────────────────────────────────────────────
   블록 폼 제출
───────────────────────────────────────────── */
async function submitBlockForm(e, scheduleId) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);

  // 선택된 컬럼들
  const blockTypeVal = fd.get('block_type');
  let cols = [...form.querySelectorAll('input[name="columns"]:checked')].map(el=>el.value);
  // 브레이크 타입이면 항상 전체 컬럼 처리
  if (blockTypeVal === 'break') cols = ['team','offense','defense','special'];

  const payload = {
    schedule_id:  scheduleId,
    title:        fd.get('title') || (blockTypeVal === 'break' ? 'BREAK' : ''),
    block_type:   blockTypeVal,
    columns:      blockTypeVal === 'break' ? 'all' : (cols.join(',') || 'team'),
    column:       blockTypeVal === 'break' ? 'team' : (cols[0] || 'team'),
    start_time:   fd.get('start_time'),
    end_time:     fd.get('end_time'),
    intensity:    fd.get('intensity') || '',
    positions:    fd.get('positions') || '',
    coach_name:   fd.get('coach_name') || '',
    summary:      fd.get('summary') || '',
    detail:       fd.get('detail') || '',
    team_id:      window.__sessionUser ? (window.__sessionUser.teamId||'') : '',
  };

  const editId = TPState.editingBlockId;
  try {
    const url    = editId ? `tables/training_blocks/${editId}` : 'tables/training_blocks';
    const method = editId ? 'PUT' : 'POST';
    const resp   = await fetch(url, {
      method,
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('저장 실패 ' + resp.status);
    closeModal();
    TPState.editingBlockId = null;
    showToast(editId ? '블록이 수정되었습니다' : '블록이 추가되었습니다', 'success');
    await loadTPBlocks(scheduleId);
  } catch(err) {
    showToast('오류: ' + err.message, 'error');
  }
}

/* ─────────────────────────────────────────────
   블록 상세 팝업 (카드 클릭)
   역할: 스케줄 표 = "요약 카드" / 모달 = "상세 전체"
───────────────────────────────────────────── */
function openBlockDetailModal(blockId) {
  const b = TPState.blocks.find(x => x.id === blockId);
  if (!b) return;

  const btype     = TP.BLOCK_TYPES[b.block_type] || TP.BLOCK_TYPES.drill;
  const cols      = (b.columns || b.column || 'team').split(',').map(s=>s.trim()).filter(s=>s&&s!=='all');
  const colsMeta  = cols.map(c => TP.COLS[c] || TP.COLS.team);
  const intensity = b.intensity ? (TP.INTENSITY[b.intensity]||{}) : null;
  const canEdit   = (typeof _currentView !== 'undefined') && (_currentView==='manager'||_currentView==='coach');
  const durationMin = timeToMin(b.end_time) - timeToMin(b.start_time);

  /* ── detail 텍스트 → 리스트 HTML 변환 ──
     줄별로 파싱하여 번호 항목·섹션 헤더·일반 텍스트를 각각 스타일링 */
  function parseDetailToHTML(raw) {
    if (!raw || !raw.trim()) return `
      <div style="text-align:center;padding:28px 0;color:var(--gray-300)">
        <i class="fas fa-clipboard" style="font-size:24px;margin-bottom:8px;display:block"></i>
        <span style="font-size:13px">상세 내용이 없습니다</span>
      </div>`;

    const lines = raw.split('\n');
    let html = '';
    lines.forEach(line => {
      const t = line.trim();
      if (!t) { html += '<div style="height:6px"></div>'; return; }

      // 번호 항목: "1. 텍스트", "- 텍스트", "• 텍스트"
      const numMatch  = t.match(/^(\d+)\.\s+(.+)/);
      const dashMatch = t.match(/^[-•·]\s*(.+)/);
      // 섹션 헤더: "[DL]", "[오펜스]", "▶ 항목" 등
      const secMatch  = t.match(/^\[(.+)\]$/) || t.match(/^[▶◆■]\s*(.+)/);
      // 굵게 강조: **텍스트**
      const bold      = s => s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');

      if (secMatch) {
        const label = secMatch[1] || t.replace(/^[▶◆■]\s*/,'');
        html += `
        <div style="display:flex;align-items:center;gap:8px;margin:14px 0 8px;
          padding-bottom:6px;border-bottom:1.5px solid var(--gray-100)">
          <span style="width:4px;height:16px;background:${btype.color};border-radius:2px;flex-shrink:0"></span>
          <span style="font-size:12px;font-weight:800;color:${btype.color};
            text-transform:uppercase;letter-spacing:.5px">${bold(label)}</span>
        </div>`;
      } else if (numMatch) {
        html += `
        <div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;
          border-bottom:1px solid var(--gray-50)">
          <span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;
            background:${btype.color};color:#fff;font-size:11px;font-weight:800;
            display:inline-flex;align-items:center;justify-content:center;
            line-height:1">${numMatch[1]}</span>
          <span style="font-size:13.5px;color:var(--gray-700);line-height:1.6;flex:1">${bold(numMatch[2])}</span>
        </div>`;
      } else if (dashMatch) {
        html += `
        <div style="display:flex;gap:8px;align-items:baseline;padding:5px 0">
          <span style="flex-shrink:0;width:6px;height:6px;border-radius:50%;
            background:${btype.color}80;margin-top:7px"></span>
          <span style="font-size:13px;color:var(--gray-700);line-height:1.6;flex:1">${bold(dashMatch[1])}</span>
        </div>`;
      } else {
        html += `<p style="font-size:13px;color:var(--gray-700);line-height:1.7;margin:4px 0">${bold(t)}</p>`;
      }
    });
    return html;
  }

  /* ── 포지션 pill 태그 ── */
  const posPills = b.positions
    ? b.positions.split(',').map(p=>p.trim()).filter(Boolean)
        .map(p=>`<span style="display:inline-flex;align-items:center;padding:4px 10px;
          background:${btype.color}12;color:${btype.color};font-size:12px;font-weight:700;
          border-radius:20px;border:1px solid ${btype.color}30">${p}</span>`).join('')
    : '';

  /* ── 유닛 컬럼 badge ── */
  const colBadges = colsMeta.length
    ? colsMeta.map(m=>`<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
        background:${m.bg};color:${m.border};font-size:12px;font-weight:700;
        border-radius:20px;border:1px solid ${m.border}28">
        <i class="fas ${m.icon}" style="font-size:10px"></i>${m.label}
      </span>`).join('')
    : '';

  openModal(`
    <span style="display:inline-flex;align-items:center;gap:10px">
      <span style="width:36px;height:36px;border-radius:10px;background:${btype.color}18;
        display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${btype.icon}" style="color:${btype.color};font-size:16px"></i>
      </span>
      <span style="font-size:16px;font-weight:800;color:#111827">${b.title || '훈련 블록'}</span>
    </span>
  `, `
  <div class="tpg-modal-body">

    <!-- ① 상단 메타 정보 카드 -->
    <div class="tpg-modal-meta-card" style="
      background:linear-gradient(135deg,${btype.color}08,${btype.color}04);
      border:1.5px solid ${btype.color}25;border-radius:12px;
      padding:16px 18px;margin-bottom:18px">

      <!-- 배지 행 -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
        <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;
          background:${btype.color}18;color:${btype.color};font-size:12px;font-weight:700;border-radius:20px">
          <i class="fas ${btype.icon}"></i> ${btype.label}
        </span>
        ${colBadges}
        ${intensity ? `<span style="padding:4px 12px;background:${intensity.color}15;
          color:${intensity.color};font-size:12px;font-weight:700;border-radius:20px">
          ${intensity.label}</span>` : ''}
      </div>

      <!-- 핵심 수치 행: 시간·담당자 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:30px;height:30px;border-radius:8px;background:#fff;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.08);flex-shrink:0">
            <i class="fas fa-clock" style="color:#1a5ca8;font-size:13px"></i>
          </span>
          <div>
            <div style="font-size:10px;color:var(--gray-400);font-weight:600;text-transform:uppercase">시간</div>
            <div style="font-size:13px;font-weight:800;color:#111827">
              ${b.start_time} ~ ${b.end_time}
              <span style="font-size:11px;color:var(--gray-400);font-weight:500"> · ${durationMin}분</span>
            </div>
          </div>
        </div>
        ${b.coach_name ? `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:30px;height:30px;border-radius:8px;background:#fff;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.08);flex-shrink:0">
            <i class="fas fa-user-tie" style="color:#a87b00;font-size:13px"></i>
          </span>
          <div>
            <div style="font-size:10px;color:var(--gray-400);font-weight:600;text-transform:uppercase">담당 코치</div>
            <div style="font-size:13px;font-weight:700;color:#111827">${b.coach_name}</div>
          </div>
        </div>` : ''}
      </div>

      <!-- 포지션 pill -->
      ${posPills ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid ${btype.color}20">
        <div style="font-size:10px;color:var(--gray-400);font-weight:700;
          text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">참여 포지션</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${posPills}</div>
      </div>` : ''}
    </div>

    <!-- ② 요약 (있을 경우) -->
    ${b.summary ? `
    <div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:var(--gray-400);
        text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        <i class="fas fa-align-left" style="margin-right:4px"></i> 훈련 요약
      </div>
      <div style="background:var(--gray-50);border-left:3px solid ${btype.color};
        border-radius:0 8px 8px 0;padding:12px 16px;
        font-size:13.5px;color:var(--gray-700);line-height:1.65">${b.summary}</div>
    </div>` : ''}

    <!-- ③ 상세 내용 (핵심) -->
    <div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:var(--gray-400);
        text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
        <i class="fas fa-list-ul" style="margin-right:4px"></i> 상세 훈련 내용
      </div>
      <div style="background:#fff;border:1px solid var(--gray-200);border-radius:10px;
        padding:16px 18px;min-height:40px">
        ${parseDetailToHTML(b.detail)}
      </div>
    </div>

    <!-- ④ 연계 드릴 -->
    ${b.drill_ids ? `
    <div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:var(--gray-400);
        text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        <i class="fas fa-dumbbell" style="margin-right:4px"></i> 연계 드릴
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${buildDrillChips(b.drill_ids)}</div>
    </div>` : ''}

    <!-- ⑤ 하단 액션 버튼 (canEdit만) -->
    ${canEdit ? `
    <div style="display:flex;gap:8px;justify-content:flex-end;
      padding-top:14px;border-top:1px solid var(--gray-100)">
      <button class="btn btn-outline" onclick="editBlock('${b.id}')"
        style="min-height:40px;min-width:80px">
        <i class="fas fa-edit"></i> 수정
      </button>
      <button class="btn" style="background:#fee2e2;color:#c33;min-height:40px;min-width:80px"
        onclick="deleteBlock('${b.id}')">
        <i class="fas fa-trash"></i> 삭제
      </button>
    </div>` : ''}

  </div>
  `, true);
}

/* ─────────────────────────────────────────────
   블록 수정 / 삭제
───────────────────────────────────────────── */
function editBlock(blockId) {
  TPState.editingBlockId = blockId;
  const b = TPState.blocks.find(x=>x.id===blockId);
  closeModal();
  setTimeout(() => openBlockWriteModal(b ? b.schedule_id : TPState.activeScheduleId, null, null), 200);
}

async function deleteBlock(blockId) {
  if (!confirm('이 훈련 블록을 삭제하시겠습니까?')) return;
  const b = TPState.blocks.find(x=>x.id===blockId);
  const scheduleId = b ? b.schedule_id : TPState.activeScheduleId;
  try {
    await fetch(`tables/training_blocks/${blockId}`, {method:'DELETE'});
    closeModal();
    showToast('삭제되었습니다', 'success');
    await loadTPBlocks(scheduleId);
  } catch(err) {
    showToast('삭제 오류: '+err.message, 'error');
  }
}

/* ─────────────────────────────────────────────
   일정 수정 모달
───────────────────────────────────────────── */
function openScheduleEditModal(scheduleId) {
  const s = TPState.schedules.find(x=>x.id===scheduleId);
  if (!s) return;
  openModal('훈련일 수정', `
    <form id="scheduleEditForm" onsubmit="submitScheduleEditForm(event,'${scheduleId}')" style="max-width:480px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="grid-column:1/-1">
          <label class="form-label">훈련 날짜 *</label>
          <input class="form-control" type="date" name="schedule_date" required value="${s.schedule_date||''}">
        </div>
        <div>
          <label class="form-label">시작 시간</label>
          <input class="form-control" type="time" name="start_time" value="${s.start_time||'11:00'}">
        </div>
        <div>
          <label class="form-label">종료 시간</label>
          <input class="form-control" type="time" name="end_time" value="${s.end_time||'14:00'}">
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">장소</label>
          <input class="form-control" name="location" value="${s.location||''}">
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">총괄 코치 / 감독</label>
          <input class="form-control" name="head_coach" value="${s.head_coach||''}">
        </div>
        <div>
          <label class="form-label">상태</label>
          <select class="form-control" name="status">
            ${Object.entries(TP.STATUS).map(([k,v])=>`
              <option value="${k}" ${s.status===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" style="background:#fee2e2;color:#c33;margin-right:auto"
          onclick="deleteSchedule('${scheduleId}')">
          <i class="fas fa-trash"></i> 훈련일 삭제
        </button>
        <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 저장</button>
      </div>
    </form>
  `);
}

async function submitScheduleEditForm(e, scheduleId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    schedule_date: fd.get('schedule_date'),
    start_time:    fd.get('start_time'),
    end_time:      fd.get('end_time'),
    location:      fd.get('location')||'',
    head_coach:    fd.get('head_coach')||'',
    status:        fd.get('status')||'draft',
  };
  try {
    await fetch(`tables/training_schedules/${scheduleId}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    closeModal();
    showToast('수정되었습니다', 'success');
    await loadTPSchedules();
    await selectTPSchedule(scheduleId);
  } catch(err) { showToast('오류: '+err.message,'error'); }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('이 훈련일과 모든 블록을 삭제하시겠습니까?')) return;
  try {
    await fetch(`tables/training_schedules/${scheduleId}`, {method:'DELETE'});
    closeModal();
    TPState.activeScheduleId = null;
    showToast('훈련일이 삭제되었습니다', 'success');
    await loadTPSchedules();
  } catch(err) { showToast('오류: '+err.message,'error'); }
}

/* ─────────────────────────────────────────────
   [COACHING] renderCoachPlanPage()
───────────────────────────────────────────── */
function renderCoachPlanPage() {
  return `
  <div id="coachPlanRoot">
    <div style="margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800;color:var(--gray-900);margin:0 0 4px">
        <i class="fas fa-pencil-ruler" style="color:#1a5ca8;margin-right:8px"></i>훈련계획 작성
      </h2>
      <p style="font-size:13px;color:var(--gray-500);margin:0">
        훈련 날짜를 선택하고 담당 블록을 작성하세요. 작성한 내용은 타임테이블에 바로 반영됩니다.
      </p>
    </div>

    <!-- 훈련일 선택 -->
    <div class="card" style="margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;color:var(--gray-700);margin-bottom:12px">
        <i class="fas fa-calendar" style="color:#1a5ca8;margin-right:6px"></i> 훈련일 선택
      </div>
      <div id="coachScheduleList" style="display:flex;flex-wrap:wrap;gap:8px">
        <div style="color:var(--gray-400);font-size:13px"><i class="fas fa-spinner fa-spin"></i> 로딩 중…</div>
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-outline" style="font-size:12px" onclick="openScheduleCreateModal()">
          <i class="fas fa-plus"></i> 새 훈련일 만들기
        </button>
      </div>
    </div>

    <!-- 선택한 훈련일의 내 블록 목록 -->
    <div id="coachBlockArea">
      <div style="text-align:center;padding:40px;color:var(--gray-300)">
        <i class="fas fa-hand-point-up fa-2x" style="margin-bottom:12px"></i>
        <p>위에서 훈련일을 선택하세요</p>
      </div>
    </div>
  </div>`;
}

async function afterRenderCoachPlan() {
  TPState.editingBlockId = null;
  await loadCoachSchedules();
}

async function loadCoachSchedules() {
  const el = document.getElementById('coachScheduleList');
  if (!el) return;
  try {
    const resp = await fetch('tables/training_schedules?limit=30&sort=schedule_date');
    const json = await resp.json();
    TPState.schedules = (json.data || []).sort((a,b)=>(b.schedule_date||'').localeCompare(a.schedule_date||''));
    if (TPState.schedules.length === 0) {
      el.innerHTML = `<span style="font-size:13px;color:var(--gray-400)">아직 등록된 훈련일이 없습니다</span>`;
      return;
    }
    el.innerHTML = TPState.schedules.map(s => {
      const d = s.schedule_date ? new Date(s.schedule_date) : null;
      const dayLabel = d ? d.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric',weekday:'short'}) : '날짜 미정';
      const isActive = s.id === TPState.activeScheduleId;
      const status = TP.STATUS[s.status]||TP.STATUS.draft;
      return `
      <button onclick="selectCoachSchedule('${s.id}')"
        style="padding:8px 14px;border-radius:10px;border:2px solid ${isActive?'#1a5ca8':'var(--gray-200)'};
          background:${isActive?'#eff6ff':'#fff'};cursor:pointer;transition:all .15s">
        <div style="font-size:12px;font-weight:800;color:${isActive?'#1a5ca8':'var(--gray-700)'}">${dayLabel}</div>
        <div style="font-size:11px;color:${status.color};margin-top:2px">
          <i class="fas ${status.icon}"></i> ${status.label}
        </div>
      </button>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<span style="color:#c33;font-size:13px">오류: ${e.message}</span>`;
  }
}

async function selectCoachSchedule(scheduleId) {
  TPState.activeScheduleId = scheduleId;
  // 탭 버튼 활성화
  document.querySelectorAll('#coachScheduleList button').forEach((btn,i) => {
    const s = TPState.schedules[i];
    if (!s) return;
    const isActive = s.id === scheduleId;
    btn.style.borderColor = isActive ? '#1a5ca8' : 'var(--gray-200)';
    btn.style.background  = isActive ? '#eff6ff' : '#fff';
    btn.querySelector('div').style.color = isActive ? '#1a5ca8' : 'var(--gray-700)';
  });

  // 블록 로드
  const resp = await fetch('tables/training_blocks?limit=200');
  const json = await resp.json();
  const allBlocks = json.data || [];
  TPState.blocks = allBlocks.filter(b => b.schedule_id === scheduleId);
  renderCoachBlockArea(scheduleId);
}

function renderCoachBlockArea(scheduleId) {
  const el = document.getElementById('coachBlockArea');
  if (!el) return;

  const schedule = TPState.schedules.find(s=>s.id===scheduleId);
  const myBlocks = TPState.blocks.filter(b=>b.block_type !== 'break');

  const dateStr = schedule && schedule.schedule_date
    ? new Date(schedule.schedule_date).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})
    : '';

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="font-size:14px;font-weight:700;color:var(--gray-800)">
      ${dateStr} 훈련 블록
      <span style="font-size:12px;color:var(--gray-400);font-weight:500;margin-left:8px">${myBlocks.length}개</span>
    </div>
    <button class="btn btn-primary" onclick="openBlockWriteModal('${scheduleId}',null,null)">
      <i class="fas fa-plus"></i> 블록 추가
    </button>
  </div>

  <!-- 컬럼별 그룹 -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${Object.entries(TP.COLS).map(([col, meta]) => {
      const colBlocks = myBlocks.filter(b => {
        const cols = b.columns ? b.columns.split(',') : [b.column||'team'];
        return cols.includes(col) || cols.includes('all');
      }).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));

      return `
      <div style="background:${meta.bg};border:1px solid ${meta.border}30;border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:800;color:${meta.border};margin-bottom:12px;
          display:flex;align-items:center;justify-content:space-between">
          <span><i class="fas ${meta.icon}" style="margin-right:6px"></i>${meta.label}</span>
          <button onclick="openBlockWriteModal('${scheduleId}',null,'${col}')"
            style="width:24px;height:24px;border-radius:6px;border:1px solid ${meta.border}40;
              background:#fff;color:${meta.border};cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        ${colBlocks.length === 0
          ? `<div style="text-align:center;padding:20px;color:${meta.border}60;font-size:12px">
               <i class="fas fa-plus-circle fa-lg" style="margin-bottom:8px;display:block"></i>
               아직 없음 — 추가해보세요
             </div>`
          : colBlocks.map(b => {
              const btype = TP.BLOCK_TYPES[b.block_type]||TP.BLOCK_TYPES.drill;
              return `
              <div onclick="openBlockDetailModal('${b.id}')"
                style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;
                  border-left:3px solid ${btype.color};box-shadow:0 1px 4px rgba(0,0,0,.06);transition:all .15s"
                onmouseover="this.style.transform='translateY(-1px)'"
                onmouseout="this.style.transform='translateY(0)'">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:11px;font-weight:700;color:${btype.color}">
                    <i class="fas ${btype.icon}" style="font-size:10px"></i> ${btype.label}
                  </span>
                  <span style="font-size:11px;color:var(--gray-400)">${b.start_time}~${b.end_time}</span>
                </div>
                <div style="font-size:13px;font-weight:700;color:var(--gray-900)">${b.title||'제목 없음'}</div>
                ${b.summary ? `<div style="font-size:11px;color:var(--gray-500);margin-top:3px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.summary}</div>` : ''}
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                  <button onclick="event.stopPropagation();editBlock('${b.id}')"
                    style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid var(--gray-200);
                      background:var(--gray-50);color:var(--gray-600);cursor:pointer">
                    <i class="fas fa-edit"></i> 수정
                  </button>
                  <button onclick="event.stopPropagation();deleteBlock('${b.id}')"
                    style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #fee2e2;
                      background:#fff5f5;color:#c33;cursor:pointer">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>`;
            }).join('')
        }
      </div>`;
    }).join('')}
  </div>`;
}

/* ─────────────────────────────────────────────
   AI 추천 (기존 함수 유지)
───────────────────────────────────────────── */
function openAIPlanModal() {
  openModal('🤖 AI 훈련계획 추천', `
    <div style="max-width:500px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:18px">
        <div style="font-size:13px;font-weight:700;color:#1a5ca8;margin-bottom:4px">
          <i class="fas fa-info-circle"></i> ERP 데이터 기반 자동 분석
        </div>
        <p style="font-size:12px;color:#1e40af;margin:0;line-height:1.6">
          역량평가 점수·부상현황·출결률·IIP 미완료 데이터를 분석해 팀에 필요한 훈련 블록을 자동 제안합니다.
        </p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <label class="form-label">대상 유닛</label>
          <select class="form-control" id="aiUnit">
            <option value="all">전체</option>
            ${Object.entries(TP.COLS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">훈련 강도</label>
          <select class="form-control" id="aiIntensity">
            ${Object.entries(TP.INTENSITY).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div style="grid-column:1/-1">
          <label class="form-label">추가 요청사항</label>
          <textarea class="form-control" id="aiExtra" rows="2" style="resize:vertical"
            placeholder="예: 다음 주 경기 대비, 부상자 김민준 복귀 훈련 포함 등…"></textarea>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:14px" onclick="generateAIBlocks()">
        <i class="fas fa-magic"></i> AI 훈련 블록 생성
      </button>
      <div id="aiBlockResult"></div>
    </div>
  `, true);
}

async function generateAIBlocks() {
  const unit      = document.getElementById('aiUnit')?.value||'all';
  const intensity = document.getElementById('aiIntensity')?.value||'medium';
  const extra     = document.getElementById('aiExtra')?.value||'';
  const result    = document.getElementById('aiBlockResult');
  if(!result) return;

  result.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gray-500)">
    <i class="fas fa-cog fa-spin fa-xl" style="color:#1a5ca8;margin-bottom:10px"></i>
    <p style="font-weight:600;font-size:13px">ERP 데이터 분석 중…</p></div>`;

  await new Promise(r=>setTimeout(r,1400));

  const suggestions = [
    { col:'team',    type:'warmup',       title:'WARM-UP & 사다리 드릴',    start:'11:00', end:'11:25', summary:'카리오카, 오픈/클로즈 게이트, HIGH KNEES, 사다리 풋워크', detail:'1. 카리오카 (40yd × 2)\n2. 오픈&클로즈 게이트 런지\n3. HIGH KNEES → 백페달\n4. 사다리: One Step / Two Step / Lateral 2in2out' },
    { col:'team',    type:'break',        title:'BREAK (팀 분리)',           start:'11:25', end:'11:30', summary:'A/B팀 분리, 장비 착용 확인' },
    { col:'offense', type:'walkthroughs', title:'오펜스 Walk-Through',       start:'11:30', end:'12:00', summary:'AI 분석: 레드존 공략 및 패스 루트 워크스루 권장', detail:'1. WR 루트 러닝 Walk-Through\n2. QB 메카닉스 확인\n3. OL 패스 블로킹 정렬\n4. 전체 오펜스 Walk-Through (10개 플레이)' },
    { col:'defense', type:'walkthroughs', title:'디펜스 Walk-Through',       start:'11:30', end:'12:00', summary:'AI 분석: 커버리지 스킴 및 블리츠 패키지 이해도 보강', detail:'1. 4-3 Cover 2 포메이션 정렬\n2. 4-3 Cover 4 로테이션\n3. 블리츠 패키지 타이밍 확인\n4. DB 맨 커버리지 1on1' },
    { col:'special', type:'drill',        title:'스페셜팀 드릴',             start:'11:30', end:'12:00', summary:'킥오프 커버리지 레인 유지 훈련', detail:'1. 킥오프 커버리지 레인 드릴\n2. 펀터 킥 거리/높이 측정\n3. 리터너 대응 시뮬레이션' },
    { col:'team',    type:'break',        title:'BREAK',                     start:'12:00', end:'12:05', summary:'수분 보충, 팀 재집합' },
    { col:'offense', type:'drill',        title:'오펜스 포지션 드릴 (Indy)', start:'12:05', end:'12:50', summary:'포지션별 개인 기술 훈련', detail:'OL: Stance & Starts / Drive Block\nQB+WR: 루트 러닝 & 패스 연습\nRB: 핸드오프 & 리시빙 드릴\nTE: 루트 & 블로킹' },
    { col:'defense', type:'drill',        title:'디펜스 포지션 드릴 (Indy)', start:'12:05', end:'12:50', summary:'포지션별 기본기 집중 훈련', detail:'DL: Get-Off & Pass Rush 무브\nLB: Drop Coverage & 태클링\nDB: 백페달 & 맨 커버리지 기초' },
    { col:'team',    type:'scrimmage',    title:'팀 스크리미지',             start:'12:50', end:'13:30', summary:'오펜스 vs 디펜스 실전 시뮬레이션', detail:'스크리미지 A (10분): 오펜스 기본 런&패스\n스크리미지 B (15분): 레드존 시나리오\n스크리미지 C (10분): 2분 드릴' },
    { col:'team',    type:'conditioning', title:'컨디셔닝 & 마무리',          start:'13:30', end:'13:55', summary:'40yd × 5세트 인터벌 + 스트레칭', detail:'1. 40yd 대시 × 5세트 (60초 인터벌)\n2. 정적 스트레칭 (10분)\n3. 팀 미팅 및 공지사항' },
  ];

  const filtered = unit === 'all' ? suggestions : suggestions.filter(s=>s.col===unit||s.col==='team');

  result.innerHTML = `
  <div style="border-top:1px solid var(--gray-200);padding-top:14px">
    <div style="font-size:13px;font-weight:700;color:var(--gray-800);margin-bottom:10px">
      <i class="fas fa-lightbulb" style="color:#f59e0b"></i> 추천 훈련 블록 (${filtered.length}개)
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;margin-bottom:14px">
      ${filtered.map((s,i) => {
        const meta  = TP.COLS[s.col]||TP.COLS.team;
        const btype = TP.BLOCK_TYPES[s.type]||TP.BLOCK_TYPES.drill;
        return `
        <div style="display:flex;align-items:center;gap:10px;background:${meta.bg};border:1px solid ${meta.border}20;
          border-radius:8px;padding:10px 12px">
          <i class="fas ${btype.icon}" style="color:${btype.color};width:16px"></i>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--gray-900)">${s.title}</div>
            <div style="font-size:11px;color:var(--gray-500)">${s.start}~${s.end} · ${meta.label}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#92400e">
      <i class="fas fa-info-circle"></i> 위 블록을 선택한 훈련일에 일괄 적용합니다.
      훈련일이 선택되어 있어야 합니다.
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="adoptAIBlocks()">
      <i class="fas fa-download"></i> 현재 훈련일에 전체 적용
    </button>
  </div>`;

  window._aiSuggestions = filtered.map(s=>({...s, intensity}));
}

async function adoptAIBlocks() {
  const scheduleId = TPState.activeScheduleId;
  if (!scheduleId) {
    showToast('먼저 훈련일을 선택하거나 만들어주세요', 'error'); return;
  }
  const suggestions = window._aiSuggestions || [];
  closeModal();
  showToast('AI 블록 적용 중…', 'success');
  for (const s of suggestions) {
    await fetch('tables/training_blocks', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        schedule_id: scheduleId,
        title: s.title,
        block_type: s.type,
        columns: s.col === 'team' ? 'team,offense,defense,special' : s.col,
        column: s.col,
        start_time: s.start,
        end_time: s.end,
        summary: s.summary||'',
        detail: s.detail||'',
        intensity: s.intensity||'medium',
        coach_name: 'AI 추천',
        team_id: window.__sessionUser ? (window.__sessionUser.teamId||'') : '',
      })
    });
  }
  showToast(`${suggestions.length}개 블록이 적용되었습니다!`, 'success');
  await loadTPBlocks(scheduleId);
}

/* sleep 헬퍼 */
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
