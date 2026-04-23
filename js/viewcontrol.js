/* ============================================================
   viewcontrol.js — View-Based Access Control & Growth Velocity
   Manager / Coach / Player 뷰 제어 + 성장 속도 분석
   PlayProve Coaching Hub v3
   ============================================================ */

/* ——— 현재 뷰 모드 ——— */
let _currentView = 'manager'; // manager | coach | player

const VIEW_META = {
  manager: { label: 'Manager', icon: 'fa-shield-alt',         color: '#7B1818',  description: '전체 데이터 접근 가능' },
  coach:   { label: 'Coach',   icon: 'fa-chalkboard-teacher', color: '#1a5ca8',  description: '평가·훈련·출결 관리' },
  player:  { label: 'Player',  icon: 'fa-running',            color: '#1a8a4a',  description: '개인 데이터만 열람' }
};

/* 페이지별 접근 권한 정의 */
const ALL = ['manager', 'coach', 'player'];
const PAGE_ACCESS = {
  // ── 전체 공개 ──
  dashboard:   ALL,
  roster:      ALL,
  attendance:  ALL,
  injury:      ALL,
  depthchart:  ALL,
  iip_coach:   ALL,
  ai_tactical: ALL,
  mypage:      ALL,
  my_iip:      ALL,
  myfeed:      ALL,
  notices:     ALL,
  growth:      ALL,
  // ── Manager 전용 ──
  dues:        ['manager'],
  admin:       ['manager'],
  // ── Manager + Coach 전용 ──
  performance:    ['manager', 'coach'],
  simulator:      ['manager', 'coach'],
  rapidcheck:     ['manager', 'coach'],
  coach_plan:     ['manager', 'coach'],
  // ── 훈련계획 (전체 공개) ──
  practice_plan:  ['manager', 'coach', 'player'],
};

/* 뷰 전환 */
function switchView(view) {
  _currentView = view;

  // 버튼 활성화 업데이트
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // View Mode Badge 업데이트
  const meta = VIEW_META[view];
  const badge = document.getElementById('viewModeBadge');
  if (badge) {
    badge.style.background = meta.color + '15';
    badge.style.color = meta.color;
    badge.style.borderColor = meta.color + '30';
    badge.innerHTML = `<i class="fas ${meta.icon}"></i> <span id="viewModeLabel">${meta.label}</span>`;
  }

  // 사이드바 표시/숨김 제어
  applyViewVisibility(view);

  // Player 뷰로 전환 시 자동 내 페이지로 이동
  if (view === 'player') {
    navigate('mypage');
  }

  showToast(`${meta.label} 뷰로 전환되었습니다`, 'success');
}

function applyViewVisibility(view) {
  // .view-manager / .view-coach / .view-player 클래스 제어
  // (하위호환: .view-admin 도 manager로 동일 처리)
  document.querySelectorAll('[class*="view-"]').forEach(el => {
    const classes = [...el.classList];
    const viewClasses = classes.filter(c =>
      c.startsWith('view-') &&
      c !== 'view-btn' &&
      c !== 'view-mode-badge' &&
      c !== 'view-switcher'
    );
    if (viewClasses.length === 0) return;

    const isVisible = viewClasses.some(vc => {
      const vName = vc.replace('view-', '');
      // manager 뷰: manager(또는 하위호환 admin) 요소 표시
      if (vName === 'manager' || vName === 'admin') return view === 'manager';
      // coach 뷰: manager+coach 요소 표시
      if (vName === 'coach') return view === 'manager' || view === 'coach';
      // player 요소는 항상 표시
      if (vName === 'player') return true;
      return true;
    });
    el.style.display = isVisible ? '' : 'none';
  });
}

/* 페이지 접근 권한 체크 */
function canAccess(page) {
  const allowed = PAGE_ACCESS[page] || ['manager'];
  return allowed.includes(_currentView);
}

function guardPage(page) {
  if (!canAccess(page)) {
    return `
      <div class="access-denied-wrap">
        <div class="access-denied-icon">🔒</div>
        <div class="access-denied-title">접근 권한 없음</div>
        <div class="access-denied-msg">
          <strong>${VIEW_META[_currentView]?.label}</strong> 뷰에서는 이 페이지에 접근할 수 없습니다.
        </div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:8px">
          접근 가능 뷰: ${(PAGE_ACCESS[page]||[]).map(v => VIEW_META[v]?.label).join(', ')}
        </div>
        <button class="btn btn-primary" style="margin-top:20px" onclick="navigate('mypage')">
          <i class="fas fa-home"></i> 내 페이지로 이동
        </button>
      </div>
    `;
  }
  return null;
}

