/* ============================================================
   app.js — SPA Router & Page Renderers
   PlayProve Team ERP MVP
   ============================================================ */

/* ——— App State ——— */
const State = {
  currentPage: 'dashboard',
  currentPlayerId: null,    // v2: 현재 로그인 선수
  players: [],
  events: [],
  attendance: [],
  injuries: [],
  dues: [],
  notices: [],              // v2
  notifications: [],        // v2
  conditionLogs: [],        // v2
  playerGrades: [],         // v2
  performanceScores: [],    // v3
  practiceCheckins: [],     // v3
  iipAssignments: [],       // v3
  drillLibrary: [],         // v3
  loaded: {}
};

// v2: 현재 선수 헬퍼
function getCurrentPlayer() {
  return State.players.find(p => p.id === State.currentPlayerId) || null;
}

/* ——— Init ——— */
/* ── 앱 초기화: index.html의 showScreen('app') 이후 호출됨 ── */
let _appInitialized = false;
async function _appInit() {
  if (_appInitialized) return;
  _appInitialized = true;

  initSessionUI();
  setupUI();
  await loadAll();
  applySessionViewMode();
  navigate('dashboard');
  startNotifChecker();
  const player = getCurrentPlayer();
  if (player) renderNotifPanel(player.id);
  checkPendingRequestsBadge();
}

/* DOMContentLoaded는 index_v2.html 호환용으로 유지 (단독 실행 시) */
document.addEventListener('DOMContentLoaded', () => {
  // index.html 환경이면 screen-app이 없거나 비활성 → _appInit은 routeBySession()이 호출
  // index_v2.html 단독 환경이면 직접 실행
  const appScreen = document.getElementById('screen-app');
  if (!appScreen) {
    // index_v2.html 단독 실행 환경
    _appInit();
  }
  // index.html 환경에서는 routeBySession() → initApp() → _appInit() 순서로 호출됨
});

/* ── 세션 기반 UI 초기화 ── */
function initSessionUI() {
  if (typeof AUTH === 'undefined') return;
  const session = AUTH.getSession();
  if (!session) return;

  // 팀 이름 업데이트
  const teamNameEl = document.getElementById('sidebarTeamName');
  if (teamNameEl && session.teamName) {
    teamNameEl.textContent = session.teamName;
  }

  // 어드민 메뉴 표시/숨김
  const isAdmin = AUTH.isOwnerOrAdmin();
  const adminSection = document.getElementById('adminNavSection');
  const adminMenu    = document.getElementById('adminNavMenu');
  if (adminSection) adminSection.style.display = isAdmin ? '' : 'none';
  if (adminMenu)    adminMenu.style.display    = isAdmin ? '' : 'none';

  // view-switcher: 어드민만 전체 스위처, 나머지는 고정
  const switcher = document.getElementById('viewSwitcher');
  if (switcher) {
    if (!isAdmin && session.role === 'coach') {
      // coach: admin/coach만 표시
      switcher.querySelectorAll('[data-view="player"]').forEach(b => b.style.display = 'none');
    } else if (session.role === 'player' || session.role === 'staff') {
      // player: 스위처 숨김
      switcher.style.display = 'none';
    }
  }
}

/* ── 세션 뷰모드 자동 적용 ── */
function applySessionViewMode() {
  if (typeof AUTH === 'undefined') return;
  const viewMode = AUTH.getViewMode() || 'manager';
  if (typeof switchView === 'function') {
    switchView(viewMode);
  }
}

/* ── pending 신청 배지 확인 ── */
async function checkPendingRequestsBadge() {
  if (typeof AUTH === 'undefined' || !AUTH.isOwnerOrAdmin()) return;
  try {
    const res = await fetch('tables/join_requests?limit=100');
    const json = await res.json();
    const session = AUTH.getSession();
    const pending = (json.data || []).filter(r =>
      r.status === 'pending' && (r.team_id === session?.teamId || session?.role === 'owner')
    );
    const dot = document.getElementById('pendingRequestsDot');
    if (dot && pending.length > 0) {
      dot.style.display = 'inline-block';
      dot.title = `${pending.length}건의 가입 신청 대기 중`;
    }
  } catch {}
}

function setupUI() {
  // Today date
  const d = new Date();
  document.getElementById('todayDate').textContent =
    d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.page);
      closeSidebar();
    });
  });

  // Menu button (mobile)
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
  });

  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

async function loadAll() {
  try {
    const [players, events, attendance, injuries, dues, notices, notifications, conditionLogs, grades, perfScores, checkins, iipAssign, drills] = await Promise.all([
      API.get('players'),
      API.get('events'),
      API.get('attendance'),
      API.get('injury_reports'),
      API.get('monthly_dues'),
      API.get('notices'),
      API.get('notifications'),
      API.get('condition_logs'),
      API.get('player_grades'),
      API.get('performance_scores'),
      API.get('practice_checkins'),
      API.get('iip_assignments'),
      API.get('drill_library')
    ]);
    State.players = players;
    State.events = events;
    State.attendance = attendance;
    State.injuries = injuries;
    State.dues = dues;
    State.notices = notices;
    State.notifications = notifications;
    State.conditionLogs = conditionLogs;
    State.playerGrades = grades;
    State.performanceScores = perfScores;   // v3
    State.practiceCheckins = checkins;       // v3
    State.iipAssignments = iipAssign;        // v3
    State.drillLibrary = drills;             // v3

    // 기본 현재 선수 = 첫 번째 활성 선수
    if (!State.currentPlayerId && players.length > 0) {
      const first = players.find(p => p.player_status === 'active') || players[0];
      State.currentPlayerId = first.id;
    }
    setupPlayerSwitcher();
  } catch (e) {
    showToast('데이터 로딩 오류: ' + e.message, 'error');
  }
}

/* ——— 선수 전환 (데모용) ——— */
function setupPlayerSwitcher() {
  const sel = document.getElementById('currentPlayerSelect');
  if (!sel) return;
  sel.innerHTML = State.players
    .filter(p => p.player_status !== 'military_leave')
    .map(p => `<option value="${p.id}" ${p.id === State.currentPlayerId ? 'selected' : ''}>#${p.jersey_number} ${p.full_name} (${p.primary_position})</option>`)
    .join('');
  updateSidebarUser();
}

function switchCurrentPlayer(playerId) {
  State.currentPlayerId = playerId;
  updateSidebarUser();
  const player = getCurrentPlayer();
  if (player) renderNotifPanel(player.id);
  // 현재 My* 페이지에 있으면 새로고침
  if (['mypage','myfeed'].includes(State.currentPage)) navigate(State.currentPage);
}

function updateSidebarUser() {
  const player = getCurrentPlayer();
  if (!player) return;
  const g = calcPlayerGrade(player.id, {
    attendance: State.attendance, events: State.events,
    dues: State.dues, injuries: State.injuries, conditionLogs: State.conditionLogs
  });
  document.getElementById('sidebarAvatar').textContent = initials(player.full_name);
  document.getElementById('sidebarName').textContent = player.full_name;
  document.getElementById('sidebarRole').innerHTML = `${player.primary_position} · ${gradeBadgeHTML(g.grade)}`;
}

