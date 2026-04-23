/* ============================================================
   mypage.js — 선수 개인 대시보드 (My Page) v2
   PlayProve Team ERP
   ============================================================ */

/* ============================================================
   MY PAGE — 개인 대시보드
   ============================================================ */
function renderMyPage() {
  const player = getCurrentPlayer();
  if (!player) {
    return `<div class="empty-state"><i class="fas fa-user-slash"></i><p>선수를 선택하세요</p></div>`;
  }

  const gradeData = calcPlayerGrade(player.id, {
    attendance: State.attendance,
    events: State.events,
    dues: State.dues,
    injuries: State.injuries,
    conditionLogs: State.conditionLogs
  });

  // 이번달 출석률 계산
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthEvents = State.events.filter(e => {
    const d = new Date(e.starts_at || '');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthStr
      || e.starts_at?.slice(0, 7) === '2026-04'; // fallback for demo
  });
  const thisMonthAtt = State.attendance.filter(a =>
    a.player_id === player.id &&
    thisMonthEvents.some(e => e.id === a.event_id)
  );
  const monthAttRate = thisMonthEvents.length
    ? Math.round(thisMonthAtt.filter(a => a.status === 'attending').length / thisMonthEvents.length * 100)
    : 0;

  // 다음 일정
  const nextEvent = State.events
    .filter(e => new Date(e.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];

  // 활성 부상
  // 확정된(confirmed) 활성 부상만 표시 (pending 신청 중인 건 제외)
  const myInjuries = State.injuries.filter(i =>
    i.player_id === player.id &&
    (i.is_active === true || i.is_active === 'true') &&
    (i.approval_status === 'confirmed' || !i.approval_status)
  );

  // 컨디션 로그 최근 3개
  const myLogs = State.conditionLogs
    .filter(c => c.player_id === player.id)
    .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))
    .slice(0, 3);
  const avgCond = myLogs.length
    ? Math.round(myLogs.reduce((s, c) => s + Number(c.condition_score), 0) / myLogs.length * 10) / 10
    : 0;

  // 회비
  const myDues = State.dues.filter(d => d.player_id === player.id);
  const paidDues = myDues.filter(d => d.status === 'paid').length;

  return `
    <!-- HERO BANNER -->
    <div class="mypage-hero">
      <div class="mypage-hero-content">
        <div class="mypage-avatar">${initials(player.full_name)}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="mypage-name">${player.full_name}</div>
            ${gradeBadgeHTML(gradeData.grade)}
          </div>
          <div class="mypage-pos">#${player.jersey_number} · ${player.primary_position} · ${player.unit?.toUpperCase()}</div>
          <div class="xp-bar-wrap">
            <div class="xp-label">
              <span>${gradeData.grade} ${gradeData.total_points}pt</span>
              <span>${gradeData.gradeInfo.next ? `Next: ${gradeData.gradeInfo.next} (${gradeData.next_grade_gap}pt 남음)` : '최고 등급 달성!'}</span>
            </div>
            <div class="xp-bar"><div class="xp-fill" style="width:${gradeData.in_grade_progress}%"></div></div>
          </div>
        </div>
        ${nextEvent ? `
          <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:12px 16px;min-width:150px;text-align:right">
            <div style="font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">다음 일정</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:2px">${nextEvent.title.length > 16 ? nextEvent.title.slice(0,16)+'…' : nextEvent.title}</div>
            <div style="font-size:11px;opacity:.7">${formatDateTime(nextEvent.starts_at)}</div>
            <div style="margin-top:6px">${nextEvent.location ? `<span style="font-size:11px;opacity:.6"><i class="fas fa-map-marker-alt"></i> ${nextEvent.location}</span>` : ''}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- STAT CARDS (float above hero) -->
    <div class="mypage-cards">
      <div class="mypage-stat-card">
        <div style="font-size:20px">📅</div>
        <div class="mypage-stat-val" style="color:${monthAttRate>=70?'var(--green)':monthAttRate>=50?'var(--yellow)':'var(--red)'}">${monthAttRate}%</div>
        <div class="mypage-stat-lbl">이번달 출석률</div>
      </div>
      <div class="mypage-stat-card">
        <div style="font-size:20px">🔥</div>
        <div class="mypage-stat-val" style="color:var(--primary)">${gradeData.current_streak}</div>
        <div class="mypage-stat-lbl">연속 출석</div>
      </div>
      <div class="mypage-stat-card">
        <div style="font-size:20px">💪</div>
        <div class="mypage-stat-val" style="color:${avgCond>=7?'var(--green)':avgCond>=5?'var(--yellow)':'var(--red)'}">${avgCond || '-'}</div>
        <div class="mypage-stat-lbl">평균 컨디션</div>
      </div>
      <div class="mypage-stat-card">
        <div style="font-size:20px">🏆</div>
        <div class="mypage-stat-val" style="color:var(--yellow)">${gradeData.total_points}</div>
        <div class="mypage-stat-lbl">총 포인트</div>
      </div>
    </div>

    <div class="grid-2 mb-24">
      <!-- 컨디션 그래프 -->
      <div class="condition-chart-wrap">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:15px;font-weight:800;display:flex;align-items:center;gap:6px">
            <i class="fas fa-heartbeat" style="color:var(--red)"></i> 최근 컨디션 추이
          </div>
          <button class="btn btn-sm btn-secondary" onclick="openConditionLogModal('${player.id}')">
            <i class="fas fa-plus"></i> 오늘 기록
          </button>
        </div>
        <canvas id="conditionChart"></canvas>
        ${myLogs.length === 0
          ? '<div class="empty-state" style="padding:30px 0"><i class="fas fa-chart-line" style="opacity:.3"></i><p>컨디션 기록이 없습니다</p></div>'
          : ''}
      </div>

      <!-- 등급 & 포인트 -->
      <div class="grade-progress-section" style="margin-bottom:0">
        <div style="font-size:15px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-trophy" style="color:var(--yellow)"></i> 선수 등급
        </div>
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:12px">활동 데이터 기반 자동 산정</div>
        ${gradeTierTrackHTML(gradeData.grade)}
        <div style="margin: 14px 0">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span style="font-weight:700">${gradeData.grade} 구간 진행도</span>
            <span style="font-weight:800;color:var(--primary)">${gradeData.in_grade_progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill primary" style="width:${gradeData.in_grade_progress}%"></div>
          </div>
          ${gradeData.gradeInfo.next
            ? `<div style="font-size:11px;color:var(--gray-500);margin-top:5px">다음 등급(${gradeData.gradeInfo.next})까지 <strong>${gradeData.next_grade_gap}pt</strong> 필요</div>`
            : '<div style="font-size:11px;color:var(--yellow);margin-top:5px;font-weight:700">🏆 최고 등급 달성!</div>'}
        </div>
        ${pointsBreakdownHTML(gradeData)}
      </div>
    </div>

    <!-- 출석 히스토리 + 부상 현황 -->
    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-calendar-check"></i> 출석 히스토리</div>
          <span style="font-size:12px;font-weight:700;color:var(--primary)">${gradeData.attendance_rate}% 출석</span>
        </div>
        <div class="card-body" style="padding:12px">
          ${State.events
            .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
            .slice(0, 6)
            .map(ev => {
              const att = State.attendance.find(a => a.player_id === player.id && a.event_id === ev.id);
              const s = att?.status || 'undecided';
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--gray-100)">
                  <div style="width:8px;height:8px;border-radius:50%;background:${s==='attending'?'var(--green)':s==='absent'?'var(--red)':'var(--gray-300)'}"></div>
                  <div style="flex:1;font-size:13px;font-weight:600">${ev.title.length>22?ev.title.slice(0,22)+'…':ev.title}</div>
                  <div style="font-size:11px;color:var(--gray-500)">${formatDate(ev.starts_at)}</div>
                  <div>${attBadge(s)}</div>
                </div>`;
            }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-medkit"></i> 나의 건강 현황</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('injury')">전체 보기</button>
        </div>
        <div class="card-body">
          ${myInjuries.length === 0
            ? `<div style="text-align:center;padding:20px 0">
                 <div style="font-size:36px;margin-bottom:8px">✅</div>
                 <div style="font-weight:700;color:var(--green)">컨디션 이상 없음</div>
                 <div style="font-size:12px;color:var(--gray-500);margin-top:4px">현재 활성 부상 없음</div>
               </div>`
            : myInjuries.map(i => `
              <div style="background:var(--red-bg);border-radius:8px;padding:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <span style="font-weight:700;color:var(--red)">${i.body_part}</span>
                  <span style="font-size:12px;color:var(--red);font-weight:800">통증 ${i.pain_level}/10</span>
                </div>
                <div style="font-size:12px;color:var(--gray-700)">${i.symptoms||''}</div>
                ${i.expected_return_date?`<div style="font-size:11px;color:var(--gray-500);margin-top:4px">복귀 예정: ${i.expected_return_date}</div>`:''}
              </div>
            `).join('')}
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-100)">
            <div style="font-size:12px;color:var(--gray-500);margin-bottom:8px;font-weight:600">이번 시즌 전체 부상 이력</div>
            ${State.injuries.filter(i => i.player_id === player.id).length === 0
              ? '<div style="font-size:13px;color:var(--gray-300)">기록 없음</div>'
              : State.injuries.filter(i => i.player_id === player.id).map(i => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
                  <span style="color:${i.is_active==='true'||i.is_active===true?'var(--red)':'var(--green)'}">${i.is_active==='true'||i.is_active===true?'●':'○'}</span>
                  <span>${i.body_part} (통증 ${i.pain_level})</span>
                  <span style="color:var(--gray-500)">${i.expected_return_date||''}</span>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function afterRenderMyPage() {
  const player = getCurrentPlayer();
  if (!player) return;
  initConditionChart(player.id);
}

function initConditionChart(playerId) {
  const logs = State.conditionLogs
    .filter(c => c.player_id === playerId)
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));

  if (logs.length === 0) return;

  const labels = logs.map(c => {
    const ev = State.events.find(e => e.id === c.event_id);
    return ev ? formatDate(ev.starts_at) : formatDate(c.logged_at);
  });

  const condData     = logs.map(c => Number(c.condition_score));
  const energyData   = logs.map(c => Number(c.energy_level));
  const mentalData   = logs.map(c => Number(c.mental_level));

  const ctx = document.getElementById('conditionChart');
  if (!ctx) return;

  // Destroy existing
  if (ctx._chartInstance) ctx._chartInstance.destroy();

  ctx._chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '종합 컨디션',
          data: condData,
          borderColor: '#7B1818',
          backgroundColor: 'rgba(123,24,24,0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#7B1818',
          pointRadius: 5,
          borderWidth: 2.5
        },
        {
          label: '체력',
          data: energyData,
          borderColor: '#1a5ca8',
          backgroundColor: 'transparent',
          tension: 0.4,
          pointBackgroundColor: '#1a5ca8',
          pointRadius: 4,
          borderWidth: 2,
          borderDash: [4, 3]
        },
        {
          label: '멘탈',
          data: mentalData,
          borderColor: '#c07a00',
          backgroundColor: 'transparent',
          tension: 0.4,
          pointBackgroundColor: '#c07a00',
          pointRadius: 4,
          borderWidth: 2,
          borderDash: [2, 3]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} / 10`
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 10,
          ticks: { stepSize: 2 },
          grid: { color: '#f0f0f0' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function openConditionLogModal(playerId) {
  const player = State.players.find(p => p.id === playerId);
  const upcomingEvents = State.events
    .filter(e => new Date(e.starts_at) > new Date(Date.now() - 86400000 * 3))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 5);

  openModal('컨디션 로그 기록', `
    <form id="condLogForm" onsubmit="submitConditionLog(event, '${playerId}')">
      <div style="background:var(--gray-50);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--gray-700)">
        💡 훈련/경기 전 컨디션을 기록하면 <strong>+3 포인트</strong>가 적립됩니다
      </div>
      <div class="form-group">
        <label class="form-label">연관 일정</label>
        <select class="form-control" name="event_id">
          <option value="">없음</option>
          ${upcomingEvents.map(e => `<option value="${e.id}">${e.title} — ${formatDate(e.starts_at)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">종합 컨디션 (1-10)</label>
          <input class="form-control" type="number" name="condition_score" min="1" max="10" required placeholder="8" />
        </div>
        <div class="form-group">
          <label class="form-label">체력 레벨 (1-10)</label>
          <input class="form-control" type="number" name="energy_level" min="1" max="10" placeholder="8" />
        </div>
        <div class="form-group">
          <label class="form-label">멘탈 레벨 (1-10)</label>
          <input class="form-control" type="number" name="mental_level" min="1" max="10" placeholder="8" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">수면 시간 (h)</label>
          <input class="form-control" type="number" name="sleep_hours" step="0.5" min="0" max="24" placeholder="7.5" />
        </div>
        <div class="form-group">
          <label class="form-label">메모</label>
          <input class="form-control" name="notes" placeholder="몸 상태 한 줄 메모..." />
        </div>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 기록 저장</button>
      </div>
    </form>
  `, true);
}

async function submitConditionLog(e, playerId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.player_id = playerId;
  data.condition_score = Number(data.condition_score);
  data.energy_level = Number(data.energy_level) || null;
  data.mental_level = Number(data.mental_level) || null;
  data.sleep_hours = Number(data.sleep_hours) || null;
  data.logged_at = new Date().toISOString();

  try {
    const newLog = await API.post('condition_logs', data);
    State.conditionLogs.push(newLog);
    showToast('컨디션이 기록되었습니다 +3pt 🎉', 'success');
    closeModal();
    navigate('mypage');
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

/* ============================================================
   MY FEED — 포지션 그룹 맞춤 공지 피드
   ============================================================ */
function renderMyFeed() {
  const player = getCurrentPlayer();

  // 현재 선수의 포지션 그룹 결정
  const posInfo = player ? ALL_POSITIONS.find(p => p.code === player.primary_position) : null;
  const myUnit = player?.unit || 'all';
  const myPosGroup = posInfo?.group || 'all';

  // 피드 필터링 — 나에게 해당하는 공지만
  const myNotices = State.notices
    .filter(n => {
      const unitMatch = n.target_unit === 'all' || n.target_unit === myUnit;
      const groupMatch = n.target_position_group === 'all' || n.target_position_group === myPosGroup;
      return unitMatch && groupMatch;
    })
    .sort((a, b) => {
      // 핀 고정 공지 우선, 그 다음 최신순
      if (a.is_pinned !== b.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
      return 0;
    });

  const typeColors = {
    general: 'var(--gray-500)', equipment: 'var(--primary)',
    training: 'var(--blue)',    game: 'var(--green)', health: 'var(--yellow)'
  };
  const typeIcons  = {
    general: '📋', equipment: '👕', training: '🏈', game: '🏟️', health: '🩺'
  };
  const typeLbls   = {
    general: '일반', equipment: '장비', training: '훈련', game: '경기', health: '건강'
  };

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-rss" style="color:var(--primary)"></i> My Feed</div>
      ${player
        ? `<div style="display:flex;align-items:center;gap:8px">
             ${unitBadge(myUnit)}
             <span style="background:var(--gray-100);padding:4px 10px;border-radius:10px;font-size:12px;font-weight:600;color:var(--gray-700)">${myPosGroup}</span>
           </div>`
        : ''}
    </div>

    ${!player
      ? `<div class="alert alert-info"><i class="fas fa-info-circle"></i> 선수를 선택하면 해당 포지션 그룹 맞춤 피드가 표시됩니다</div>`
      : `<div class="alert alert-info" style="margin-bottom:20px">
           <i class="fas fa-filter"></i>
           <strong>${player.full_name}</strong>님 (#${player.jersey_number} · ${player.primary_position}) 의 피드입니다.
           <span style="opacity:.7">전체 공지 중 ${myNotices.length}건이 해당됩니다.</span>
         </div>`
    }

    <!-- Feed Tabs -->
    <div class="tabs" id="feedTabs" style="margin-bottom:16px">
      <button class="tab-btn active" onclick="filterFeed('all', this)">전체 <span style="background:var(--gray-100);color:var(--gray-500);padding:1px 7px;border-radius:10px;font-size:10px">${myNotices.length}</span></button>
      <button class="tab-btn" onclick="filterFeed('pinned', this)">📌 중요</button>
      <button class="tab-btn" onclick="filterFeed('game', this)">🏟️ 경기</button>
      <button class="tab-btn" onclick="filterFeed('training', this)">🏈 훈련</button>
      <button class="tab-btn" onclick="filterFeed('equipment', this)">👕 장비</button>
    </div>

    <div id="feedList">
      ${myNotices.length === 0
        ? `<div class="empty-state"><i class="fas fa-inbox"></i><p>현재 해당하는 공지사항이 없습니다</p></div>`
        : myNotices.map(n => `
          <div class="feed-card ${n.is_pinned==='true'||n.is_pinned===true?'feed-pinned':''}"
               data-type="${n.notice_type}"
               data-pinned="${n.is_pinned}"
               onclick="expandFeedCard('${n.id}')">
            <div class="feed-card-header">
              <div class="feed-type-dot feed-type-${n.notice_type}"></div>
              <div class="feed-card-title">
                ${n.is_pinned==='true'||n.is_pinned===true?'📌 ':''}${n.title}
              </div>
              <i class="fas fa-chevron-right" style="color:var(--gray-300);font-size:12px"></i>
            </div>
            <div class="feed-card-body" id="feedBody_${n.id}" style="display:none">
              <div style="white-space:pre-line;line-height:1.7">${n.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            </div>
            <div class="feed-card-footer">
              <span class="feed-target-badge" style="background:${n.target_unit==='all'?'var(--gray-100)':n.target_unit==='offense'?'#fff0f0':n.target_unit==='defense'?'#f0f4ff':'var(--yellow-bg)'};color:${n.target_unit==='all'?'var(--gray-500)':n.target_unit==='offense'?'var(--primary)':n.target_unit==='defense'?'var(--blue)':'var(--yellow)'}">
                ${n.target_unit === 'all' ? '전체' : n.target_unit.toUpperCase()}
                ${n.target_position_group !== 'all' ? ' · '+n.target_position_group : ''}
              </span>
              <span style="background:var(--gray-100);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:var(--gray-500)">
                ${typeIcons[n.notice_type]} ${typeLbls[n.notice_type]}
              </span>
              <span style="margin-left:auto;color:var(--gray-300)">${n.author}</span>
            </div>
          </div>
        `).join('')}
    </div>
  `;
}

function expandFeedCard(id) {
  const body = document.getElementById(`feedBody_${id}`);
  if (body) {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
  }
}

function filterFeed(type, btn) {
  document.querySelectorAll('#feedTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('#feedList .feed-card').forEach(card => {
    if (type === 'all') {
      card.style.display = 'block';
    } else if (type === 'pinned') {
      card.style.display = (card.dataset.pinned === 'true' || card.dataset.pinned === true) ? 'block' : 'none';
    } else {
      card.style.display = card.dataset.type === type ? 'block' : 'none';
    }
  });
}

/* ============================================================
   NOTICES — 공지사항 페이지 (전체)
   ============================================================ */
function renderNotices() {
  const typeIcons = { general: '📋', equipment: '👕', training: '🏈', game: '🏟️', health: '🩺' };
  const typeLbls  = { general: '일반', equipment: '장비', training: '훈련', game: '경기', health: '건강' };

  const sorted = State.notices.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return (b.is_pinned?1:0)-(a.is_pinned?1:0);
    return 0;
  });

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-bullhorn"></i> 공지사항</div>
      <button class="btn btn-primary" onclick="openAddNoticeModal()">
        <i class="fas fa-plus"></i> 공지 등록
      </button>
    </div>

    <div class="card">
      <div class="tbl-wrap">
        <table class="erp-table">
          <thead>
            <tr><th>유형</th><th>제목</th><th>대상</th><th>작성자</th><th>고정</th></tr>
          </thead>
          <tbody>
            ${sorted.map(n => `
              <tr onclick="openNoticeDetail('${n.id}')" style="cursor:pointer">
                <td>
                  <span style="font-size:18px">${typeIcons[n.notice_type]||'📋'}</span>
                  <span style="font-size:11px;color:var(--gray-500);margin-left:4px">${typeLbls[n.notice_type]||n.notice_type}</span>
                </td>
                <td style="font-weight:700">${n.is_pinned==='true'||n.is_pinned===true?'📌 ':''}${n.title}</td>
                <td>
                  <span class="badge ${n.target_unit==='all'?'badge-undecided':n.target_unit==='offense'?'badge-offense':n.target_unit==='defense'?'badge-defense':'badge-leave'}">
                    ${n.target_unit==='all'?'전체':n.target_unit.toUpperCase()}
                  </span>
                  ${n.target_position_group !== 'all' ? `<span style="font-size:11px;color:var(--gray-500);margin-left:4px">${n.target_position_group}</span>` : ''}
                </td>
                <td style="font-size:12px;color:var(--gray-500)">${n.author}</td>
                <td>${n.is_pinned==='true'||n.is_pinned===true?'<span style="color:var(--yellow);font-weight:800">📌</span>':''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openNoticeDetail(id) {
  const n = State.notices.find(x => x.id === id);
  if (!n) return;
  const typeIcons = { general: '📋', equipment: '👕', training: '🏈', game: '🏟️', health: '🩺' };

  openModal(`${typeIcons[n.notice_type]||'📋'} ${n.title}`, `
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <span class="badge ${n.target_unit==='all'?'badge-undecided':n.target_unit==='offense'?'badge-offense':n.target_unit==='defense'?'badge-defense':'badge-leave'}">
          ${n.target_unit==='all'?'전체':n.target_unit.toUpperCase()}
        </span>
        ${n.target_position_group !== 'all' ? `<span class="badge badge-undecided">${n.target_position_group}</span>` : ''}
        ${n.is_pinned==='true'||n.is_pinned===true?'<span class="badge" style="background:var(--yellow-bg);color:var(--yellow)">📌 고정됨</span>':''}
      </div>
      <div style="font-size:12px;color:var(--gray-500)">작성자: ${n.author}</div>
    </div>
    <div style="background:var(--gray-50);border-radius:8px;padding:16px;font-size:14px;line-height:1.8;white-space:pre-line">
      ${n.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
    </div>
    ${n.event_id ? `
      <div style="margin-top:14px;padding:10px 14px;background:var(--blue-bg);border-radius:8px;font-size:13px;color:var(--blue)">
        <i class="fas fa-calendar-alt"></i> 연관 일정: ${State.events.find(e=>e.id===n.event_id)?.title || ''}
      </div>
    ` : ''}
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
    </div>
  `);
}

function openAddNoticeModal() {
  openModal('공지사항 등록', `
    <form id="noticeForm" onsubmit="submitNoticeForm(event)">
      <div class="form-group">
        <label class="form-label">제목 *</label>
        <input class="form-control" name="title" required placeholder="공지 제목을 입력하세요" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">유형</label>
          <select class="form-control" name="notice_type">
            <option value="general">일반</option>
            <option value="equipment">장비</option>
            <option value="training">훈련</option>
            <option value="game">경기</option>
            <option value="health">건강</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">대상 유닛</label>
          <select class="form-control" name="target_unit">
            <option value="all">전체</option>
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special">Special</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">대상 포지션 그룹</label>
          <select class="form-control" name="target_position_group">
            <option value="all">전체</option>
            <option value="Backfield">Backfield</option>
            <option value="Skill">Skill (WR/TE)</option>
            <option value="O-Line">O-Line</option>
            <option value="D-Line">D-Line</option>
            <option value="LB">Linebacker</option>
            <option value="DB">Defensive Back</option>
            <option value="Specialist">Specialist</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">작성자</label>
          <input class="form-control" name="author" value="General Manager" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">내용 *</label>
        <textarea class="form-control" name="content" rows="4" required placeholder="공지 내용을 입력하세요..."></textarea>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="isPinned" name="is_pinned" value="true" style="width:16px;height:16px;cursor:pointer" />
        <label for="isPinned" style="font-size:13px;font-weight:600;cursor:pointer">📌 상단 고정</label>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-bullhorn"></i> 등록</button>
      </div>
    </form>
  `, true);
}

async function submitNoticeForm(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.is_pinned = data.is_pinned === 'true';
  try {
    const newNotice = await API.post('notices', data);
    State.notices.push(newNotice);
    showToast('공지사항이 등록되었습니다', 'success');
    closeModal();
    navigate('notices');
  } catch (err) {
    showToast('등록 실패: ' + err.message, 'error');
  }
}
