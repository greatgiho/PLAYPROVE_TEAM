/* ============================================================
   simulator.js — Roster Simulator & Unit Strength Engine
   PlayProve Coaching Hub v3
   ============================================================ */

/* ——— 포지션 그룹 가중치 (유닛 전력 기여도) ——— */
const POS_WEIGHT = {
  QB: 2.5, RB: 1.4, FB: 1.0, WR: 1.6, TE: 1.3, C: 1.5, G: 1.3, T: 1.4,
  DE: 1.6, DT: 1.5, NT: 1.4, OLB: 1.3, ILB: 1.4, MLB: 1.5, CB: 1.4, NB: 1.1, FS: 1.2, SS: 1.3,
  K: 1.0, P: 0.8, LS: 0.8, KR: 1.0, PR: 1.0
};

/* ——— 유닛 강도 계산 ——— */
function calcUnitStrength(playerList, psMap, excludeIds = []) {
  const result = { offense: 0, defense: 0, special: 0, offenseCount: 0, defenseCount: 0, specialCount: 0 };

  playerList
    .filter(p => p.player_status === 'active' && !excludeIds.includes(p.id))
    .forEach(p => {
      const ps = psMap[p.player_id] || psMap[p.id];
      const weight = POS_WEIGHT[p.primary_position] || 1.0;
      const avgScore = ps ? calcAvgScore(ps) : 5.0; // 평가 없으면 기본 5점
      const contribution = avgScore * weight;

      if (p.unit === 'offense') {
        result.offense += contribution;
        result.offenseCount++;
      } else if (p.unit === 'defense') {
        result.defense += contribution;
        result.defenseCount++;
      } else {
        result.special += contribution;
        result.specialCount++;
      }
    });

  // 정규화 (0-100)
  const maxPossible = { offense: 200, defense: 200, special: 80 };
  result.offenseScore = Math.min(100, Math.round((result.offense / maxPossible.offense) * 100));
  result.defenseScore = Math.min(100, Math.round((result.defense / maxPossible.defense) * 100));
  result.specialScore = Math.min(100, Math.round((result.special / maxPossible.special) * 100));
  result.totalScore = Math.round((result.offenseScore + result.defenseScore + result.specialScore) / 3);

  return result;
}

/* ——— 선수 제외 시 전력 손실 계산 ——— */
function calcRemovalImpact(players, psMap) {
  const psRecords = State.performanceScores || [];
  const basePsMap = {};
  psRecords.forEach(ps => { basePsMap[ps.player_id] = ps; });

  const activePlayers = players.filter(p => p.player_status === 'active');
  const baseStrength = calcUnitStrength(activePlayers, basePsMap);

  return activePlayers.map(p => {
    const withoutPlayer = calcUnitStrength(activePlayers, basePsMap, [p.id]);
    const offenseDiff = baseStrength.offenseScore - withoutPlayer.offenseScore;
    const defenseDiff = baseStrength.defenseScore - withoutPlayer.defenseScore;
    const specialDiff = baseStrength.specialScore - withoutPlayer.specialScore;
    const totalDiff = baseStrength.totalScore - withoutPlayer.totalScore;

    return {
      player: p,
      baseStrength,
      withoutStrength: withoutPlayer,
      offenseDiff,
      defenseDiff,
      specialDiff,
      totalDiff,
      unitDiff: p.unit === 'offense' ? offenseDiff : p.unit === 'defense' ? defenseDiff : specialDiff
    };
  }).sort((a, b) => b.totalDiff - a.totalDiff);
}

/* ============================================================
   SIMULATOR PAGE RENDER
   ============================================================ */