/* ——— Router ——— */
function navigate(page) {
  State.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const titles = {
    dashboard:    '팀 대시보드',
    roster:       '선수단 관리',
    attendance:   '출결 관리',
    injury:       '부상·컨디션',
    dues:         '회비 관리',
    depthchart:   '뎁스 차트',
    mypage:       '내 페이지',          // v2
    myfeed:       'My Feed',           // v2
    notices:      '공지사항',           // v2
    performance:  '역량 평가',          // v3
    simulator:    'Roster 시뮬레이터',  // v3
    rapidcheck:   '훈련 즉시평가',      // v3
    iip_coach:    'IIP 관리',          // v3
    my_iip:       '나의 훈련 과제',     // v3
    ai_tactical:  'AI 전술 어시스턴트', // v3
    growth:       '성장 분석',          // v3
    admin:          '가입 승인 관리',      // auth v3
    practice_plan:  '훈련 계획',            // training v3
    coach_plan:     '훈련계획 작성'          // training coach v3
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  const content = document.getElementById('pageContent');
  content.innerHTML = renderPage(page);
  afterRender(page);
}

function renderPage(page) {
  // v3: 접근 권한 체크
  const denied = (typeof guardPage === 'function') ? guardPage(page) : null;
  if (denied) return denied;

  switch (page) {
    case 'dashboard':   return renderDashboard();
    case 'roster':      return renderRoster();
    case 'attendance':  return renderAttendance();
    case 'injury':      return renderInjury();
    case 'dues':        return renderDues();
    case 'depthchart':  return renderDepthChart();
    case 'mypage':      return renderMyPageFull();         // v2
    case 'myfeed':      return renderMyFeed();             // v2
    case 'notices':     return renderNotices();            // v2
    case 'performance': return renderPerformance();        // v3
    case 'simulator':   return renderSimulator();          // v3
    case 'rapidcheck':  return renderRapidCheck();         // v3
    case 'iip_coach':   return renderIIPCoach();           // v3
    case 'my_iip':      return renderMyIIP();              // v3
    case 'ai_tactical': return renderAITactical();         // v3
    case 'growth':      return renderGrowthAnalytics();    // v3
    case 'admin':         return renderAdminDashboard();     // auth v3
    case 'practice_plan': return renderPracticePlan();        // training v3
    case 'coach_plan':    return renderCoachPlanPage();       // training coach v3
    default:            return '<div class="empty-state"><i class="fas fa-question-circle"></i><p>페이지를 찾을 수 없습니다</p></div>';
  }
}

function afterRender(page) {
  if (page === 'dashboard')   initDashboardCharts();
  if (page === 'roster')      initRosterEvents();
  if (page === 'attendance')  initAttendanceEvents();
  if (page === 'injury')      initInjuryEvents();
  if (page === 'dues')        initDuesEvents();
  if (page === 'mypage')      afterRenderMyPageFull();
  // v3 new pages
  if (page === 'performance') {
    const firstActive = State.players.find(p => p.player_status !== 'military_leave');
    afterRenderPerformance(firstActive?.id || null);
  }
  if (page === 'simulator')   afterRenderSimulator();
  if (page === 'rapidcheck')  afterRenderRapidCheck();
  if (page === 'growth')      afterRenderGrowthAnalytics();
  if (page === 'admin')         afterRenderAdmin();
  if (page === 'practice_plan') afterRenderPracticePlan();
  if (page === 'coach_plan')    afterRenderCoachPlan();
  // v3: 뷰 전환 시 사이드바 업데이트
  if (typeof applyViewVisibility === 'function') applyViewVisibility(_currentView || 'manager');
}

/* ——— My Page Full (탭 포함) ——— */
function renderMyPageFull(tab = 'overview') {
  return `
    <div class="tabs" style="margin-bottom:20px;flex-wrap:wrap;gap:4px">
      <button class="tab-btn ${tab==='overview'?'active':''}" onclick="switchMyPageTab('overview')">📊 개인 대시보드</button>
      <button class="tab-btn ${tab==='grade'?'active':''}" onclick="switchMyPageTab('grade')">🏆 등급 & 리더보드</button>
      <button class="tab-btn ${tab==='growth'?'active':''}" onclick="switchMyPageTab('growth')">📈 성장 분석</button>
      <button class="tab-btn ${tab==='notif'?'active':''}" onclick="switchMyPageTab('notif')">🔔 알림 설정</button>
    </div>
    <div id="mypageTabContent">${renderMyPageTab(tab)}</div>
  `;
}

function switchMyPageTab(tab) {
  const tabs = document.querySelectorAll('.tabs .tab-btn');
  tabs.forEach((b, i) => b.classList.toggle('active', ['overview','grade','growth','notif'][i] === tab));
  const content = document.getElementById('mypageTabContent');
  if (content) content.innerHTML = renderMyPageTab(tab);
  if (tab === 'overview') {
    const player = getCurrentPlayer();
    if (player) initConditionChart(player.id);
  }
  if (tab === 'growth') {
    const player = getCurrentPlayer();
    if (player && typeof initPlayerGrowthRadar === 'function') {
      setTimeout(() => initPlayerGrowthRadar(player.id), 100);
    }
  }
  if (tab === 'grade') {
    // no chart init needed
  }
}

function renderMyPageTab(tab) {
  if (tab === 'overview')  return renderMyPage();
  if (tab === 'grade')     return renderGradeLeaderboard();
  if (tab === 'growth')    {
    const p = getCurrentPlayer();
    return p ? (typeof renderPlayerGrowthCard === 'function' ? renderPlayerGrowthCard(p.id) : renderGrowthAnalytics()) : '<div class="empty-state"><i class="fas fa-chart-line"></i><p>선수를 선택하세요</p></div>';
  }
  if (tab === 'notif')     {
    const p = getCurrentPlayer();
    return p ? renderNotifSettings(p.id) : '<div class="empty-state"><i class="fas fa-user"></i><p>선수를 선택하세요</p></div>';
  }
  return '';
}

function afterRenderMyPageFull() {
  const player = getCurrentPlayer();
  if (player) {
    initConditionChart(player.id);
    renderNotifPanel(player.id);
  }
}

/* ——— Grade Leaderboard ——— */
function renderGradeLeaderboard() {
  const board = buildLeaderboard(
    State.players, State.attendance, State.events, State.dues, State.injuries, State.conditionLogs
  );
  const player = getCurrentPlayer();
  const myRank = board.findIndex(b => b.player.id === player?.id) + 1;

  return `
    <div class="section-header" style="margin-bottom:16px">
      <div class="section-title"><i class="fas fa-trophy" style="color:var(--yellow)"></i> 시즌 리더보드</div>
      ${myRank > 0 ? `<div style="font-size:13px;font-weight:700;color:var(--primary)">내 순위: ${myRank}위</div>` : ''}
    </div>
    <div class="card">
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead><tr><th>순위</th><th>선수</th><th>등급</th><th>총 포인트</th><th>출석률</th><th>연속 출석</th><th>포인트 내역</th></tr></thead>
          <tbody>
            ${board.map((b, idx) => {
              const isMe = b.player.id === player?.id;
              const rank = idx + 1;
              const rankEmoji = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
              return `
                <tr style="${isMe?'background:var(--primary-fade);':''}"> 
                  <td style="font-size:18px;text-align:center">${rankEmoji}</td>
                  <td>
                    <div class="player-info">
                      ${playerAvatar(b.player.full_name, b.player.unit)}
                      <div>
                        <div class="player-name">${b.player.full_name}${isMe?' <span style="color:var(--primary);font-size:11px">(나)</span>':''}</div>
                        <div class="player-num">#${b.player.jersey_number} · ${b.player.primary_position}</div>
                      </div>
                    </div>
                  </td>
                  <td>${gradeBadgeHTML(b.grade)}</td>
                  <td><strong style="font-size:16px;color:var(--primary)">${b.total_points}</strong><span style="font-size:11px;color:var(--gray-500)">pt</span></td>
                  <td>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar"><div class="progress-fill ${b.attendance_rate>=70?'green':'primary'}" style="width:${b.attendance_rate}%"></div></div>
                      <div class="progress-label">${b.attendance_rate}%</div>
                    </div>
                  </td>
                  <td><span style="font-weight:800;color:${b.current_streak>=5?'var(--red)':'var(--gray-700)'}">${b.current_streak}🔥</span></td>
                  <td style="font-size:11px;color:var(--gray-500)">
                    출석+${b.attendance_points} / 스트릭+${b.streak_points} / 회비+${b.dues_points}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  const activePlayers = State.players.filter(p => p.player_status === 'active').length;
  const injuredPlayers = State.players.filter(p => p.player_status === 'injured').length;
  const totalPlayers = State.players.length;

  // 현재 선수 정보
  const curPlayer = getCurrentPlayer();
  const curGrade = curPlayer ? calcPlayerGrade(curPlayer.id, {
    attendance: State.attendance, events: State.events,
    dues: State.dues, injuries: State.injuries, conditionLogs: State.conditionLogs
  }) : null;

  // Next event
  const upcoming = State.events
    .filter(e => new Date(e.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];

  // Latest event attendance
  const latestEvent = State.events.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))[0];
  let attRate = 0;
  if (latestEvent) {
    const evAtt = State.attendance.filter(a => a.event_id === latestEvent.id);
    const attending = evAtt.filter(a => a.status === 'attending').length;
    attRate = evAtt.length ? Math.round((attending / evAtt.length) * 100) : 0;
  }

  // Dues stats (current month)
  const curMonth = new Date().toISOString().slice(0, 7);
  const monthDues = State.dues.filter(d => d.due_month === curMonth || d.due_month === '2026-04');
  const paidCount = monthDues.filter(d => d.status === 'paid').length;
  const duesRate = monthDues.length ? Math.round((paidCount / monthDues.length) * 100) : 0;

  // Active injuries
  const activeInjuries = State.injuries.filter(i => i.is_active === true || i.is_active === 'true');

  return `
    ${curPlayer ? `
    <!-- ★ 내 페이지 퀵 접근 배너 -->
    <div class="quick-banner" onclick="navigate('mypage')">
      <div class="quick-banner-avatar">${initials(curPlayer.full_name)}</div>
      <div class="quick-banner-info">
        <div class="quick-banner-label">현재 접속 선수</div>
        <div class="quick-banner-name">
          <span class="quick-banner-name-text">${curPlayer.full_name}</span>
          <span class="quick-banner-sub">#${curPlayer.jersey_number} · ${curPlayer.primary_position}</span>
          ${curGrade ? gradeBadgeHTML(curGrade.grade) : ''}
        </div>
        ${curGrade ? `
        <div class="quick-banner-xp-wrap">
          <div class="quick-banner-xp-labels">
            <span>${curGrade.total_points}pt</span>
            <span>${curGrade.gradeInfo.next ? curGrade.gradeInfo.next + '까지 ' + curGrade.next_grade_gap + 'pt' : '최고 등급!'}</span>
          </div>
          <div class="quick-banner-xp-bar">
            <div class="quick-banner-xp-fill" style="width:${curGrade.in_grade_progress}%"></div>
          </div>
        </div>` : ''}
      </div>
      <div class="quick-banner-actions">
        <div class="quick-banner-btn">
          <i class="fas fa-user-circle"></i> 내 페이지 →
        </div>
        <div class="quick-banner-shortcuts">
          <div class="quick-banner-shortcut" onclick="event.stopPropagation();navigate('myfeed')">
            <i class="fas fa-rss"></i> My Feed
          </div>
          <div class="quick-banner-shortcut" onclick="event.stopPropagation();navigate('notices')">
            <i class="fas fa-bullhorn"></i> 공지
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-users"></i></div>
        <div class="kpi-label">전체 선수</div>
        <div class="kpi-value">${totalPlayers}</div>
        <div class="kpi-sub">활성 ${activePlayers}명</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-icon"><i class="fas fa-calendar-check"></i></div>
        <div class="kpi-label">최근 출석률</div>
        <div class="kpi-value">${attRate}<span style="font-size:18px">%</span></div>
        <div class="kpi-sub">${latestEvent ? latestEvent.title.slice(0, 14) + '…' : '-'}</div>
      </div>
      <div class="kpi-card ${injuredPlayers > 0 ? '' : 'green'}">
        <div class="kpi-icon"><i class="fas fa-medkit"></i></div>
        <div class="kpi-label">부상자</div>
        <div class="kpi-value">${injuredPlayers}</div>
        <div class="kpi-sub">현재 부상 ${activeInjuries.length}건 진행 중</div>
      </div>
      <div class="kpi-card ${duesRate >= 70 ? 'green' : 'yellow'}">
        <div class="kpi-icon"><i class="fas fa-won-sign"></i></div>
        <div class="kpi-label">4월 회비 납부율</div>
        <div class="kpi-value">${duesRate}<span style="font-size:18px">%</span></div>
        <div class="kpi-sub">${paidCount} / ${monthDues.length} 명 납부</div>
      </div>
    </div>

    <div class="grid-2 mb-24">
      <!-- 다음 일정 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-calendar-alt"></i> 다가오는 일정</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('attendance')">전체 보기</button>
        </div>
        <div class="card-body" style="padding:12px">
          ${State.events
            .sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))
            .slice(0, 4)
            .map(e => `
              <div class="event-card ${e.event_type}" style="margin-bottom:8px">
                <div class="event-type-icon">${eventTypeIcon(e.event_type)}</div>
                <div class="event-meta">
                  <div class="event-title">${e.title}</div>
                  <div class="event-info">
                    <span><i class="far fa-clock"></i>${formatDateTime(e.starts_at)}</span>
                    ${e.location ? `<span><i class="fas fa-map-marker-alt"></i>${e.location}</span>` : ''}
                  </div>
                </div>
                <span class="badge ${e.event_type === 'game' ? 'badge-attending' : 'badge-undecided'}">${eventTypeLabel(e.event_type)}</span>
              </div>
            `).join('') || '<div class="empty-state" style="padding:30px 0"><i class="fas fa-calendar"></i><p>일정 없음</p></div>'}
        </div>
      </div>

      <!-- 출결 차트 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-pie"></i> 최근 훈련 출결 현황</div>
        </div>
        <div class="card-body" style="height:280px;display:flex;align-items:center;justify-content:center">
          <canvas id="attChart" style="max-height:220px"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-2 mb-24">
      <!-- 부상자 리스트 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-exclamation-triangle" style="color:var(--red)"></i> 부상자 현황</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('injury')">전체 보기</button>
        </div>
        <div class="card-body" style="padding:0">
          ${activeInjuries.length === 0
            ? '<div class="empty-state" style="padding:30px"><i class="fas fa-check-circle" style="color:var(--green)"></i><p>부상자 없음</p></div>'
            : activeInjuries.map(i => {
                const p = State.players.find(pl => pl.id === i.player_id) || {};
                return `
                  <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--gray-100)">
                    ${playerAvatar(p.full_name, p.unit)}
                    <div style="flex:1">
                      <div style="font-weight:700;font-size:14px">${p.full_name || '선수'}</div>
                      <div style="font-size:12px;color:var(--gray-500)">${i.body_part} · 통증 ${i.pain_level}/10</div>
                    </div>
                    <div>
                      <div style="display:flex;align-items:center;gap:6px">
                        <div class="pain-bar"><div class="pain-fill" style="width:${i.pain_level * 10}%"></div></div>
                        <span style="font-size:11px;font-weight:700;color:var(--red)">${i.pain_level}</span>
                      </div>
                      ${i.expected_return_date ? `<div style="font-size:11px;color:var(--gray-500);margin-top:3px">복귀 예정: ${i.expected_return_date}</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
        </div>
      </div>

      <!-- 유닛별 선수 분포 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-bar"></i> 유닛별 선수 분포</div>
        </div>
        <div class="card-body" style="height:280px;display:flex;align-items:center;justify-content:center">
          <canvas id="unitChart" style="max-height:220px"></canvas>
        </div>
      </div>
    </div>
  `;
}

function initDashboardCharts() {
  // Attendance Pie Chart
  const latestEvent = State.events.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))[0];
  if (latestEvent) {
    const evAtt = State.attendance.filter(a => a.event_id === latestEvent.id);
    const attending = evAtt.filter(a => a.status === 'attending').length;
    const absent = evAtt.filter(a => a.status === 'absent').length;
    const undecided = evAtt.filter(a => a.status === 'undecided').length;

    const ctx = document.getElementById('attChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['참석', '불참', '미정'],
          datasets: [{
            data: [attending, absent, undecided],
            backgroundColor: ['#1a8a4a', '#c0392b', '#8a8a8a'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } }
          }
        }
      });
    }
  }

  // Unit Bar Chart
  const offenseCount = State.players.filter(p => p.unit === 'offense').length;
  const defenseCount = State.players.filter(p => p.unit === 'defense').length;
  const specialCount = State.players.filter(p => p.unit === 'special').length;
  const ctx2 = document.getElementById('unitChart');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Offense', 'Defense', 'Special'],
        datasets: [{
          label: '선수 수',
          data: [offenseCount, defenseCount, specialCount],
          backgroundColor: ['#7B1818', '#1a5ca8', '#c07a00'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

/* ============================================================
   ROSTER
   ============================================================ */
function renderRoster(filter = 'all', search = '') {
  let filtered = State.players.slice();
  if (filter !== 'all') {
    if (['offense','defense','special'].includes(filter)) filtered = filtered.filter(p => p.unit === filter);
    else filtered = filtered.filter(p => p.player_status === filter);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.full_name||'').toLowerCase().includes(s) ||
      (p.primary_position||'').toLowerCase().includes(s) ||
      String(p.jersey_number).includes(s)
    );
  }

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-users"></i> 선수단 로스터</div>
      <button class="btn btn-primary" onclick="openAddPlayerModal()">
        <i class="fas fa-plus"></i> 선수 등록
      </button>
    </div>

    <div class="filter-bar">
      <div class="search-wrap">
        <i class="fas fa-search"></i>
        <input type="text" class="search-input" id="rosterSearch" placeholder="이름, 포지션, 번호 검색..." value="${search}" oninput="filterRoster()" />
      </div>
      <select class="filter-select" id="rosterFilter" onchange="filterRoster()">
        <option value="all" ${filter==='all'?'selected':''}>전체</option>
        <optgroup label="유닛">
          <option value="offense" ${filter==='offense'?'selected':''}>Offense</option>
          <option value="defense" ${filter==='defense'?'selected':''}>Defense</option>
          <option value="special" ${filter==='special'?'selected':''}>Special</option>
        </optgroup>
        <optgroup label="상태">
          <option value="active" ${filter==='active'?'selected':''}>활성</option>
          <option value="injured" ${filter==='injured'?'selected':''}>부상</option>
          <option value="leave_absence" ${filter==='leave_absence'?'selected':''}>휴학</option>
          <option value="military_leave" ${filter==='military_leave'?'selected':''}>군휴학</option>
        </optgroup>
      </select>
    </div>

    <div class="card">
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>선수</th>
              <th>번호</th>
              <th>유닛</th>
              <th>포지션</th>
              <th>신체</th>
              <th>입단</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-users-slash"></i><p>선수 없음</p></div></td></tr>`
              : filtered.map(p => `
                <tr onclick="openPlayerDetail('${p.id}')">
                  <td>
                    <div class="player-info">
                      ${playerAvatar(p.full_name, p.unit)}
                      <div>
                        <div class="player-name">${p.full_name}</div>
                        <div class="player-num">${p.phone || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="jersey-badge">${p.jersey_number != null ? p.jersey_number : '-'}</span></td>
                  <td>${unitBadge(p.unit)}</td>
                  <td>
                    <span style="font-weight:700;font-size:13px">${p.primary_position || '-'}</span>
                    ${p.secondary_position ? `<span style="color:var(--gray-500);font-size:12px"> / ${p.secondary_position}</span>` : ''}
                  </td>
                  <td style="font-size:12px;color:var(--gray-500)">
                    ${p.height_cm ? `${p.height_cm}cm` : '-'} / ${p.weight_kg ? `${p.weight_kg}kg` : '-'}
                  </td>
                  <td style="font-size:12px;color:var(--gray-500)">${p.join_year || '-'}</td>
                  <td>${statusBadge(p.player_status)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary btn-icon" onclick="event.stopPropagation();openEditPlayerModal('${p.id}')">
                      <i class="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function initRosterEvents() {}

function filterRoster() {
  const filter = document.getElementById('rosterFilter')?.value || 'all';
  const search = document.getElementById('rosterSearch')?.value || '';
  document.getElementById('pageContent').innerHTML = renderRoster(filter, search);
  initRosterEvents();
}

function openPlayerDetail(id) {
  const p = State.players.find(pl => pl.id === id);
  if (!p) return;
  const injuries = State.injuries.filter(i => i.player_id === id);
  const attRecords = State.attendance.filter(a => a.player_id === id);
  const attending = attRecords.filter(a => a.status === 'attending').length;
  const dues = State.dues.filter(d => d.player_id === id);
  const paidDues = dues.filter(d => d.status === 'paid').length;

  openModal('선수 상세 정보', `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--gray-100)">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800">${initials(p.full_name)}</div>
      <div>
        <div style="font-size:22px;font-weight:800">${p.full_name}</div>
        <div style="color:var(--gray-500);font-size:13px">#${p.jersey_number} · ${p.primary_position || '-'} · ${p.unit || '-'}</div>
      </div>
      ${statusBadge(p.player_status)}
    </div>
    <div class="form-row" style="margin-bottom:16px">
      <div><div class="form-label">연락처</div><div style="font-size:14px">${p.phone || '-'}</div></div>
      <div><div class="form-label">입단</div><div style="font-size:14px">${p.join_year || '-'}년</div></div>
    </div>
    <div class="form-row" style="margin-bottom:16px">
      <div><div class="form-label">신장</div><div style="font-size:14px">${p.height_cm || '-'} cm</div></div>
      <div><div class="form-label">체중</div><div style="font-size:14px">${p.weight_kg || '-'} kg</div></div>
    </div>
    <div class="form-row" style="margin-bottom:16px">
      <div><div class="form-label">주포지션</div><div style="font-size:14px;font-weight:700">${p.primary_position || '-'}</div></div>
      <div><div class="form-label">부포지션</div><div style="font-size:14px">${p.secondary_position || '-'}</div></div>
    </div>
    ${p.notes ? `<div style="margin-bottom:16px"><div class="form-label">메모</div><div style="font-size:13px;color:var(--gray-700)">${p.notes}</div></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:20px">
      <div style="background:var(--gray-50);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--primary)">${attRecords.length > 0 ? Math.round(attending/attRecords.length*100) : 0}%</div>
        <div style="font-size:11px;color:var(--gray-500)">출석률</div>
      </div>
      <div style="background:var(--gray-50);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:${injuries.filter(i=>i.is_active==='true'||i.is_active===true).length>0?'var(--red)':'var(--green)'}">${injuries.filter(i=>i.is_active==='true'||i.is_active===true).length}</div>
        <div style="font-size:11px;color:var(--gray-500)">활성 부상</div>
      </div>
      <div style="background:var(--gray-50);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--blue)">${paidDues}/${dues.length}</div>
        <div style="font-size:11px;color:var(--gray-500)">회비 납부</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
      <button class="btn btn-primary" onclick="closeModal();openEditPlayerModal('${id}')">수정</button>
    </div>
  `);
}

function openAddPlayerModal() {
  openModal('선수 등록', renderPlayerForm(null), true);
}

function openEditPlayerModal(id) {
  const p = State.players.find(pl => pl.id === id);
  openModal('선수 정보 수정', renderPlayerForm(p), true);
}

function renderPlayerForm(player) {
  const pos = player?.unit ? POSITIONS[player.unit] || [] : POSITIONS.offense;
  const allPos = ALL_POSITIONS;

  return `
    <form id="playerForm" onsubmit="submitPlayerForm(event, '${player?.id || ''}')">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="form-control" name="full_name" value="${player?.full_name||''}" required placeholder="홍길동" />
        </div>
        <div class="form-group">
          <label class="form-label">연락처 *</label>
          <input class="form-control" name="phone" value="${player?.phone||''}" required placeholder="010-0000-0000" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">등번호</label>
          <input class="form-control" type="number" name="jersey_number" value="${player?.jersey_number!=null?player.jersey_number:''}" min="0" max="99" placeholder="0~99" />
        </div>
        <div class="form-group">
          <label class="form-label">입단연도</label>
          <input class="form-control" type="number" name="join_year" value="${player?.join_year||2026}" min="2000" max="2030" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">신장 (cm)</label>
          <input class="form-control" type="number" name="height_cm" value="${player?.height_cm||''}" step="0.1" placeholder="175" />
        </div>
        <div class="form-group">
          <label class="form-label">체중 (kg)</label>
          <input class="form-control" type="number" name="weight_kg" value="${player?.weight_kg||''}" step="0.1" placeholder="80" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">유닛 *</label>
          <select class="form-control" name="unit" id="unitSelect" onchange="updatePosOptions(this.value)" required>
            <option value="offense" ${player?.unit==='offense'?'selected':''}>Offense</option>
            <option value="defense" ${player?.unit==='defense'?'selected':''}>Defense</option>
            <option value="special" ${player?.unit==='special'?'selected':''}>Special</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">주포지션 *</label>
          <select class="form-control" name="primary_position" id="primaryPosSelect" required>
            ${allPos.map(p2 => `<option value="${p2.code}" ${player?.primary_position===p2.code?'selected':''}>${p2.code} - ${p2.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">부포지션</label>
          <select class="form-control" name="secondary_position">
            <option value="">없음</option>
            ${allPos.map(p2 => `<option value="${p2.code}" ${player?.secondary_position===p2.code?'selected':''}>${p2.code} - ${p2.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">상태</label>
          <select class="form-control" name="player_status">
            <option value="active" ${(player?.player_status||'active')==='active'?'selected':''}>활성</option>
            <option value="injured" ${player?.player_status==='injured'?'selected':''}>부상</option>
            <option value="leave_absence" ${player?.player_status==='leave_absence'?'selected':''}>휴학</option>
            <option value="military_leave" ${player?.player_status==='military_leave'?'selected':''}>군휴학</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">메모</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="특이사항 입력...">${player?.notes||''}</textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${player ? '수정 저장' : '등록'}</button>
      </div>
    </form>
  `;
}

function updatePosOptions(unit) {
  const sel = document.getElementById('primaryPosSelect');
  if (!sel) return;
  const unitPositions = POSITIONS[unit] || ALL_POSITIONS;
  sel.innerHTML = unitPositions.map(p => `<option value="${p.code}">${p.code} - ${p.name}</option>`).join('');
}

async function submitPlayerForm(e, playerId) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.jersey_number = data.jersey_number !== '' ? Number(data.jersey_number) : null;
  data.height_cm = data.height_cm !== '' ? Number(data.height_cm) : null;
  data.weight_kg = data.weight_kg !== '' ? Number(data.weight_kg) : null;
  data.join_year = data.join_year !== '' ? Number(data.join_year) : null;

  try {
    if (playerId) {
      const updated = await API.put('players', playerId, data);
      const idx = State.players.findIndex(p => p.id === playerId);
      if (idx >= 0) State.players[idx] = { ...State.players[idx], ...updated };
      showToast('선수 정보가 수정되었습니다', 'success');
    } else {
      const newPlayer = await API.post('players', data);
      State.players.push(newPlayer);
      showToast('선수가 등록되었습니다', 'success');
    }
    closeModal();
    navigate('roster');
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   ATTENDANCE
   ============================================================ */
function renderAttendance(selectedEventId = null) {
  // ── 뷰·세션 정보 ──
  const isManager  = _currentView === 'manager';
  const isCoach    = _currentView === 'coach';
  const isPlayer   = _currentView === 'player';
  const session    = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
  const myPlayerId = session?.playerId || null;

  const sortedEvents = State.events.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const activeEvent  = selectedEventId
    ? State.events.find(e => e.id === selectedEventId)
    : sortedEvents[0];

  const evAtt = activeEvent
    ? State.attendance.filter(a => a.event_id === activeEvent.id)
    : [];

  const attMap = {};
  evAtt.forEach(a => { attMap[a.player_id] = a; });

  // 선수 뷰: 본인 행만 / 매니저·코치: 전체
  const activePlayers = State.players.filter(p =>
    p.player_status === 'active' || p.player_status === 'injured'
  );
  const visiblePlayers = isPlayer
    ? activePlayers.filter(p => p.id === myPlayerId)
    : activePlayers;

  const attending  = evAtt.filter(a => a.status === 'attending').length;
  const absent     = evAtt.filter(a => a.status === 'absent').length;
  const undecided  = activePlayers.length - attending - absent;

  // 출결 상태 배지 (선수 뷰 타인 행용)
  const attStatusBadge = (status) => {
    if (status === 'attending') return `<span class="badge badge-active" style="min-width:52px;text-align:center">✓ 참석</span>`;
    if (status === 'absent')    return `<span class="badge badge-injured" style="min-width:52px;text-align:center">✗ 불참</span>`;
    return `<span class="badge" style="background:var(--gray-100);color:var(--gray-500);min-width:52px;text-align:center">— 미정</span>`;
  };

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-calendar-check"></i> 출결 관리</div>
      ${(isManager || isCoach) ? `
      <button class="btn btn-primary" onclick="openAddEventModal()">
        <i class="fas fa-plus"></i> 일정 추가
      </button>` : ''}
    </div>

    ${isPlayer ? `
    <div style="background:var(--blue-bg);border:1px solid #bfdbfe;border-radius:8px;
      padding:10px 14px;margin-bottom:16px;font-size:12px;color:#1e40af">
      <i class="fas fa-info-circle"></i>
      <strong>본인 출결만 변경</strong>할 수 있습니다. 타인 출결은 읽기 전용입니다.
    </div>` : ''}

    <div class="grid-2 mb-24">
      <!-- 일정 목록 -->
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--gray-500);
          text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">일정 목록</div>
        ${sortedEvents.map(e => `
          <div class="event-card ${e.event_type} ${activeEvent?.id === e.id ? 'selected-event' : ''}"
               style="${activeEvent?.id === e.id ? 'border-width:3px;' : ''}"
               onclick="selectEvent('${e.id}')">
            <div class="event-type-icon">${eventTypeIcon(e.event_type)}</div>
            <div class="event-meta">
              <div class="event-title">${e.title}</div>
              <div class="event-info">
                <span><i class="far fa-clock"></i>${formatDateTime(e.starts_at)}</span>
                ${e.location ? `<span><i class="fas fa-map-marker-alt"></i>${e.location}</span>` : ''}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:700">${
                State.attendance.filter(a => a.event_id === e.id && a.status === 'attending').length
              }명 참석</div>
              <div style="font-size:11px;color:var(--gray-500)">${eventTypeLabel(e.event_type)}${e.is_mandatory?'·필수':''}</div>
            </div>
          </div>
        `).join('') || '<div class="empty-state"><i class="fas fa-calendar"></i><p>일정을 추가하세요</p></div>'}
      </div>

      <!-- 출결 시트 -->
      <div>
        ${activeEvent ? `
          <div style="margin-bottom:12px">
            <div style="font-size:16px;font-weight:800">${activeEvent.title}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px">
              ${formatDateFull(activeEvent.starts_at)}
              ${activeEvent.location ? '· ' + activeEvent.location : ''}
            </div>
            <div style="display:flex;gap:12px;margin-top:10px">
              <div style="background:var(--green-bg);color:var(--green);padding:6px 14px;border-radius:8px;font-size:13px;font-weight:700">참석 ${attending}</div>
              <div style="background:var(--red-bg);color:var(--red);padding:6px 14px;border-radius:8px;font-size:13px;font-weight:700">불참 ${absent}</div>
              <div style="background:var(--gray-100);color:var(--gray-500);padding:6px 14px;border-radius:8px;font-size:13px;font-weight:700">미정 ${undecided}</div>
            </div>
          </div>

          <div class="card">
            <div class="tbl-wrap">
              <table class="erp-table">
                <thead>
                  <tr><th>선수</th><th>포지션</th><th>출결</th><th>사유</th></tr>
                </thead>
                <tbody id="attendanceBody">
                  ${(isPlayer ? activePlayers : visiblePlayers).map(p => {
                    const att    = attMap[p.id];
                    const status = att?.status || 'undecided';
                    // 선수 뷰: 본인 행만 버튼, 타인 행은 배지
                    const isMine = (p.id === myPlayerId);
                    const canEditRow = !isPlayer || isMine;

                    return `
                      <tr${isMine && isPlayer ? ' style="background:rgba(26,92,168,.04);border-left:3px solid #1a5ca8"' : ''}>
                        <td>
                          <div class="player-info">
                            ${playerAvatar(p.full_name, p.unit)}
                            <div>
                              <div class="player-name">${p.full_name}${isMine && isPlayer ? ' <span style="font-size:10px;color:#1a5ca8;font-weight:700">(나)</span>' : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style="font-weight:700">${p.primary_position||'-'}</span></td>
                        <td>
                          ${canEditRow ? `
                          <div class="att-btn-group">
                            <button class="att-btn ${status==='attending'?'attending':''}"
                              onclick="updateAtt('${activeEvent.id}','${p.id}','attending','${att?.id||''}')">참석</button>
                            <button class="att-btn ${status==='absent'?'absent':''}"
                              onclick="updateAtt('${activeEvent.id}','${p.id}','absent','${att?.id||''}')">불참</button>
                            <button class="att-btn ${status==='undecided'?'undecided':''}"
                              onclick="updateAtt('${activeEvent.id}','${p.id}','undecided','${att?.id||''}')">미정</button>
                          </div>` : attStatusBadge(status)}
                        </td>
                        <td style="font-size:12px;color:var(--gray-500)">${att?.absence_reason||''}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : '<div class="empty-state"><i class="fas fa-mouse-pointer"></i><p>왼쪽에서 일정을 선택하세요</p></div>'}
      </div>
    </div>
  `;
}

function initAttendanceEvents() {}

function selectEvent(id) {
  document.getElementById('pageContent').innerHTML = renderAttendance(id);
}

async function updateAtt(eventId, playerId, newStatus, existingId) {
  // 선수 뷰: 본인 출결만 변경 가능
  const session    = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
  const myPlayerId = session?.playerId || null;
  if (_currentView === 'player' && playerId !== myPlayerId) {
    showToast('본인 출결만 변경할 수 있습니다.', 'error');
    return;
  }

  if (newStatus === 'absent') {
    const reason = prompt('불참 사유를 입력하세요:');
    if (reason === null) return;
    await saveAttendance(eventId, playerId, newStatus, existingId, reason);
  } else {
    await saveAttendance(eventId, playerId, newStatus, existingId, '');
  }
}

async function saveAttendance(eventId, playerId, status, existingId, reason) {
  // 이중 안전장치: UI 우회 시도 차단
  const session    = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
  const myPlayerId = session?.playerId || null;
  if (_currentView === 'player' && playerId !== myPlayerId) {
    showToast('본인 출결만 변경할 수 있습니다.', 'error');
    return;
  }

  const data = { event_id: eventId, player_id: playerId, status, absence_reason: reason };
  try {
    let saved;
    if (existingId && existingId !== '') {
      saved = await API.put('attendance', existingId, data);
      const idx = State.attendance.findIndex(a => a.id === existingId);
      if (idx >= 0) State.attendance[idx] = { ...State.attendance[idx], ...saved };
    } else {
      saved = await API.post('attendance', data);
      State.attendance.push(saved);
    }
    showToast('출결이 저장되었습니다', 'success');
    const curEventId = document.querySelector('.event-card[style*="border-width:3px"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    document.getElementById('pageContent').innerHTML = renderAttendance(eventId);
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

function openAddEventModal() {
  openModal('일정 추가', `
    <form id="eventForm" onsubmit="submitEventForm(event)">
      <div class="form-group">
        <label class="form-label">제목 *</label>
        <input class="form-control" name="title" required placeholder="정기 훈련 #1" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">유형</label>
          <select class="form-control" name="event_type">
            <option value="practice">훈련</option>
            <option value="game">경기</option>
            <option value="meeting">미팅</option>
            <option value="rehab">재활</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">시작 일시 *</label>
          <input class="form-control" type="datetime-local" name="starts_at" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">장소</label>
          <input class="form-control" name="location" placeholder="월드컵 경기장" />
        </div>
        <div class="form-group">
          <label class="form-label">상대팀 (경기 시)</label>
          <input class="form-control" name="opponent" placeholder="강동 라이더스" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">필수 참석</label>
        <select class="form-control" name="is_mandatory">
          <option value="true">필수</option>
          <option value="false">선택</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">메모</label>
        <textarea class="form-control" name="notes" rows="2" placeholder="특이사항..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> 일정 추가</button>
      </div>
    </form>
  `, true);
}

async function submitEventForm(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.is_mandatory = data.is_mandatory === 'true';
  try {
    const newEvent = await API.post('events', data);
    State.events.push(newEvent);
    showToast('일정이 추가되었습니다', 'success');
    closeModal();
    navigate('attendance');
  } catch (err) {
    showToast('추가 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   INJURY / WELLNESS
   ============================================================ */
function renderInjury(tab = 'pending') {
  const session = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;
  const myPlayerId = session?.playerId || null;
  const isManager = _currentView === 'manager';
  const isCoach   = _currentView === 'coach';
  const isPlayer  = _currentView === 'player';

  // ── 부상 데이터 분류 ──
  // 하위호환: approval_status 필드 없는 구 데이터는 confirmed 처리
  const pendingInjuries  = State.injuries.filter(i =>
    (i.approval_status === 'pending') &&
    (isPlayer ? i.player_id === myPlayerId : true)
  );
  const confirmedInjuries = State.injuries.filter(i =>
    (i.approval_status === 'confirmed' || !i.approval_status) &&
    (i.is_active === true || i.is_active === 'true') &&
    (isPlayer ? i.player_id === myPlayerId : true)
  );
  const resolvedInjuries = State.injuries.filter(i =>
    (i.approval_status === 'confirmed' || !i.approval_status) &&
    (i.is_active === false || i.is_active === 'false') &&
    (isPlayer ? i.player_id === myPlayerId : true)
  );

  // 선수 뷰 기본 탭은 'confirmed'
  const defaultTab = isPlayer ? 'confirmed' : 'pending';
  const activeTab  = tab === 'pending' && isPlayer ? 'confirmed' : tab;

  const current =
    activeTab === 'pending'   ? pendingInjuries  :
    activeTab === 'confirmed' ? confirmedInjuries :
    resolvedInjuries;

  const lvl    = { full: '전체 참여', limited: '제한 참여', out: '훈련 제외' };
  const lvlCls = { full: 'badge-active', limited: 'badge-leave', out: 'badge-injured' };

  // 상단 액션 버튼: 매니저·코치는 "리포트 등록", 선수는 "부상 신청"
  const actionBtn = isPlayer
    ? `<button class="btn btn-primary" onclick="openAddInjuryModal()">
        <i class="fas fa-hand-paper"></i> 부상 신청
       </button>`
    : `<button class="btn btn-primary" onclick="openAddInjuryModal()">
        <i class="fas fa-plus"></i> 리포트 등록
       </button>`;

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-medkit"></i> 부상·컨디션 관리</div>
      ${actionBtn}
    </div>

    ${confirmedInjuries.length > 0 && !isPlayer ? `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i>
        현재 <strong>${confirmedInjuries.length}명</strong>의 선수가 부상·컨디션 이슈 중입니다.
      </div>
    ` : ''}

    ${pendingInjuries.length > 0 && (isManager || isCoach) ? `
      <div class="alert" style="background:var(--yellow-bg);border-color:var(--yellow);color:#92400e">
        <i class="fas fa-clock"></i>
        <strong>${pendingInjuries.length}건</strong>의 부상 신청이 매니저 확인을 기다리고 있습니다.
      </div>
    ` : ''}

    <div class="tabs" id="injuryTabs">
      ${!isPlayer ? `
      <button class="tab-btn ${activeTab==='pending'?'active':''}" onclick="switchInjuryTab('pending')">
        대기 중
        <span style="background:var(--yellow-bg);color:#92400e;padding:1px 7px;border-radius:10px;font-size:11px;margin-left:4px">
          ${pendingInjuries.length}
        </span>
      </button>` : ''}
      <button class="tab-btn ${activeTab==='confirmed'?'active':''}" onclick="switchInjuryTab('confirmed')">
        ${isPlayer ? '내 부상 현황' : '확정 부상'}
        <span style="background:var(--red-bg);color:var(--red);padding:1px 7px;border-radius:10px;font-size:11px;margin-left:4px">
          ${confirmedInjuries.length}
        </span>
      </button>
      <button class="tab-btn ${activeTab==='resolved'?'active':''}" onclick="switchInjuryTab('resolved')">
        회복 완료
        <span style="background:var(--green-bg);color:var(--green);padding:1px 7px;border-radius:10px;font-size:11px;margin-left:4px">
          ${resolvedInjuries.length}
        </span>
      </button>
    </div>

    <div class="card">
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>선수</th>
              <th>부위</th>
              <th>통증 강도</th>
              <th>증상</th>
              <th>참여 수준</th>
              <th>복귀 예정</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            ${current.length === 0
              ? `<tr><td colspan="7">
                  <div class="empty-state">
                    <i class="fas fa-check-circle" style="color:var(--green)"></i>
                    <p>${
                      activeTab==='pending'   ? '대기 중인 부상 신청 없음' :
                      activeTab==='confirmed' ? (isPlayer ? '현재 부상 없음' : '확정된 부상자 없음') :
                      '회복 완료 기록 없음'
                    }</p>
                  </div>
                </td></tr>`
              : current.map(i => {
                  const p = State.players.find(pl => pl.id === i.player_id) || {};
                  return `
                    <tr>
                      <td>
                        <div class="player-info">
                          ${playerAvatar(p.full_name, p.unit)}
                          <div>
                            <div class="player-name">${p.full_name||'알 수 없음'}</div>
                            <div class="player-num">${p.primary_position||''}</div>
                          </div>
                        </div>
                      </td>
                      <td style="font-weight:600">${i.body_part}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div class="pain-bar"><div class="pain-fill" style="width:${i.pain_level*10}%"></div></div>
                          <span style="font-weight:800;font-size:14px;color:${i.pain_level>=7?'var(--red)':i.pain_level>=4?'var(--yellow)':'var(--gray-700)'}">${i.pain_level}</span>
                        </div>
                      </td>
                      <td style="font-size:12px;color:var(--gray-700);max-width:160px">${i.symptoms||'-'}</td>
                      <td><span class="badge ${lvlCls[i.participation_level]||''}">${lvl[i.participation_level]||i.participation_level}</span></td>
                      <td style="font-size:12px;color:var(--gray-500)">${i.expected_return_date||'-'}</td>
                      <td>
                        ${activeTab === 'pending' && isManager
                          ? `<button class="btn btn-sm btn-primary" onclick="confirmInjury('${i.id}')">
                               <i class="fas fa-check-double"></i> 확정
                             </button>`
                          : activeTab === 'pending' && isCoach
                          ? `<span class="badge" style="background:var(--yellow-bg);color:#92400e">대기 중</span>`
                          : activeTab === 'pending' && isPlayer
                          ? `<span class="badge" style="background:var(--yellow-bg);color:#92400e">검토 중</span>`
                          : (i.is_active === true || i.is_active === 'true') && (isManager || isCoach)
                          ? `<button class="btn btn-sm btn-success" onclick="resolveInjury('${i.id}')">
                               <i class="fas fa-check"></i> 회복
                             </button>`
                          : (i.is_active === true || i.is_active === 'true') && isPlayer
                          ? `<span class="badge badge-injured">부상 중</span>`
                          : `<span class="badge badge-active">회복</span>`
                        }
                      </td>
                    </tr>
                  `;
                }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function initInjuryEvents() {}

function switchInjuryTab(tab) {
  document.getElementById('pageContent').innerHTML = renderInjury(tab);
  initInjuryEvents();
}

function openAddInjuryModal() {
  const isPlayer  = _currentView === 'player';
  const session   = (typeof AUTH !== 'undefined') ? AUTH.getSession() : null;

  // 선수 뷰: 본인 player_id 자동 세팅, 선수 선택 UI 없음
  const playerPickerHTML = isPlayer ? `
    <input type="hidden" name="player_id" value="${session?.playerId || ''}">
    <div class="form-group">
      <label class="form-label">신청자</label>
      <div class="form-control" style="background:var(--gray-50);color:var(--gray-600)">
        ${session?.displayName || '본인'}
      </div>
    </div>` : `
    <div class="form-group">
      <label class="form-label">선수 *</label>
      <select class="form-control" name="player_id" required>
        <option value="">선수 선택</option>
        ${State.players
          .filter(p => p.player_status !== 'military_leave')
          .map(p => `<option value="${p.id}">#${p.jersey_number} ${p.full_name} (${p.primary_position})</option>`)
          .join('')}
      </select>
    </div>`;

  const title  = isPlayer ? '부상 신청' : '부상·컨디션 리포트 등록';
  const btnTxt = isPlayer ? '신청 제출' : '등록';

  openModal(title, `
    <form id="injuryForm" onsubmit="submitInjuryForm(event)">
      ${playerPickerHTML}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">부상 부위 *</label>
          <input class="form-control" name="body_part" required placeholder="무릎, 어깨, 발목..." />
        </div>
        <div class="form-group">
          <label class="form-label">통증 강도 (1-10) *</label>
          <input class="form-control" type="number" name="pain_level" required min="1" max="10" placeholder="1~10" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">증상 설명</label>
        <textarea class="form-control" name="symptoms" rows="2" placeholder="증상을 구체적으로 입력하세요..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">훈련 참여 수준</label>
          <select class="form-control" name="participation_level">
            <option value="full">전체 참여</option>
            <option value="limited">제한 참여</option>
            <option value="out">훈련 제외</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">복귀 예정일</label>
          <input class="form-control" type="date" name="expected_return_date" />
        </div>
      </div>
      ${isPlayer ? `
      <div style="background:var(--yellow-bg);border:1px solid var(--yellow);border-radius:8px;
        padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e">
        <i class="fas fa-info-circle"></i>
        신청 후 <strong>매니저 확인</strong>을 거쳐 최종 등록됩니다.
      </div>` : ''}
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${btnTxt}
        </button>
      </div>
    </form>
  `, true);
}

async function submitInjuryForm(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.pain_level = Number(data.pain_level);

  const isPlayer = _currentView === 'player';

  if (isPlayer) {
    // 선수 뷰: 신청 상태로만 등록 — 매니저 확인 전까지 미확정
    data.approval_status = 'pending';
    data.is_active       = false;
  } else {
    // 매니저·코치 뷰: 즉시 확정 등록
    data.approval_status = 'confirmed';
    data.is_active       = true;
  }

  try {
    const newInj = await API.post('injury_reports', data);
    State.injuries.push(newInj);

    // 매니저·코치가 직접 등록한 경우만 선수 상태 즉시 변경
    if (!isPlayer) {
      const player = State.players.find(p => p.id === data.player_id);
      if (player) {
        await API.patch('players', player.id, { player_status: 'injured' });
        player.player_status = 'injured';
      }
    }

    showToast(
      isPlayer ? '부상 신청이 제출되었습니다. 매니저 확인 후 등록됩니다.' : '리포트가 등록되었습니다',
      'success'
    );
    closeModal();
    navigate('injury');
  } catch (err) {
    showToast('등록 실패: ' + err.message, 'error');
  }
}

/* ── 부상 신청 확정 (매니저 전용) ── */
async function confirmInjury(injuryId) {
  // 매니저 뷰에서만 실행 가능
  if (_currentView !== 'manager') {
    showToast('매니저만 부상을 확정할 수 있습니다.', 'error');
    return;
  }
  if (!confirm('이 부상 신청을 확정하시겠습니까?\n확정 시 해당 선수 상태가 "부상"으로 변경됩니다.')) return;

  try {
    const updated = await API.patch('injury_reports', injuryId, {
      approval_status: 'confirmed',
      is_active:       true
    });
    const idx = State.injuries.findIndex(i => i.id === injuryId);
    if (idx >= 0) State.injuries[idx] = { ...State.injuries[idx], ...updated };

    // 선수 상태 → 부상으로 변경
    const inj    = State.injuries[idx];
    const player = State.players.find(p => p.id === inj?.player_id);
    if (player) {
      await API.patch('players', player.id, { player_status: 'injured' });
      player.player_status = 'injured';
    }

    showToast('부상이 확정되었습니다.', 'success');
    navigate('injury');
  } catch (err) {
    showToast('처리 실패: ' + err.message, 'error');
  }
}

/* ── 부상 회복 처리 (매니저·코치 전용) ── */
async function resolveInjury(injuryId) {
  // 선수 뷰에서 호출 차단
  if (_currentView === 'player') {
    showToast('매니저 또는 코치만 회복 처리를 할 수 있습니다.', 'error');
    return;
  }
  if (!confirm('해당 부상을 회복 완료로 처리하시겠습니까?')) return;
  try {
    const updated = await API.patch('injury_reports', injuryId, { is_active: false });
    const idx = State.injuries.findIndex(i => i.id === injuryId);
    if (idx >= 0) State.injuries[idx] = { ...State.injuries[idx], ...updated };

    // 해당 선수에게 다른 활성 부상이 없으면 상태 복귀
    const inj = State.injuries[idx];
    const stillInjured = State.injuries.some(i =>
      i.player_id === inj.player_id &&
      (i.is_active === true || i.is_active === 'true') &&
      (i.approval_status === 'confirmed' || !i.approval_status)
    );
    if (!stillInjured) {
      const player = State.players.find(p => p.id === inj.player_id);
      if (player) {
        await API.patch('players', player.id, { player_status: 'active' });
        player.player_status = 'active';
      }
    }
    showToast('회복 처리 완료', 'success');
    navigate('injury');
  } catch (err) {
    showToast('처리 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   DUES (회비)
   ============================================================ */
function renderDues() {
  const months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
  const activePlayers = State.players.filter(p => p.player_status !== 'military_leave');

  // Build lookup
  const duesMap = {};
  State.dues.forEach(d => {
    duesMap[`${d.player_id}_${d.due_month}`] = d;
  });

  const curMonth = '2026-04';
  const monthDues = State.dues.filter(d => d.due_month === curMonth);
  const paidCount = monthDues.filter(d => d.status === 'paid').length;
  const unpaidCount = monthDues.filter(d => d.status === 'unpaid').length;
  const totalAmount = paidCount * 50000;

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-won-sign"></i> 회비 관리</div>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="kpi-card green">
        <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
        <div class="kpi-label">납부 완료</div>
        <div class="kpi-value">${paidCount}</div>
        <div class="kpi-sub">4월 기준 · ${totalAmount.toLocaleString()}원 수납</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><i class="fas fa-exclamation-circle"></i></div>
        <div class="kpi-label">미납</div>
        <div class="kpi-value">${unpaidCount}</div>
        <div class="kpi-sub">미수금 ${(unpaidCount * 50000).toLocaleString()}원</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-icon"><i class="fas fa-percentage"></i></div>
        <div class="kpi-label">납부율</div>
        <div class="kpi-value">${monthDues.length ? Math.round(paidCount/monthDues.length*100) : 0}<span style="font-size:18px">%</span></div>
        <div class="kpi-sub">4월 납부 현황</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-table"></i> 월별 납부 현황 (2026년)</div>
        <div style="font-size:12px;color:var(--gray-500)">클릭하여 납부 상태 변경</div>
      </div>
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>선수</th>
              <th>포지션</th>
              ${months.map(m => `<th style="text-align:center">${m.slice(5)}월</th>`).join('')}
              <th style="text-align:center">납부율</th>
            </tr>
          </thead>
          <tbody>
            ${activePlayers.map(p => {
              const playerDues = months.map(m => duesMap[`${p.id}_${m}`]);
              const paid = playerDues.filter(d => d?.status === 'paid').length;
              const total = months.length;
              const rate = Math.round(paid / total * 100);
              return `
                <tr>
                  <td>
                    <div class="player-info">
                      ${playerAvatar(p.full_name, p.unit)}
                      <div class="player-name">${p.full_name}</div>
                    </div>
                  </td>
                  <td><span style="font-weight:700">${p.primary_position||'-'}</span></td>
                  ${months.map((m, mi) => {
                    const d = playerDues[mi];
                    const s = d?.status || 'empty';
                    return `
                      <td style="text-align:center">
                        <span class="badge badge-${s === 'paid' ? 'paid' : s === 'unpaid' ? 'unpaid' : 'undecided'}"
                              style="cursor:pointer"
                              onclick="toggleDues('${p.id}','${m}','${d?.id||''}','${s}')">
                          ${s === 'paid' ? '✓' : s === 'unpaid' ? '✗' : '-'}
                        </span>
                      </td>
                    `;
                  }).join('')}
                  <td style="text-align:center">
                    <div class="progress-bar-wrap">
                      <div class="progress-bar"><div class="progress-fill ${rate>=70?'green':'primary'}" style="width:${rate}%"></div></div>
                      <div class="progress-label" style="color:${rate>=70?'var(--green)':'var(--primary)'}">${rate}%</div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function initDuesEvents() {}

async function toggleDues(playerId, month, existingId, currentStatus) {
  const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
  const data = { player_id: playerId, due_month: month, amount: 50000, status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : '' };
  try {
    if (existingId && existingId !== '') {
      const updated = await API.put('monthly_dues', existingId, data);
      const idx = State.dues.findIndex(d => d.id === existingId);
      if (idx >= 0) State.dues[idx] = { ...State.dues[idx], ...updated };
    } else {
      const newDue = await API.post('monthly_dues', data);
      State.dues.push(newDue);
    }
    showToast(newStatus === 'paid' ? '납부 완료 처리' : '미납으로 변경', 'success');
    document.getElementById('pageContent').innerHTML = renderDues();
  } catch (err) {
    showToast('변경 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   DEPTH CHART
   ============================================================ */
function renderDepthChart(unitTab = 'offense') {
  const unitPositions = POSITIONS[unitTab] || [];

  // Build depth assignments (simple mapping by primary position)
  const depthByPos = {};
  State.players
    .filter(p => p.unit === unitTab && p.player_status === 'active')
    .forEach(p => {
      const pos = p.primary_position;
      if (pos) {
        if (!depthByPos[pos]) depthByPos[pos] = [];
        depthByPos[pos].push(p);
      }
    });

  const unitColors = { offense: 'var(--primary)', defense: 'var(--blue)', special: 'var(--yellow)' };
  const unitLabel = { offense: 'OFFENSE', defense: 'DEFENSE', special: 'SPECIAL' };

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-sitemap"></i> 뎁스 차트</div>
      <div style="font-size:12px;color:var(--gray-500)">2026 시즌 기준</div>
    </div>

    <div class="tabs">
      <button class="tab-btn ${unitTab==='offense'?'active':''}" onclick="switchDepthTab('offense')">🏈 Offense</button>
      <button class="tab-btn ${unitTab==='defense'?'active':''}" onclick="switchDepthTab('defense')">🛡️ Defense</button>
      <button class="tab-btn ${unitTab==='special'?'active':''}" onclick="switchDepthTab('special')">⭐ Special Teams</button>
    </div>

    ${unitPositions.map(pos => {
      const players = depthByPos[pos.code] || [];
      if (players.length === 0 && unitTab !== 'offense') return '';
      return `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">${pos.group} — ${pos.name}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:stretch">
            <div class="depth-slot pos-label" style="background:${unitColors[unitTab]};min-width:80px;display:flex;align-items:center;justify-content:center">
              ${pos.code}
            </div>
            ${players.length === 0
              ? `<div class="depth-slot" style="min-width:120px;color:var(--gray-300);display:flex;align-items:center;justify-content:center;font-size:12px">미배정</div>`
              : players.slice(0, 3).map((p, idx) => `
                <div class="depth-slot" style="min-width:120px">
                  <div style="display:flex;align-items:center;justify-content:center;margin-bottom:6px">
                    <span class="depth-rank-badge r${idx+1}">${idx+1}</span>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">
                    ${playerAvatar(p.full_name, p.unit)}
                    <div>
                      <div class="depth-player-name">${p.full_name}</div>
                      <div style="font-size:10px;color:var(--gray-500)">#${p.jersey_number}</div>
                    </div>
                  </div>
                  ${p.player_status !== 'active' ? `<div style="text-align:center">${statusBadge(p.player_status)}</div>` : ''}
                </div>
              `).join('')}
            <div class="depth-slot" style="min-width:90px;border-style:dashed;display:flex;align-items:center;justify-content:center;color:var(--gray-300);cursor:pointer;font-size:12px" onclick="showToast('뎁스 차트 편집 기능 준비 중', 'info')">
              <i class="fas fa-plus" style="font-size:14px"></i>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function switchDepthTab(unit) {
  document.getElementById('pageContent').innerHTML = renderDepthChart(unit);
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title, body, large = false) {
  // title이 HTML 문자열이면 innerHTML, 아니면 textContent
  const titleEl = document.getElementById('modalTitle');
  if (typeof title === 'string' && /<[a-z][\s\S]*>/i.test(title)) {
    titleEl.innerHTML = title;
  } else {
    titleEl.textContent = title;
  }
  document.getElementById('modalBody').innerHTML = body;
  const box = document.getElementById('modalBox');
  box.style.maxWidth = large ? '640px' : '480px';
  document.getElementById('modalBackdrop').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.body.style.overflow = '';
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ` ${type}` : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 2800);
}