/* ============================================================
   GROWTH VELOCITY — 성장 속도 분석
   ============================================================ */

/* 동기도 점수 (Motivational Score)
   기술 40% + 노력/출석 60% — 선수 공개용 */
function calcMotivationalScore(playerId) {
  const ps = (State.performanceScores || []).find(p => p.player_id === playerId);
  if (!ps) return null;
  return calcMotivScore(ps);
}

/* 성장 속도 (Growth Velocity) 계산
   최근 IIP 완료율, 출석 트렌드, 조건 로그 상승률로 측정 */
function calcGrowthVelocity(playerId) {
  const player = State.players.find(p => p.id === playerId);
  if (!player) return { score: 0, label: '데이터 부족', color: '#999', trend: 'neutral' };

  // 1. IIP 완료율 (자가훈련 성실도)
  const iipAll = (State.iipAssignments || []).filter(a => a.player_id === playerId);
  const iipComp = iipAll.filter(a => a.status === 'completed');
  const iipRate = iipAll.length ? iipComp.length / iipAll.length : 0;

  // 2. 최근 출석 트렌드 (최근 5개 이벤트)
  const recentEvents = [...(State.events || [])]
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
    .slice(0, 5);
  const recentAtt = recentEvents.filter(ev => {
    const att = (State.attendance || []).find(a => a.player_id === playerId && a.event_id === ev.id);
    return att?.status === 'attending';
  });
  const attTrend = recentEvents.length ? recentAtt.length / recentEvents.length : 0;

  // 3. 컨디션 상승률 (최근 3개 로그 평균)
  const condLogs = [...(State.conditionLogs || [])]
    .filter(c => c.player_id === playerId)
    .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  const recent3 = condLogs.slice(0, 3);
  const older3 = condLogs.slice(3, 6);
  let condTrend = 0;
  if (recent3.length && older3.length) {
    const recentAvg = recent3.reduce((s, c) => s + (Number(c.condition_score) || 5), 0) / recent3.length;
    const olderAvg = older3.reduce((s, c) => s + (Number(c.condition_score) || 5), 0) / older3.length;
    condTrend = (recentAvg - olderAvg) / 10; // -1 ~ +1
  }

  // 종합 성장 속도 (0-100)
  const velocity = Math.round(
    (iipRate * 40 + attTrend * 40 + (condTrend + 1) / 2 * 20)
  );

  let label, color, trend;
  if (velocity >= 75) { label = '🚀 급성장';      color = '#1a8a4a'; trend = 'up'; }
  else if (velocity >= 55) { label = '📈 성장 중';  color = '#1a5ca8'; trend = 'up'; }
  else if (velocity >= 35) { label = '➡️ 유지';    color = '#c07a00'; trend = 'neutral'; }
  else                    { label = '📉 하락 주의'; color = '#c0392b'; trend = 'down'; }

  return { score: velocity, label, color, trend, iipRate, attTrend, condTrend };
}

/* 팀 전체 Growth Velocity 랭킹 */
function buildGrowthRanking() {
  return State.players
    .filter(p => p.player_status === 'active')
    .map(p => ({
      player: p,
      gv: calcGrowthVelocity(p.id),
      motiv: calcMotivationalScore(p.id),
      ps: (State.performanceScores || []).find(x => x.player_id === p.id)
    }))
    .sort((a, b) => b.gv.score - a.gv.score);
}

/* ============================================================
   GROWTH ANALYTICS PAGE — 성장 분석 대시보드
   ============================================================ */