function renderSimulator() {
  const psRecords = State.performanceScores || [];
  const psMap = {};
  psRecords.forEach(ps => { psMap[ps.player_id] = ps; });

  const activePlayers = State.players.filter(p => p.player_status === 'active');
  const baseStrength = calcUnitStrength(activePlayers, psMap);
  const impacts = calcRemovalImpact(State.players, psMap);
  const topImpact = impacts[0];

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-dice-d20" style="color:var(--primary)"></i> Roster 시뮬레이터</div>
      <span class="badge badge-active" style="background:rgba(123,24,24,.12);color:var(--primary)">v3 NEW</span>
    </div>

    <!-- 현재 전력 요약 -->
    <div class="sim-strength-header" style="margin-bottom:20px">
      <div class="sim-unit-cards">
        ${renderStrengthCard('⚔️', '오펜스', baseStrength.offenseScore, baseStrength.offenseCount, '#7B1818')}
        ${renderStrengthCard('🛡️', '디펜스', baseStrength.defenseScore, baseStrength.defenseCount, '#1a5ca8')}
        ${renderStrengthCard('⭐', '스페셜', baseStrength.specialScore, baseStrength.specialCount, '#c07a00')}
        <div class="sim-total-card">
          <div class="sim-total-icon">🏈</div>
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.5px">팀 총전력</div>
            <div style="font-size:32px;font-weight:900;color:#fff;line-height:1">${baseStrength.totalScore}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">/ 100점</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2 mb-24">
      <!-- 전력 레이더 차트 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-area" style="color:var(--primary)"></i> 유닛별 전력 분포</div>
        </div>
        <div class="card-body" style="height:260px;display:flex;align-items:center;justify-content:center">
          <canvas id="simStrengthChart"></canvas>
        </div>
      </div>

      <!-- 핵심 선수 임팩트 TOP 5 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-exclamation-triangle" style="color:var(--yellow)"></i> 제외 시 전력 손실 TOP 5</div>
          <div style="font-size:11px;color:var(--gray-500)">이 선수가 빠지면 가장 아프다</div>
        </div>
        <div class="card-body" style="padding:0">
          ${impacts.slice(0, 5).map((item, idx) => `
            <div class="impact-row ${idx === 0 ? 'impact-top' : ''}">
              <div class="impact-rank">${idx + 1}</div>
              ${playerAvatar(item.player.full_name, item.player.unit)}
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:13px">${item.player.full_name}</div>
                <div style="font-size:11px;color:var(--gray-500)">#${item.player.jersey_number} · ${item.player.primary_position}</div>
              </div>
              <div class="impact-score-wrap">
                <div class="impact-score ${item.totalDiff >= 5 ? 'critical' : item.totalDiff >= 3 ? 'high' : ''}">
                  -${item.totalDiff}pt
                </div>
                <div class="impact-unit-badge ${item.player.unit}">${item.player.unit.toUpperCase()}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 시뮬레이션 모드 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-flask" style="color:var(--blue)"></i> 시뮬레이션 모드</div>
        <div style="font-size:12px;color:var(--gray-500)">선수를 제외하고 전력 변화를 시뮬레이션</div>
      </div>
      <div class="card-body">
        <div style="margin-bottom:16px">
          <label style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:8px;display:block">
            <i class="fas fa-user-minus"></i> 제외할 선수 선택 (복수 선택 가능)
          </label>
          <div class="sim-player-select" id="simPlayerSelect">
            ${activePlayers.map(p => `
              <label class="sim-check-label" data-unit="${p.unit}">
                <input type="checkbox" value="${p.id}" onchange="runSimulation()" class="sim-check" />
                ${playerAvatar(p.full_name, p.unit)}
                <span>${p.full_name} (#${p.jersey_number} · ${p.primary_position})</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div id="simResult" class="sim-result-wrap"></div>
      </div>
    </div>

    <!-- 전체 선수 기여도 테이블 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-table"></i> 전체 선수 전력 기여도</div>
        <button class="btn btn-sm btn-secondary" onclick="sortImpactTable()">
          <i class="fas fa-sort-amount-down"></i> 임팩트순 정렬
        </button>
      </div>
      <div class="tbl-wrap">
        <table class="erp-table" id="impactTable">
          <thead>
            <tr>
              <th>선수</th>
              <th style="text-align:center">유닛</th>
              <th style="text-align:center">역량 평균</th>
              <th style="text-align:center">포지션 가중치</th>
              <th style="text-align:center">전력 기여도</th>
              <th style="text-align:center">제외 시 손실</th>
              <th style="text-align:center">위험도</th>
            </tr>
          </thead>
          <tbody>
            ${impacts.map(item => {
              const ps = psMap[item.player.id];
              const avg = ps ? calcAvgScore(ps) : '-';
              const weight = POS_WEIGHT[item.player.primary_position] || 1.0;
              const contribution = ps ? Math.round(calcAvgScore(ps) * weight * 10) / 10 : '-';
              const risk = item.totalDiff >= 5 ? 'critical' : item.totalDiff >= 3 ? 'high' : item.totalDiff >= 1 ? 'medium' : 'low';
              const riskLabel = { critical: '⚠️ 최고', high: '🔴 높음', medium: '🟡 보통', low: '🟢 낮음' }[risk];
              return `
                <tr>
                  <td>
                    <div class="player-info">
                      ${playerAvatar(item.player.full_name, item.player.unit)}
                      <div>
                        <div class="player-name">${item.player.full_name}</div>
                        <div class="player-num">#${item.player.jersey_number} · ${item.player.primary_position}</div>
                      </div>
                    </div>
                  </td>
                  <td style="text-align:center">${unitBadge(item.player.unit)}</td>
                  <td style="text-align:center;font-weight:800;color:var(--primary)">${avg}</td>
                  <td style="text-align:center;color:var(--gray-600)">×${weight.toFixed(1)}</td>
                  <td style="text-align:center;font-weight:800;font-size:15px">${contribution}</td>
                  <td style="text-align:center">
                    <span class="impact-badge ${risk}">-${item.totalDiff}pt</span>
                  </td>
                  <td style="text-align:center">${riskLabel}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStrengthCard(icon, label, score, count, color) {
  const tier = score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'D';
  const tierColor = { A: '#1a8a4a', B: '#c07a00', C: '#c0392b', D: '#666' }[tier];
  return `
    <div class="sim-unit-card" style="border-left:4px solid ${color}">
      <div class="sim-unit-icon">${icon}</div>
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px">${label}</div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <div style="font-size:26px;font-weight:900;color:${color};line-height:1">${score}</div>
          <div style="font-size:11px;color:var(--gray-400)">/100</div>
          <div style="font-size:14px;font-weight:800;color:${tierColor};margin-left:2px">${tier}</div>
        </div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:2px">${count}명 기여</div>
        <div class="mini-progress" style="margin-top:6px"><div style="width:${score}%;height:4px;border-radius:2px;background:${color};transition:.6s ease"></div></div>
      </div>
    </div>
  `;
}

/* 시뮬레이션 실행 */
function runSimulation() {
  const checked = [...document.querySelectorAll('.sim-check:checked')].map(c => c.value);
  const psRecords = State.performanceScores || [];
  const psMap = {};
  psRecords.forEach(ps => { psMap[ps.player_id] = ps; });

  const activePlayers = State.players.filter(p => p.player_status === 'active');
  const baseStrength = calcUnitStrength(activePlayers, psMap);
  const newStrength = calcUnitStrength(activePlayers, psMap, checked);
  const resultEl = document.getElementById('simResult');
  if (!resultEl) return;

  if (checked.length === 0) {
    resultEl.innerHTML = '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:20px">제외할 선수를 선택하면 전력 변화를 확인할 수 있습니다</div>';
    return;
  }

  const excludedNames = checked.map(id => {
    const p = State.players.find(x => x.id === id);
    return p ? `${p.full_name}(${p.primary_position})` : '';
  }).filter(Boolean).join(', ');

  const offDiff = newStrength.offenseScore - baseStrength.offenseScore;
  const defDiff = newStrength.defenseScore - baseStrength.defenseScore;
  const spcDiff = newStrength.specialScore - baseStrength.specialScore;
  const totDiff = newStrength.totalScore - baseStrength.totalScore;

  function diffBadge(d) {
    if (d === 0) return `<span style="color:var(--gray-500)">±0</span>`;
    return d > 0
      ? `<span style="color:var(--green);font-weight:800">+${d}</span>`
      : `<span style="color:var(--red);font-weight:800">${d}</span>`;
  }

  resultEl.innerHTML = `
    <div class="sim-result-card">
      <div class="sim-result-title">
        <i class="fas fa-flask" style="color:var(--blue)"></i>
        시뮬레이션 결과 — <span style="color:var(--primary)">${excludedNames}</span> 제외
      </div>
      <div class="sim-compare-grid">
        <div class="sim-compare-col">
          <div class="sim-compare-label">현재</div>
          ${simScoreRow('⚔️ 오펜스', baseStrength.offenseScore, '#7B1818')}
          ${simScoreRow('🛡️ 디펜스', baseStrength.defenseScore, '#1a5ca8')}
          ${simScoreRow('⭐ 스페셜', baseStrength.specialScore, '#c07a00')}
          ${simScoreRow('🏈 총전력', baseStrength.totalScore, '#333')}
        </div>
        <div class="sim-arrow"><i class="fas fa-arrow-right" style="font-size:24px;color:var(--gray-400)"></i></div>
        <div class="sim-compare-col">
          <div class="sim-compare-label" style="color:var(--red)">제외 후</div>
          ${simScoreRow('⚔️ 오펜스', newStrength.offenseScore, '#7B1818', offDiff)}
          ${simScoreRow('🛡️ 디펜스', newStrength.defenseScore, '#1a5ca8', defDiff)}
          ${simScoreRow('⭐ 스페셜', newStrength.specialScore, '#c07a00', spcDiff)}
          ${simScoreRow('🏈 총전력', newStrength.totalScore, '#333', totDiff)}
        </div>
      </div>
      ${Math.abs(totDiff) >= 5 ? `
        <div class="alert alert-danger" style="margin-top:12px">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>전력 경고:</strong> 선택한 선수 제외 시 총전력이 ${Math.abs(totDiff)}pt 감소합니다. 백업 자원 확보가 필요합니다.
        </div>` : Math.abs(totDiff) >= 2 ? `
        <div class="alert alert-warning" style="margin-top:12px">
          <i class="fas fa-info-circle"></i>
          전력 변화 감지: ${Math.abs(totDiff)}pt 변동. 포지션 로테이션을 검토하세요.
        </div>` : `
        <div class="alert alert-success" style="margin-top:12px">
          <i class="fas fa-check-circle"></i>
          전력 영향 미미합니다. 백업 자원이 충분합니다.
        </div>`}
    </div>
  `;
}

function simScoreRow(label, score, color, diff = null) {
  const tierColor = score >= 75 ? '#1a8a4a' : score >= 60 ? '#c07a00' : '#c0392b';
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:70px;font-size:12px;font-weight:600">${label}</div>
      <div style="flex:1">
        <div style="height:6px;border-radius:3px;background:var(--gray-100);overflow:hidden">
          <div style="height:100%;width:${score}%;background:${color};border-radius:3px;transition:.5s ease"></div>
        </div>
      </div>
      <div style="width:50px;text-align:right">
        <span style="font-weight:800;font-size:14px;color:${tierColor}">${score}</span>
        ${diff !== null ? `<span style="font-size:10px;margin-left:2px;color:${diff < 0 ? 'var(--red)' : 'var(--green)'}">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}
      </div>
    </div>
  `;
}

/* 테이블 정렬 토글 */
let _impactSortAsc = false;
function sortImpactTable() {
  _impactSortAsc = !_impactSortAsc;
  const psRecords = State.performanceScores || [];
  const psMap = {};
  psRecords.forEach(ps => { psMap[ps.player_id] = ps; });

  const impacts = calcRemovalImpact(State.players, psMap);
  const sorted = _impactSortAsc ? [...impacts].reverse() : impacts;

  const tbody = document.querySelector('#impactTable tbody');
  if (!tbody) return;
  tbody.innerHTML = sorted.map(item => {
    const ps = psMap[item.player.id];
    const avg = ps ? calcAvgScore(ps) : '-';
    const weight = POS_WEIGHT[item.player.primary_position] || 1.0;
    const contribution = ps ? Math.round(calcAvgScore(ps) * weight * 10) / 10 : '-';
    const risk = item.totalDiff >= 5 ? 'critical' : item.totalDiff >= 3 ? 'high' : item.totalDiff >= 1 ? 'medium' : 'low';
    const riskLabel = { critical: '⚠️ 최고', high: '🔴 높음', medium: '🟡 보통', low: '🟢 낮음' }[risk];
    return `
      <tr>
        <td>
          <div class="player-info">
            ${playerAvatar(item.player.full_name, item.player.unit)}
            <div>
              <div class="player-name">${item.player.full_name}</div>
              <div class="player-num">#${item.player.jersey_number} · ${item.player.primary_position}</div>
            </div>
          </div>
        </td>
        <td style="text-align:center">${unitBadge(item.player.unit)}</td>
        <td style="text-align:center;font-weight:800;color:var(--primary)">${avg}</td>
        <td style="text-align:center;color:var(--gray-600)">×${weight.toFixed(1)}</td>
        <td style="text-align:center;font-weight:800;font-size:15px">${contribution}</td>
        <td style="text-align:center"><span class="impact-badge ${risk}">-${item.totalDiff}pt</span></td>
        <td style="text-align:center">${riskLabel}</td>
      </tr>
    `;
  }).join('');
}

/* 차트 초기화 */
function afterRenderSimulator() {
  const psRecords = State.performanceScores || [];
  const psMap = {};
  psRecords.forEach(ps => { psMap[ps.player_id] = ps; });
  const activePlayers = State.players.filter(p => p.player_status === 'active');
  const strength = calcUnitStrength(activePlayers, psMap);

  const ctx = document.getElementById('simStrengthChart');
  if (!ctx) return;
  if (ctx._chartInst) ctx._chartInst.destroy();

  ctx._chartInst = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['오펜스', '디펜스', '스페셜', '팀 밸런스', '경험치', '출석'],
      datasets: [{
        label: '현재 전력',
        data: [
          strength.offenseScore,
          strength.defenseScore,
          strength.specialScore,
          Math.round((strength.offenseScore + strength.defenseScore) / 2),
          Math.min(100, State.players.filter(p => p.join_year <= 2024).length * 10),
          Math.min(100, Math.round(State.attendance.filter(a => a.status === 'attending').length /
            Math.max(1, State.attendance.length) * 100))
        ],
        backgroundColor: 'rgba(123,24,24,0.12)',
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
          min: 0, max: 100,
          ticks: { stepSize: 20, font: { size: 10 } },
          pointLabels: { font: { size: 12, weight: '700' } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  // 초기 시뮬 결과
  runSimulation();
}
