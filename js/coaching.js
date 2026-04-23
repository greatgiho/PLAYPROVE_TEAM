/* ============================================================
   coaching.js — 역량평가 / Radar Chart / Rapid Check / AI Tactical
   PlayProve Coaching Hub v3
   ============================================================ */

/* ——— 역량 메타 ——— */
const PERF_METRICS = [
  { key: 'physical',   label: '신체',    icon: '💪', color: '#7B1818' },
  { key: 'skill',      label: '스킬',    icon: '⚡', color: '#1a5ca8' },
  { key: 'tactical',   label: '전술',    icon: '🧠', color: '#c07a00' },
  { key: 'attendance', label: '출석',    icon: '📅', color: '#1a8a4a' },
  { key: 'mental',     label: '멘탈',    icon: '🔥', color: '#7b2fbe' }
];

/* 동기도 점수 계산 (Player-facing)
   Skill(기술) 40% + Effort/Attendance 60% */
function calcMotivScore(ps) {
  const skill = (ps.skill || 0) * 0.40;
  const effort = (ps.attendance || 0) * 0.60;
  return Math.round((skill + effort) * 10) / 10; // 최대 10점
}

/* 종합 평균 점수 */
function calcAvgScore(ps) {
  const vals = PERF_METRICS.map(m => Number(ps[m.key]) || 0);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
}

/* 코치 코멘트 → 키워드 태그 자동 추출 */
const KEYWORD_MAP = {
  '스피드': ['speed', 'agility'],     '속도': ['speed'],
  '방향전환': ['agility'],            '풋워크': ['footwork'],
  '루트런닝': ['route'],              '블로킹': ['blocking','footwork'],
  '태클': ['tackling'],               '커버리지': ['coverage'],
  '맨커버리지': ['coverage'],         '멘탈': ['mental'],
  '집중력': ['mental'],               '리더십': ['mental'],
  '패스프로텍션': ['footwork','blocking'], '포켓무브': ['footwork'],
  '릴리스': ['reaction','route'],     '핸즈': ['reaction'],
  '수비읽기': ['reaction'],           '슬랜트': ['route'],
  '민첩성': ['agility'],              '재활': ['speed','agility'],
  '타이밍': ['footwork','reaction'],  '시선처리': ['reaction'],
  '포지셔닝': ['reaction'],           '반응속도': ['reaction'],
  '기본기': ['footwork'],             '스냅': ['footwork'],
  '모빌리티': ['footwork','agility'], '빠른패스': ['footwork'],
  '런스톱': ['tackling'],             '업필드': ['tackling'],
  '미스태클': ['tackling'],
};

function extractKeywords(text) {
  if (!text) return [];
  const found = new Set();
  Object.keys(KEYWORD_MAP).forEach(kw => {
    if (text.includes(kw)) found.add(kw);
  });
  return [...found].slice(0, 8);
}

function keywordsToCategories(keywords) {
  const cats = new Set();
  keywords.forEach(kw => {
    const mapped = KEYWORD_MAP[kw] || [];
    mapped.forEach(c => cats.add(c));
  });
  return [...cats];
}

/* ============================================================
   PERFORMANCE PAGE (Admin/Coach 뷰)
   ============================================================ */