function renderGrowthAnalytics() {
  const ranking = buildGrowthRanking();
  const topGrower = ranking[0];
  const player = getCurrentPlayer();
  const myGV = player ? calcGrowthVelocity(player.id) : null;

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-chart-line" style="color:var(--green)"></i> 성장 속도 분석</div>
      <span class="badge badge-active" style="background:rgba(26,138,74,.12);color:var(--green)">Growth Velocity</span>
    </div>

    ${myGV ? `
    <!-- 내 성장 현황 -->
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(123,24,24,.04),rgba(26,92,168,.04))">
      <div class="card-body" style="padding:20px">
        <div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;margin-bottom:12px">내 성장 속도 (${player.full_name})</div>
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="text-align:center">
            <div style="font-size:48px;font-weight:900;color:${myGV.color};line-height:1">${myGV.score}</div>
            <div style="font-size:11px;color:var(--gray-500)">성장지수</div>
          </div>
          <div style="flex:1;min-width:200px">
            <div style="font-size:16px;font-weight:800;margin-bottom:12px;color:${myGV.color}">${myGV.label}</div>
            ${gvSubBar('자가훈련 완료율', Math.round(myGV.iipRate * 100), 'var(--primary)')}
            ${gvSubBar('최근 출석 트렌드', Math.round(myGV.attTrend * 100), 'var(--blue)')}
            ${gvSubBar('컨디션 상승률', Math.round((myGV.condTrend + 1) / 2 * 100), 'var(--green)')}
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- 팀 TOP 성장자 -->
    ${topGrower ? `
    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--green)">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:28px">🚀</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase">이번 시즌 최고 성장 선수</div>
            <div style="font-size:18px;font-weight:800">${topGrower.player.full_name}</div>
            <div style="font-size:12px;color:var(--gray-500)">#${topGrower.player.jersey_number} · ${topGrower.player.primary_position} · 성장지수 ${topGrower.gv.score}</div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- 전체 랭킹 테이블 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-ranking-star"></i> 성장 속도 랭킹</div>
      </div>
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>순위</th><th>선수</th><th style="text-align:center">성장지수</th>
              <th style="text-align:center">상태</th>
              <th style="text-align:center">자가훈련</th>
              <th style="text-align:center">출석</th>
              <th style="text-align:center">동기도 점수</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.map((r, idx) => {
              const isMe = r.player.id === player?.id;
              return `
                <tr style="${isMe ? 'background:var(--primary-fade)' : ''}">
                  <td style="text-align:center;font-size:16px">
                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </td>
                  <td>
                    <div class="player-info">
                      ${playerAvatar(r.player.full_name, r.player.unit)}
                      <div>
                        <div class="player-name">${r.player.full_name}${isMe ? ' <span style="color:var(--primary);font-size:11px">(나)</span>' : ''}</div>
                        <div class="player-num">#${r.player.jersey_number} · ${r.player.primary_position}</div>
                      </div>
                    </div>
                  </td>
                  <td style="text-align:center">
                    <div style="font-size:22px;font-weight:900;color:${r.gv.color}">${r.gv.score}</div>
                  </td>
                  <td style="text-align:center">
                    <span style="font-size:13px;font-weight:700;color:${r.gv.color}">${r.gv.label}</span>
                  </td>
                  <td style="text-align:center">
                    <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                      <div class="progress-bar" style="width:50px"><div class="progress-fill green" style="width:${Math.round(r.gv.iipRate*100)}%"></div></div>
                      <span style="font-size:12px;font-weight:700">${Math.round(r.gv.iipRate * 100)}%</span>
                    </div>
                  </td>
                  <td style="text-align:center">
                    <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                      <div class="progress-bar" style="width:50px"><div class="progress-fill primary" style="width:${Math.round(r.gv.attTrend*100)}%"></div></div>
                      <span style="font-size:12px;font-weight:700">${Math.round(r.gv.attTrend * 100)}%</span>
                    </div>
                  </td>
                  <td style="text-align:center">
                    ${r.motiv !== null
                      ? `<span style="font-weight:800;font-size:15px;color:${Number(r.motiv)>=7?'var(--green)':'var(--primary)'}">${r.motiv}</span>`
                      : '<span style="color:var(--gray-300)">-</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 성장 속도 차트 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-chart-bar"></i> 팀 성장지수 분포</div>
      </div>
      <div class="card-body" style="height:280px">
        <canvas id="growthVelocityChart"></canvas>
      </div>
    </div>
  `;
}

function gvSubBar(label, val, color) {
  return `
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span style="font-weight:600;color:var(--gray-700)">${label}</span>
        <span style="font-weight:800;color:${color}">${val}%</span>
      </div>
      <div style="height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${val}%;background:${color};border-radius:3px;transition:.6s ease"></div>
      </div>
    </div>
  `;
}

function afterRenderGrowthAnalytics() {
  const ranking = buildGrowthRanking();
  const ctx = document.getElementById('growthVelocityChart');
  if (!ctx) return;
  if (ctx._chartInst) ctx._chartInst.destroy();

  const player = getCurrentPlayer();
  ctx._chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ranking.map(r => r.player.full_name),
      datasets: [{
        label: '성장지수',
        data: ranking.map(r => r.gv.score),
        backgroundColor: ranking.map(r =>
          r.player.id === player?.id ? '#7B1818' :
          r.gv.score >= 75 ? '#1a8a4a' :
          r.gv.score >= 55 ? '#1a5ca8' :
          r.gv.score >= 35 ? '#c07a00' : '#c0392b'
        ),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx2) => {
              const r = ranking[ctx2.dataIndex];
              return [r.gv.label, `자가훈련 ${Math.round(r.gv.iipRate*100)}%`, `출석 ${Math.round(r.gv.attTrend*100)}%`];
            }
          }
        }
      },
      scales: {
        y: { min: 0, max: 100, grid: { color: '#f0f0f0' }, ticks: { stepSize: 20 } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

/* ============================================================
   Player 뷰 전용 — 개인 성장 차트 (My Page 통합)
   ============================================================ */
function renderPlayerGrowthCard(playerId) {
  const gv = calcGrowthVelocity(playerId);
  const motiv = calcMotivationalScore(playerId);
  const player = State.players.find(p => p.id === playerId);
  const ps = (State.performanceScores || []).find(p => p.player_id === playerId);

  if (!ps) {
    return `<div class="card"><div class="card-body empty-state"><i class="fas fa-chart-line" style="opacity:.3"></i><p>역량 평가 데이터가 없습니다</p></div></div>`;
  }

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-chart-line" style="color:var(--green)"></i> 나의 성장 분석</div>
        <span style="font-size:13px;font-weight:800;color:${gv.color}">${gv.label}</span>
      </div>
      <div class="card-body">
        <!-- 역량 레이더 (공개 버전) -->
        <div style="text-align:center;margin-bottom:16px">
          <canvas id="playerGrowthRadar" style="max-height:220px"></canvas>
        </div>

        <!-- 동기도 점수 -->
        <div class="motiv-score-wrap" style="margin-bottom:16px">
          <div class="motiv-score-val">${motiv ?? '-'}</div>
          <div>
            <div class="motiv-score-lbl">나의 동기도 점수</div>
            <div class="motiv-breakdown">기술(40%) + 출석노력(60%)</div>
            <div style="font-size:11px;color:var(--gray-500);margin-top:3px">
              이 점수는 코치가 공개한 평가 기준입니다
            </div>
          </div>
        </div>

        <!-- 성장 지표 -->
        ${gvSubBar('자가훈련 완료율', Math.round(gv.iipRate * 100), 'var(--primary)')}
        ${gvSubBar('최근 출석 트렌드', Math.round(gv.attTrend * 100), 'var(--blue)')}
        ${gvSubBar('컨디션 트렌드', Math.round((gv.condTrend + 1) / 2 * 100), 'var(--green)')}

        <!-- 코치 코멘트 (공개 설정된 경우) -->
        ${ps.is_visible_to_player !== false && ps.coach_comment ? `
          <div style="background:rgba(123,24,24,.06);border-left:3px solid var(--primary);padding:12px;border-radius:0 8px 8px 0;margin-top:16px">
            <div style="font-size:10px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:6px">
              <i class="fas fa-comment-alt"></i> 코치 피드백
            </div>
            <div style="font-size:13px;color:var(--gray-700);line-height:1.6">${ps.coach_comment}</div>
            <div style="margin-top:8px">
              ${(ps.keyword_tags||[]).map(kw => `<span class="analyzer-tag"># ${kw}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function initPlayerGrowthRadar(playerId) {
  const ps = (State.performanceScores || []).find(p => p.player_id === playerId);
  const ctx = document.getElementById('playerGrowthRadar');
  if (!ctx || !ps) return;
  if (ctx._chartInst) ctx._chartInst.destroy();

  ctx._chartInst = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['신체', '스킬', '전술', '출석', '멘탈'],
      datasets: [{
        label: '내 역량',
        data: [ps.physical, ps.skill, ps.tactical, ps.attendance, ps.mental].map(v => Number(v)||0),
        backgroundColor: 'rgba(123,24,24,0.1)',
        borderColor: '#7B1818',
        pointBackgroundColor: '#7B1818',
        pointRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, font: { size: 10 } },
          pointLabels: { font: { size: 12, weight: '700' } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ============================================================
   AI 전술 어시스턴트 렌더 - coaching.js에서 추출하여 여기서 통합
   ============================================================ */
function renderAITacticalPage() {
  return renderAITactical ? renderAITactical() : '<div class="empty-state"><p>AI 전술 어시스턴트를 불러올 수 없습니다.</p></div>';
}