function renderPerformance(selectedPlayerId = null) {
  const activePlayers = State.players.filter(p => p.player_status !== 'military_leave');
  const selId = selectedPlayerId || activePlayers[0]?.id;
  const selPlayer = State.players.find(p => p.id === selId);
  const psRecords = State.performanceScores || [];
  const playerPS = psRecords.find(p => p.player_id === selId);

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-star" style="color:var(--yellow)"></i> 선수 역량 평가</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select class="filter-select" id="perfPlayerSelect" onchange="renderPerformancePage(this.value)">
          ${activePlayers.map(p => `<option value="${p.id}" ${p.id===selId?'selected':''}>#${p.jersey_number} ${p.full_name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="openEvalModal('${selId}')">
          <i class="fas fa-edit"></i> 평가 입력
        </button>
      </div>
    </div>

    <div class="grid-2 mb-24">
      <!-- 레이더 차트 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-area" style="color:var(--primary)"></i> 역량 스파이더 차트</div>
          ${selPlayer ? `<span style="font-size:13px;font-weight:700">${selPlayer.full_name} (#${selPlayer.jersey_number})</span>` : ''}
        </div>
        <div class="card-body" style="display:flex;justify-content:center;padding:20px">
          <div class="radar-container">
            ${playerPS
              ? `<canvas id="radarChart"></canvas>`
              : `<div class="empty-state"><i class="fas fa-chart-area" style="opacity:.3"></i><p>평가 데이터 없음</p></div>`}
          </div>
        </div>
      </div>

      <!-- 스코어 카드 -->
      <div>
        ${playerPS ? `
          <div class="perf-card" style="margin-bottom:16px">
            <div class="perf-card-header">
              <div class="perf-score-ring">
                <div class="perf-total-val">${calcAvgScore(playerPS)}</div>
                <div class="perf-total-lbl">평균</div>
              </div>
              <div style="flex:1">
                <div style="font-size:16px;font-weight:800;margin-bottom:3px">${selPlayer?.full_name}</div>
                <div style="font-size:12px;opacity:.8">#${selPlayer?.jersey_number} · ${selPlayer?.primary_position} · 평가자: ${playerPS.evaluated_by}</div>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
                  <div class="motiv-score-wrap" style="padding:6px 12px">
                    <div class="motiv-score-val" style="font-size:20px">${calcMotivScore(playerPS)}</div>
                    <div>
                      <div class="motiv-score-lbl">동기도 점수</div>
                      <div class="motiv-breakdown">스킬×40% + 출석×60%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="perf-metrics">
              ${PERF_METRICS.map(m => {
                const val = Number(playerPS[m.key]) || 0;
                return `
                  <div class="perf-metric-item">
                    <div class="perf-metric-lbl">${m.icon} ${m.label}</div>
                    <div class="perf-metric-val score-${val}" style="color:${m.color}">${val}</div>
                    <div class="score-bar">
                      <div class="score-bar-fill" style="width:${val*10}%;background:${m.color}"></div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- 코치 코멘트 & 키워드 -->
          ${playerPS.coach_comment ? `
            <div class="comment-analyzer">
              <div class="analyzer-title">
                <i class="fas fa-comment-dots" style="color:var(--accent)"></i>
                코치 코멘트 & 키워드 분석
              </div>
              <div class="analyzer-output">
                ${playerPS.coach_comment}
              </div>
              <div style="margin-top:12px">
                <div style="font-size:10px;opacity:.5;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">추출된 키워드</div>
                <div>
                  ${(playerPS.keyword_tags || []).map(kw =>
                    `<span class="analyzer-tag"># ${kw}</span>`
                  ).join('') || '<span style="opacity:.5;font-size:12px">키워드 없음</span>'}
                </div>
              </div>
            </div>
          ` : ''}
        ` : `
          <div class="empty-state" style="padding:60px 20px">
            <i class="fas fa-clipboard-list" style="opacity:.3"></i>
            <p>아직 역량 평가가 없습니다</p>
            <button class="btn btn-primary" style="margin-top:12px" onclick="openEvalModal('${selId}')">
              <i class="fas fa-plus"></i> 첫 평가 입력
            </button>
          </div>
        `}
      </div>
    </div>

    <!-- 전체 선수 역량 테이블 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-table"></i> 전체 역량 현황 (Admin View)</div>
        <button class="btn btn-sm btn-secondary" onclick="openAllRadarModal()">
          <i class="fas fa-chart-area"></i> 비교 차트
        </button>
      </div>
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>선수</th>
              ${PERF_METRICS.map(m => `<th style="text-align:center">${m.icon} ${m.label}</th>`).join('')}
              <th style="text-align:center">평균</th>
              <th style="text-align:center">동기도</th>
              <th>키워드</th>
            </tr>
          </thead>
          <tbody>
            ${State.players
              .filter(p => p.player_status !== 'military_leave')
              .map(p => {
                const ps = psRecords.find(x => x.player_id === p.id);
                const avg = ps ? calcAvgScore(ps) : '-';
                const motiv = ps ? calcMotivScore(ps) : '-';
                return `
                  <tr onclick="renderPerformancePage('${p.id}')" style="cursor:pointer${p.id===selId?';background:var(--primary-fade)':''}">
                    <td>
                      <div class="player-info">
                        ${playerAvatar(p.full_name, p.unit)}
                        <div>
                          <div class="player-name">${p.full_name}</div>
                          <div class="player-num">#${p.jersey_number} · ${p.primary_position}</div>
                        </div>
                      </div>
                    </td>
                    ${PERF_METRICS.map(m => {
                      const v = ps ? Number(ps[m.key]) : null;
                      return `<td style="text-align:center">
                        ${v !== null
                          ? `<span class="score-${v}" style="font-weight:800;font-size:15px">${v}</span>`
                          : '<span style="color:var(--gray-300)">-</span>'}
                      </td>`;
                    }).join('')}
                    <td style="text-align:center;font-weight:800;color:var(--primary);font-size:15px">${avg}</td>
                    <td style="text-align:center">
                      ${ps ? `
                        <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                          <div class="progress-bar" style="width:60px"><div class="progress-fill ${Number(motiv)>=7?'green':'primary'}" style="width:${Number(motiv)*10}%"></div></div>
                          <span style="font-weight:800;font-size:13px">${motiv}</span>
                        </div>` : '-'}
                    </td>
                    <td style="max-width:180px">
                      ${ps ? (ps.keyword_tags||[]).slice(0,3).map(k => `<span class="keyword-tag" style="font-size:10px">${k}</span>`).join('') : ''}
                    </td>
                  </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPerformancePage(playerId) {
  document.getElementById('pageContent').innerHTML = renderPerformance(playerId);
  afterRenderPerformance(playerId);
}

function afterRenderPerformance(playerId) {
  const psRecords = State.performanceScores || [];
  const ps = psRecords.find(p => p.player_id === playerId);
  if (!ps) return;

  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  if (ctx._chartInst) ctx._chartInst.destroy();

  ctx._chartInst = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: PERF_METRICS.map(m => m.label),
      datasets: [{
        label: State.players.find(p => p.id === playerId)?.full_name || '선수',
        data: PERF_METRICS.map(m => Number(ps[m.key]) || 0),
        backgroundColor: 'rgba(123,24,24,0.12)',
        borderColor: 'rgba(123,24,24,0.8)',
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
          pointLabels: { font: { size: 13, weight: '700' } },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* 역량 평가 입력 모달 */
function openEvalModal(playerId) {
  const player = State.players.find(p => p.id === playerId);
  const existing = (State.performanceScores||[]).find(p => p.player_id === playerId);

  openModal(`역량 평가 — ${player?.full_name || ''}`, `
    <form id="evalForm" onsubmit="submitEvalForm(event,'${playerId}','${existing?.id||''}')">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        ${PERF_METRICS.map(m => `
          <div class="form-group">
            <label class="form-label">${m.icon} ${m.label} (1-10)</label>
            <input class="form-control" type="number" name="${m.key}" min="1" max="10" required
              value="${existing?.[m.key]||''}" placeholder="1~10" />
          </div>
        `).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">코치 코멘트</label>
        <textarea class="form-control" name="coach_comment" rows="3"
          placeholder="선수의 강점과 개선점을 구체적으로 기술하세요...">${existing?.coach_comment||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">선수 공개 여부</label>
        <select class="form-control" name="is_visible_to_player">
          <option value="true" ${existing?.is_visible_to_player!=='false'?'selected':''}>공개</option>
          <option value="false" ${existing?.is_visible_to_player==='false'?'selected':''}>비공개 (코치만)</option>
        </select>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 평가 저장</button>
      </div>
    </form>
  `, true);
}

async function submitEvalForm(e, playerId, existingId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  PERF_METRICS.forEach(m => { data[m.key] = Number(data[m.key]); });
  data.is_visible_to_player = data.is_visible_to_player === 'true';
  data.player_id = playerId;
  data.evaluated_by = 'Head Coach';
  data.season_year = 2026;
  data.eval_round = 1;
  data.eval_date = new Date().toISOString();
  data.keyword_tags = extractKeywords(data.coach_comment);

  try {
    let saved;
    if (existingId) {
      saved = await API.put('performance_scores', existingId, data);
      const idx = (State.performanceScores||[]).findIndex(p => p.id === existingId);
      if (idx >= 0) State.performanceScores[idx] = { ...State.performanceScores[idx], ...saved };
    } else {
      saved = await API.post('performance_scores', data);
      if (!State.performanceScores) State.performanceScores = [];
      State.performanceScores.push(saved);
    }
    showToast('평가가 저장되었습니다', 'success');
    closeModal();
    renderPerformancePage(playerId);
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

/* 전체 비교 레이더 모달 */
function openAllRadarModal() {
  const psRecords = State.performanceScores || [];
  const colors = ['#7B1818','#1a5ca8','#1a8a4a','#c07a00','#7b2fbe','#c0392b'];

  openModal('팀 역량 비교 차트', `
    <div style="max-height:400px;display:flex;align-items:center;justify-content:center">
      <canvas id="allRadarChart" style="max-height:380px"></canvas>
    </div>
  `, true);

  setTimeout(() => {
    const ctx = document.getElementById('allRadarChart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: PERF_METRICS.map(m => m.label),
        datasets: psRecords.slice(0, 6).map((ps, i) => {
          const p = State.players.find(pl => pl.id === ps.player_id);
          return {
            label: p?.full_name || '선수',
            data: PERF_METRICS.map(m => Number(ps[m.key]) || 0),
            backgroundColor: colors[i % colors.length] + '18',
            borderColor: colors[i % colors.length],
            borderWidth: 2,
            pointRadius: 3
          };
        })
      },
      options: {
        responsive: true,
        scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
        plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } }
      }
    });
  }, 100);
}

/* ============================================================
   RAPID CHECK — 훈련 즉시평가 (Coach 모바일 UI)
   ============================================================ */
function renderRapidCheck() {
  const activePlayers = State.players.filter(p => p.player_status === 'active');
  const latestEvent = State.events.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))[0];
  const checkins = State.practiceCheckins || [];

  const FOCUS_OPTIONS = [
    '패스정확도', '루트런닝', '블로킹', '태클', '커버리지',
    '풋워크', '집중력', '체력', '리더십', '스냅타이밍',
    '수비읽기', '밸런스', '속도', '판단력', '팀워크'
  ];

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-bolt" style="color:var(--yellow)"></i> 훈련 즉시평가 (Rapid Check)</div>
      <div style="font-size:12px;color:var(--gray-500)">
        ${latestEvent ? `📅 ${latestEvent.title}` : '일정 없음'}
      </div>
    </div>

    <div style="margin-bottom:16px">
      <div class="alert alert-info">
        <i class="fas fa-bolt"></i>
        훈련 직후 빠른 평가를 입력하세요. 평균 30초면 충분합니다.
      </div>
    </div>

    <div id="rapidList" class="rapid-check-wrap">
      ${activePlayers.map(p => {
        const checked = checkins.find(c => c.player_id === p.id && c.event_id === latestEvent?.id);
        return `
          <div class="rapid-row" id="rapidRow_${p.id}">
            ${playerAvatar(p.full_name, p.unit)}
            <div style="min-width:90px">
              <div style="font-weight:700;font-size:14px">${p.full_name}</div>
              <div style="font-size:11px;color:var(--gray-500)">#${p.jersey_number} · ${p.primary_position}</div>
            </div>
            ${checked
              ? `<div style="flex:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                   <div class="star-row">${[1,2,3,4,5].map(s =>
                     `<span style="font-size:18px">${s <= Number(checked.star_rating) ? '⭐' : '☆'}</span>`
                   ).join('')}</div>
                   <span class="effort-tag-btn selected ${checked.effort_tag}">${checked.effort_tag}</span>
                   <span style="font-size:12px;color:var(--gray-500)">${checked.quick_comment||''}</span>
                   <span class="badge badge-active" style="margin-left:auto">완료</span>
                 </div>`
              : `<div style="flex:1">
                   <!-- Star Rating -->
                   <div class="star-row" id="stars_${p.id}">
                     ${[1,2,3,4,5].map(s => `
                       <button class="star-btn" data-val="${s}" data-pid="${p.id}"
                         onclick="setStarRating('${p.id}',${s})">⭐</button>
                     `).join('')}
                   </div>
                 </div>
                 <button class="btn btn-sm btn-primary" onclick="openRapidModal('${p.id}','${latestEvent?.id||''}')">
                   <i class="fas fa-edit"></i> 평가
                 </button>`}
          </div>`;
      }).join('')}
    </div>

    ${checkins.length > 0 ? `
      <div class="card" style="margin-top:20px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-bar"></i> 오늘 훈련 즉시평가 요약</div>
        </div>
        <div class="card-body" style="height:200px">
          <canvas id="rapidSummaryChart"></canvas>
        </div>
      </div>
    ` : ''}
  `;
}

function afterRenderRapidCheck() {
  const checkins = State.practiceCheckins || [];
  if (checkins.length === 0) return;
  const ctx = document.getElementById('rapidSummaryChart');
  if (!ctx) return;

  const ratedPlayers = checkins.map(c => {
    const p = State.players.find(x => x.id === c.player_id);
    return { name: p?.full_name || '선수', rating: Number(c.star_rating) };
  }).sort((a, b) => b.rating - a.rating);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ratedPlayers.map(x => x.name),
      datasets: [{
        data: ratedPlayers.map(x => x.rating),
        backgroundColor: ratedPlayers.map(x =>
          x.rating >= 4 ? '#1a8a4a' : x.rating >= 3 ? '#c07a00' : '#c0392b'
        ),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function setStarRating(playerId, val) {
  const stars = document.querySelectorAll(`#stars_${playerId} .star-btn`);
  stars.forEach(s => {
    s.classList.toggle('active', Number(s.dataset.val) <= val);
  });
}

function openRapidModal(playerId, eventId) {
  const player = State.players.find(p => p.id === playerId);
  const FOCUS_OPTIONS = ['패스정확도','루트런닝','블로킹','태클','커버리지','풋워크','집중력','체력','리더십','스냅타이밍','수비읽기','속도','판단력'];

  openModal(`즉시평가 — ${player?.full_name}`, `
    <form id="rapidForm" onsubmit="submitRapidCheck(event,'${playerId}','${eventId}')">
      <div class="form-group">
        <label class="form-label">⭐ 종합 평점 (1-5)</label>
        <div class="star-row" id="modalStars" style="gap:8px;margin-bottom:4px">
          ${[1,2,3,4,5].map(s => `
            <button type="button" class="star-btn" data-val="${s}"
              onclick="setModalStar(${s})" style="font-size:28px">⭐</button>
          `).join('')}
        </div>
        <input type="hidden" id="modalStarVal" name="star_rating" value="" required />
      </div>
      <div class="form-group">
        <label class="form-label">노력도 태그</label>
        <div class="effort-tags" id="effortTags">
          ${['excellent','good','average','poor'].map(t => `
            <button type="button" class="effort-tag-btn ${t}" onclick="selectEffortTag('${t}',this)">
              ${{excellent:'🔥 최고',good:'👍 양호',average:'😐 보통',poor:'😞 부진'}[t]}
            </button>
          `).join('')}
        </div>
        <input type="hidden" id="effortTagVal" name="effort_tag" value="" required />
      </div>
      <div class="form-group">
        <label class="form-label">집중 영역 (복수 선택)</label>
        <div class="focus-chip-wrap" id="focusChips">
          ${FOCUS_OPTIONS.map(o => `
            <button type="button" class="focus-chip" onclick="toggleFocusChip('${o}',this)">${o}</button>
          `).join('')}
        </div>
        <input type="hidden" id="focusTagsVal" name="focus_tags" value="[]" />
      </div>
      <div class="form-group">
        <label class="form-label">빠른 한줄 코멘트</label>
        <input class="form-control" name="quick_comment" placeholder="예) 오늘 루트런닝 집중력 최고!" />
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-bolt"></i> 저장</button>
      </div>
    </form>
  `, true);
}

let _selectedFocusTags = [];
function selectEffortTag(val, btn) {
  document.querySelectorAll('#effortTags .effort-tag-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('effortTagVal').value = val;
}
function toggleFocusChip(val, btn) {
  btn.classList.toggle('selected');
  _selectedFocusTags = [...document.querySelectorAll('#focusChips .focus-chip.selected')]
    .map(b => b.textContent);
  document.getElementById('focusTagsVal').value = JSON.stringify(_selectedFocusTags);
}
function setModalStar(val) {
  document.querySelectorAll('#modalStars .star-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.val) <= val);
    b.style.opacity = Number(b.dataset.val) <= val ? '1' : '0.3';
  });
  document.getElementById('modalStarVal').value = val;
}

async function submitRapidCheck(e, playerId, eventId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (!data.star_rating) { showToast('평점을 선택하세요', 'error'); return; }
  if (!data.effort_tag) { showToast('노력도 태그를 선택하세요', 'error'); return; }
  data.player_id = playerId;
  data.event_id = eventId;
  data.coach_id = 'Head Coach';
  data.star_rating = Number(data.star_rating);
  data.checked_at = new Date().toISOString();
  try {
    let ft = [];
    try { ft = JSON.parse(data.focus_tags||'[]'); } catch(ex) {}
    data.focus_tags = ft;
    const saved = await API.post('practice_checkins', data);
    if (!State.practiceCheckins) State.practiceCheckins = [];
    State.practiceCheckins.push(saved);
    showToast('즉시평가 저장 완료 ⚡', 'success');
    closeModal();
    navigate('rapidcheck');
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   AI TACTICAL ASSISTANT (프론트 시뮬레이션 — API 없이 룰 기반)
   오늘의 출석 인원 → 훈련 프로그램 자동 생성
   ============================================================ */
const AI_RESPONSES = {
  '오늘 훈련': () => generateTrainingProgram(),
  '전술': () => `**4-3 디펜스 vs 런 플레이 대응 전술**\n\n우리 팀 MLB(#55 임재원)의 수비 리딩 능력을 활용하여 4-3 스택 포메이션을 권장합니다.\n\n• ILB 2명을 A-B Gap에 배치\n• DE는 외곽 contain 우선\n• SS를 Box에 추가하여 8-in-the-box 구성\n\n상대 RB의 속도가 위협적이라면 CB Nickel 전환을 고려하세요.`,
  '약점': () => {
    const ps = State.performanceScores || [];
    const weak = ps.filter(p => p.skill < 7 || p.tactical < 7)
      .map(p => State.players.find(x => x.id === p.player_id)?.full_name)
      .filter(Boolean).slice(0, 3);
    return `**팀 약점 분석**\n\n역량 평가 데이터 기반으로 아래 포인트를 중점 보완해야 합니다:\n\n${weak.map(n => `• ${n}: 스킬/전술 보완 권장`).join('\n')}\n\n전체적으로 **슬랜트 루트 커버리지**와 **패스 프로텍션 타이밍**이 취약 포인트입니다.`;
  },
  '부상': () => {
    // 확정된 활성 부상만 AI 전술 분석에 반영
    const inj = State.injuries.filter(i =>
      (i.is_active===true||i.is_active==='true') &&
      (i.approval_status==='confirmed'||!i.approval_status)
    );
    if (inj.length === 0) return '현재 활성 부상자가 없습니다. 전력 이상 없음 ✅';
    return `**부상자 현황 (${inj.length}명)**\n\n${inj.map(i => {
      const p = State.players.find(x => x.id === i.player_id);
      return `• ${p?.full_name}(${p?.primary_position}): ${i.body_part} 통증 ${i.pain_level}/10 — ${i.participation_level === 'out' ? '훈련 제외' : '제한 참여'}`;
    }).join('\n')}\n\n→ 부상자 포지션 백업을 뎁스 차트에서 확인하세요.`;
  }
};

function generateTrainingProgram() {
  const latestEvent = State.events.sort((a,b) => new Date(b.starts_at)-new Date(a.starts_at))[0];
  const attending = State.attendance
    .filter(a => a.event_id === latestEvent?.id && a.status === 'attending')
    .map(a => State.players.find(p => p.id === a.player_id))
    .filter(Boolean);

  const offense = attending.filter(p => p.unit === 'offense');
  const defense = attending.filter(p => p.unit === 'defense');

  return `**오늘의 훈련 프로그램 (참석 ${attending.length}명)**\n\n` +
    `⏰ **준비 운동** (15분)\n전체 조깅 → 다이나믹 스트레칭 → 포지션 그룹 분리\n\n` +
    `🏈 **오펜스 개인 드릴** (20분) — ${offense.length}명\n` +
    `QB: Drop 3/5/7 + 빠른 릴리스 / WR: 슬랜트·아웃 루트런닝\n` +
    `OL: 스냅 타이밍 + 패스 프로텍션 풋워크\n\n` +
    `🛡️ **디펜스 개인 드릴** (20분) — ${defense.length}명\n` +
    `LB: Pre-snap 리드 + 런스톱 태클 / DB: 맨커버리지 1-on-1\n` +
    `DL: 첫 스텝 스피드 + 더블팀 대응\n\n` +
    `🔁 **팀 스크리미지** (30분)\n7-on-7 → 11-on-11 / 부상자 접촉 제한\n\n` +
    `📋 **마무리 & 리뷰** (10분)\n`;
}

function renderAITactical() {
  const chatHistory = [
    { role: 'ai', text: '안녕하세요! 저는 PlayProve AI 전술 어시스턴트입니다. 🏈\n\n팀 데이터를 바탕으로 전술 조언, 훈련 프로그램, 부상 현황 등을 분석해드립니다. 무엇이 궁금하신가요?' }
  ];

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-robot" style="color:var(--primary)"></i> AI 전술 어시스턴트</div>
      <span class="badge badge-active">Beta</span>
    </div>

    <div class="grid-2 mb-24">
      <div class="ai-chat-wrap">
        <div class="ai-chat-header">
          <div class="ai-avatar">🤖</div>
          <div>
            <div style="font-weight:800;font-size:14px">PlayProve AI Coach</div>
            <div class="ai-status"><div class="ai-dot"></div> 팀 데이터 연결됨</div>
          </div>
        </div>

        <div class="quick-prompts">
          <div class="quick-prompt" onclick="sendAIMessage('오늘 훈련')">🏈 오늘 훈련 프로그램</div>
          <div class="quick-prompt" onclick="sendAIMessage('전술')">🧠 전술 제안</div>
          <div class="quick-prompt" onclick="sendAIMessage('약점')">📊 팀 약점 분석</div>
          <div class="quick-prompt" onclick="sendAIMessage('부상')">🩺 부상자 현황</div>
        </div>

        <div class="ai-messages" id="aiMessages">
          <div class="chat-bubble ai">${chatHistory[0].text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>
        </div>

        <div class="ai-input-row">
          <input class="ai-input" id="aiInput" placeholder="질문을 입력하세요... (예: 오늘 훈련 프로그램 짜줘)"
            onkeypress="if(event.key==='Enter')sendAIMessage()" />
          <button class="btn btn-primary" onclick="sendAIMessage()"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>

      <!-- 오늘의 훈련 프로그램 자동 생성 -->
      <div>
        <div class="training-program-card" id="trainingProgramCard">
          <div class="tp-header"><span>🤖</span> 오늘의 훈련 프로그램 자동 생성</div>
          ${renderTrainingProgramCard()}
        </div>
        <button class="btn btn-secondary" style="width:100%;margin-top:8px" onclick="regenerateProgram()">
          <i class="fas fa-redo"></i> 재생성
        </button>
      </div>
    </div>
  `;
}

function renderTrainingProgramCard() {
  const latestEvent = State.events.sort((a,b) => new Date(b.starts_at)-new Date(a.starts_at))[0];
  const attending = latestEvent
    ? State.attendance.filter(a => a.event_id===latestEvent.id && a.status==='attending')
        .map(a => State.players.find(p => p.id===a.player_id)).filter(Boolean)
    : [];
  const offense = attending.filter(p => p?.unit==='offense');
  const defense = attending.filter(p => p?.unit==='defense');

  const program = [
    { time:'00:00', dur:'15분', title:'전체 준비 운동', pos:'ALL', desc:'조깅 + 다이나믹 스트레칭' },
    { time:'00:15', dur:'20분', title:'오펜스 개인 드릴', pos:'OFF', desc:`QB Drop Drill / WR 루트런닝 (${offense.length}명)` },
    { time:'00:15', dur:'20분', title:'디펜스 개인 드릴', pos:'DEF', desc:`LB 런스톱 / DB 1-on-1 (${defense.length}명)` },
    { time:'00:35', dur:'30분', title:'7-on-7 스크리미지', pos:'ALL', desc:'패스 위주 팀 드릴' },
    { time:'01:05', dur:'15분', title:'11-on-11 팀 연습', pos:'ALL', desc:'실전 스크리미지' },
    { time:'01:20', dur:'10분', title:'쿨다운 & 리뷰', pos:'ALL', desc:'스트레칭 + 코치 피드백' },
  ];

  const posColor = { ALL:'rgba(255,255,255,.15)', OFF:'rgba(123,24,24,.4)', DEF:'rgba(26,92,168,.4)' };

  return `
    <div class="tp-section">
      <div class="tp-section-title">📊 오늘 참석 인원 — ${attending.length}명 (O:${offense.length} D:${defense.length})</div>
      ${program.map(item => `
        <div class="tp-item">
          <span class="tp-time">${item.time}</span>
          <span style="flex:1;font-weight:600">${item.title}</span>
          <span class="tp-pos-tag" style="background:${posColor[item.pos]}">${item.pos} ${item.dur}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function regenerateProgram() {
  const card = document.getElementById('trainingProgramCard');
  if (card) {
    card.style.opacity = '0.5';
    setTimeout(() => {
      card.innerHTML = `<div class="tp-header"><span>🤖</span> 오늘의 훈련 프로그램 자동 생성</div>${renderTrainingProgramCard()}`;
      card.style.opacity = '1';
    }, 600);
  }
}

async function sendAIMessage(preset = null) {
  const input = document.getElementById('aiInput');
  const msg = preset || input?.value?.trim();
  if (!msg) return;
  if (input) input.value = '';

  const msgs = document.getElementById('aiMessages');
  if (!msgs) return;

  // User bubble
  msgs.innerHTML += `<div class="chat-bubble user">${msg}</div>`;

  // Typing indicator
  const typingId = 'typing_' + Date.now();
  msgs.innerHTML += `<div class="chat-bubble typing" id="${typingId}"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  // Find matching response
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

  const typingEl = document.getElementById(typingId);
  if (typingEl) typingEl.remove();

  let responseText = '죄송합니다, 해당 질문에 대한 데이터가 충분하지 않습니다. 팀 데이터를 더 입력하면 더 정확한 분석이 가능합니다.';
  for (const [key, fn] of Object.entries(AI_RESPONSES)) {
    if (msg.includes(key)) { responseText = fn(); break; }
  }

  msgs.innerHTML += `<div class="chat-bubble ai">${responseText.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
}
