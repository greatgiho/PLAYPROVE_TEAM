/* ============================================================
   iip.js — Individual Improvement Program (IIP)
   드릴 라이브러리 · 과제 배정 · XP 추적
   PlayProve Coaching Hub v3
   ============================================================ */

const CATEGORY_META = {
  speed:    { label: '스피드',    icon: '⚡', color: '#c07a00' },
  strength: { label: '근력',      icon: '💪', color: '#7B1818' },
  agility:  { label: '민첩성',    icon: '🌀', color: '#7b2fbe' },
  route:    { label: '루트런닝',  icon: '🏃', color: '#1a5ca8' },
  blocking: { label: '블로킹',    icon: '🛡️', color: '#1a8a4a' },
  coverage: { label: '커버리지',  icon: '👁️', color: '#c0392b' },
  tackling: { label: '태클',      icon: '⚔️', color: '#6b4c2a' },
  reaction: { label: '반응속도',  icon: '🎯', color: '#1a5ca8' },
  footwork: { label: '풋워크',    icon: '👟', color: '#333' },
  mental:   { label: '멘탈',      icon: '🧠', color: '#7b2fbe' }
};

const DIFF_META = {
  easy:   { label: '초급', color: '#1a8a4a', bg: 'var(--green-bg)' },
  medium: { label: '중급', color: '#c07a00', bg: 'var(--yellow-bg)' },
  hard:   { label: '고급', color: '#c0392b', bg: 'var(--red-bg)' }
};

/* ============================================================
   COACH — IIP 관리 페이지 (iip_coach)
   ============================================================ */
function renderIIPCoach() {
  const iipList = State.iipAssignments || [];
  const drills = State.drillLibrary || [];
  const activePlayers = State.players.filter(p => p.player_status === 'active');

  // 통계
  const totalAssigned = iipList.length;
  const completed = iipList.filter(a => a.status === 'completed').length;
  const inProgress = iipList.filter(a => a.status === 'in_progress').length;
  const pending = iipList.filter(a => a.status === 'assigned').length;
  const totalXP = iipList.reduce((s, a) => s + (Number(a.xp_earned) || 0), 0);
  const compRate = totalAssigned ? Math.round((completed / totalAssigned) * 100) : 0;

  return `
    <div class="section-header">
      <div class="section-title"><i class="fas fa-dumbbell" style="color:var(--primary)"></i> IIP 관리 (코치)</div>
      <button class="btn btn-primary" onclick="openAssignModal()">
        <i class="fas fa-plus"></i> 과제 배정
      </button>
    </div>

    <!-- KPI 카드 -->
    <div class="kpi-grid" style="margin-bottom:20px">
      ${kpiCard('총 배정 과제', totalAssigned + '개', 'fas fa-tasks', 'var(--primary)', '')}
      ${kpiCard('완료', completed + '개', 'fas fa-check-circle', 'var(--green)', `완료율 ${compRate}%`)}
      ${kpiCard('진행 중', inProgress + '개', 'fas fa-spinner', 'var(--blue)', '활성 과제')}
      ${kpiCard('누적 XP', totalXP + 'xp', 'fas fa-star', 'var(--yellow)', '팀 전체')}
    </div>

    <div class="grid-2 mb-24">
      <!-- 선수별 IIP 현황 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-users"></i> 선수별 과제 현황</div>
        </div>
        <div class="tbl-wrap">
          <table class="erp-table">
            <thead>
              <tr><th>선수</th><th style="text-align:center">배정</th><th style="text-align:center">완료</th><th style="text-align:center">XP</th><th>최근 과제</th></tr>
            </thead>
            <tbody>
              ${activePlayers.map(p => {
                const pAssign = iipList.filter(a => a.player_id === p.id);
                const pComp = pAssign.filter(a => a.status === 'completed');
                const pXP = pAssign.reduce((s, a) => s + (Number(a.xp_earned) || 0), 0);
                const latest = pAssign.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date))[0];
                const drill = latest ? drills.find(d => d.id === latest.drill_id) : null;
                return `
                  <tr>
                    <td>
                      <div class="player-info">
                        ${playerAvatar(p.full_name, p.unit)}
                        <div>
                          <div class="player-name">${p.full_name}</div>
                          <div class="player-num">#${p.jersey_number}</div>
                        </div>
                      </div>
                    </td>
                    <td style="text-align:center;font-weight:700">${pAssign.length}</td>
                    <td style="text-align:center">
                      <span style="color:var(--green);font-weight:800">${pComp.length}</span>
                      ${pAssign.length > 0 ? `<span style="font-size:10px;color:var(--gray-400)">/${pAssign.length}</span>` : ''}
                    </td>
                    <td style="text-align:center">
                      <span class="xp-badge">${pXP}xp</span>
                    </td>
                    <td style="font-size:12px;color:var(--gray-600)">
                      ${drill ? `${CATEGORY_META[drill.category]?.icon||''} ${drill.title}` : '-'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 드릴 라이브러리 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-book"></i> 드릴 라이브러리</div>
          <select class="filter-select" id="drillCategoryFilter" onchange="filterDrills(this.value)" style="width:auto">
            <option value="">전체 카테고리</option>
            ${Object.entries(CATEGORY_META).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
        <div id="drillList" class="drill-list">
          ${renderDrillCards(drills)}
        </div>
      </div>
    </div>

    <!-- 전체 과제 목록 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-list"></i> 전체 IIP 과제 목록</div>
        <div style="display:flex;gap:8px">
          <select class="filter-select" id="iipStatusFilter" onchange="filterIIPList(this.value)" style="width:auto">
            <option value="">전체 상태</option>
            <option value="assigned">배정됨</option>
            <option value="in_progress">진행 중</option>
            <option value="completed">완료</option>
            <option value="skipped">건너뜀</option>
          </select>
        </div>
      </div>
      <div id="iipTableWrap">
        ${renderIIPTable(iipList)}
      </div>
    </div>
  `;
}

function renderDrillCards(drills, filterCat = '') {
  const filtered = filterCat ? drills.filter(d => d.category === filterCat) : drills;
  if (filtered.length === 0) return '<div class="empty-state"><i class="fas fa-book-open"></i><p>드릴 없음</p></div>';
  return filtered.map(d => {
    const cat = CATEGORY_META[d.category] || { label: d.category, icon: '📋', color: '#333' };
    const diff = DIFF_META[d.difficulty] || { label: d.difficulty, color: '#333', bg: '#f0f0f0' };
    return `
      <div class="drill-card" onclick="openDrillDetail('${d.id}')">
        <div class="drill-card-top">
          <div class="drill-cat-badge" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.label}</div>
          <div class="drill-diff-badge" style="background:${diff.bg};color:${diff.color}">${diff.label}</div>
        </div>
        <div class="drill-title">${d.title}</div>
        <div class="drill-meta">
          <span><i class="fas fa-clock"></i> ${d.duration_min}분</span>
          <span><i class="fas fa-star" style="color:var(--yellow)"></i> +${d.xp_reward}xp</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterDrills(cat) {
  const el = document.getElementById('drillList');
  if (el) el.innerHTML = renderDrillCards(State.drillLibrary || [], cat);
}

function renderIIPTable(assignments) {
  const drills = State.drillLibrary || [];
  if (assignments.length === 0) return '<div class="empty-state" style="padding:30px"><i class="fas fa-tasks" style="opacity:.3"></i><p>배정된 과제 없음</p></div>';

  const STATUS_META = {
    assigned:    { label: '배정됨', cls: 'badge-undecided' },
    in_progress: { label: '진행 중', cls: 'badge-active' },
    completed:   { label: '완료', cls: 'badge-paid' },
    skipped:     { label: '건너뜀', cls: 'badge-injured' }
  };

  return `
    <div class="tbl-wrap">
      <table class="erp-table">
        <thead>
          <tr><th>선수</th><th>드릴</th><th style="text-align:center">상태</th><th>기한</th><th style="text-align:center">XP</th><th>코치 피드백</th><th style="text-align:center">액션</th></tr>
        </thead>
        <tbody>
          ${assignments.map(a => {
            const player = State.players.find(p => p.id === a.player_id);
            const drill = drills.find(d => d.id === a.drill_id);
            const statusMeta = STATUS_META[a.status] || { label: a.status, cls: '' };
            const cat = drill ? CATEGORY_META[drill.category] : null;
            const isOverdue = a.status !== 'completed' && a.due_date && new Date(a.due_date) < new Date();
            return `
              <tr style="${isOverdue ? 'background:var(--red-bg)' : ''}">
                <td>
                  <div class="player-info">
                    ${player ? playerAvatar(player.full_name, player.unit) : ''}
                    <div>
                      <div class="player-name">${player?.full_name || '-'}</div>
                      <div class="player-num">#${player?.jersey_number || '-'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="font-weight:600;font-size:13px">${cat ? cat.icon : ''} ${drill?.title || '-'}</div>
                  ${drill ? `<div style="font-size:11px;color:var(--gray-500)">${DIFF_META[drill.difficulty]?.label || ''} · ${drill.duration_min}분</div>` : ''}
                </td>
                <td style="text-align:center">
                  <span class="badge ${statusMeta.cls}">${statusMeta.label}</span>
                  ${isOverdue ? '<br><span style="font-size:10px;color:var(--red)">⚠️ 기한초과</span>' : ''}
                </td>
                <td style="font-size:12px">${a.due_date || '-'}</td>
                <td style="text-align:center">
                  ${a.status === 'completed'
                    ? `<span class="xp-badge">+${a.xp_earned}xp</span>`
                    : `<span style="color:var(--gray-400);font-size:12px">${drill?.xp_reward || 0}xp</span>`}
                </td>
                <td style="font-size:12px;color:var(--gray-600);max-width:160px">${a.coach_feedback || '-'}</td>
                <td style="text-align:center">
                  ${a.status !== 'completed'
                    ? `<button class="btn btn-sm btn-primary" onclick="markIIPComplete('${a.id}', '${drill?.xp_reward || 0}')">
                         <i class="fas fa-check"></i>
                       </button>`
                    : `<span style="color:var(--green);font-size:18px">✅</span>`}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterIIPList(status) {
  const iipList = State.iipAssignments || [];
  const filtered = status ? iipList.filter(a => a.status === status) : iipList;
  const el = document.getElementById('iipTableWrap');
  if (el) el.innerHTML = renderIIPTable(filtered);
}

/* 드릴 상세 모달 */
function openDrillDetail(drillId) {
  const drill = (State.drillLibrary || []).find(d => d.id === drillId);
  if (!drill) return;
  const cat = CATEGORY_META[drill.category] || {};
  const diff = DIFF_META[drill.difficulty] || {};
  openModal(`📋 ${drill.title}`, `
    <div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <span class="drill-cat-badge" style="background:${cat.color||'#333'}20;color:${cat.color||'#333'}">${cat.icon||''} ${cat.label||drill.category}</span>
        <span class="drill-diff-badge" style="background:${diff.bg||'#f0f0f0'};color:${diff.color||'#333'}">${diff.label||drill.difficulty}</span>
        <span style="font-size:13px"><i class="fas fa-clock"></i> ${drill.duration_min}분</span>
        <span style="font-size:13px;color:var(--yellow)"><i class="fas fa-star"></i> +${drill.xp_reward}xp</span>
      </div>
      <p style="color:var(--gray-700);margin-bottom:16px">${drill.description || ''}</p>
      <div style="background:var(--gray-50);border-radius:8px;padding:12px;font-size:13px;white-space:pre-line">${drill.instructions || ''}</div>
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;margin-bottom:6px">대상 포지션</div>
        <div>${(drill.target_positions||[]).map(pos => `<span class="keyword-tag">${pos}</span>`).join('')}</div>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:16px">
        <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
        <button class="btn btn-primary" onclick="closeModal();openAssignModal('','${drillId}')">
          <i class="fas fa-user-plus"></i> 과제 배정
        </button>
      </div>
    </div>
  `, true);
}

/* 과제 배정 모달 */
function openAssignModal(playerId = '', drillId = '') {
  const activePlayers = State.players.filter(p => p.player_status === 'active');
  const drills = State.drillLibrary || [];
  openModal('📋 IIP 과제 배정', `
    <form id="iipAssignForm" onsubmit="submitIIPAssign(event)">
      <div class="form-group">
        <label class="form-label">선수 선택</label>
        <select class="form-control" name="player_id" required>
          <option value="">-- 선수 선택 --</option>
          ${activePlayers.map(p => `<option value="${p.id}" ${p.id===playerId?'selected':''}>#${p.jersey_number} ${p.full_name} (${p.primary_position})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">드릴 선택</label>
        <select class="form-control" name="drill_id" required>
          <option value="">-- 드릴 선택 --</option>
          ${drills.map(d => {
            const cat = CATEGORY_META[d.category];
            return `<option value="${d.id}" ${d.id===drillId?'selected':''}>${cat?.icon||''} ${d.title} (${DIFF_META[d.difficulty]?.label||''} · +${d.xp_reward}xp)</option>`;
          }).join('')}
        </select>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">배정일</label>
          <input class="form-control" type="date" name="assigned_date" value="${new Date().toISOString().slice(0,10)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">완료 기한</label>
          <input class="form-control" type="date" name="due_date" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">코치 피드백 / 과제 목표</label>
        <textarea class="form-control" name="coach_feedback" rows="2"
          placeholder="이 드릴을 배정하는 이유와 목표를 작성하세요..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:8px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 배정</button>
      </div>
    </form>
  `, true);
}

async function submitIIPAssign(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (!data.player_id || !data.drill_id) { showToast('선수와 드릴을 선택하세요', 'error'); return; }
  data.assigned_by = 'Head Coach';
  data.status = 'assigned';
  data.xp_earned = 0;
  data.completed_at = null;
  try {
    const saved = await API.post('iip_assignments', data);
    if (!State.iipAssignments) State.iipAssignments = [];
    State.iipAssignments.push(saved);
    showToast('과제가 배정되었습니다 📋', 'success');
    closeModal();
    navigate('iip_coach');
  } catch (err) {
    showToast('배정 실패: ' + err.message, 'error');
  }
}

/* 과제 완료 처리 */
async function markIIPComplete(assignmentId, xpReward) {
  try {
    const saved = await API.patch('iip_assignments', assignmentId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      xp_earned: Number(xpReward)
    });
    const idx = (State.iipAssignments || []).findIndex(a => a.id === assignmentId);
    if (idx >= 0) State.iipAssignments[idx] = { ...State.iipAssignments[idx], ...saved };
    showToast(`과제 완료 ✅ +${xpReward}xp 적립!`, 'success');
    navigate(State.currentPage);
  } catch (err) {
    showToast('완료 처리 실패', 'error');
  }
}

/* ============================================================
   PLAYER — 나의 훈련 과제 (my_iip)
   ============================================================ */
function renderMyIIP() {
  const player = getCurrentPlayer();
  if (!player) return '<div class="empty-state"><i class="fas fa-user"></i><p>선수를 선택하세요</p></div>';

  const iipList = (State.iipAssignments || []).filter(a => a.player_id === player.id);
  const drills = State.drillLibrary || [];

  const totalXP = iipList.reduce((s, a) => s + (Number(a.xp_earned) || 0), 0);
  const completed = iipList.filter(a => a.status === 'completed').length;
  const assigned = iipList.filter(a => a.status === 'assigned' || a.status === 'in_progress').length;
  const compRate = iipList.length ? Math.round((completed / iipList.length) * 100) : 0;

  return `
    <div class="section-header">
      <div class="section-title">
        <i class="fas fa-tasks" style="color:var(--primary)"></i>
        나의 훈련 과제 — <span style="color:var(--primary)">${player.full_name}</span>
      </div>
    </div>

    <!-- 내 IIP 요약 -->
    <div class="kpi-grid" style="margin-bottom:20px">
      ${kpiCard('총 XP', totalXP + 'xp', 'fas fa-star', 'var(--yellow)', '자가훈련 누적')}
      ${kpiCard('완료', completed + '개', 'fas fa-check-circle', 'var(--green)', `완료율 ${compRate}%`)}
      ${kpiCard('진행 중', assigned + '개', 'fas fa-spinner', 'var(--blue)', '남은 과제')}
      ${kpiCard('자가훈련 준수율', compRate + '%', 'fas fa-chart-line', compRate >= 70 ? 'var(--green)' : 'var(--red)', compRate >= 70 ? '우수' : '노력 필요')}
    </div>

    <!-- XP 진행 바 -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="font-weight:800;font-size:15px">자가훈련 XP</div>
          <div class="xp-badge" style="font-size:13px">총 ${totalXP}xp</div>
        </div>
        <div style="position:relative;height:12px;background:var(--gray-100);border-radius:6px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, Math.round(totalXP / 3))}%;
            background:linear-gradient(90deg,var(--primary),#e84040);border-radius:6px;transition:.8s ease"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">다음 단계까지 ${Math.max(0, 300 - totalXP)}xp</div>
      </div>
    </div>

    <!-- 배정된 과제 목록 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-list"></i> 내 과제 목록</div>
      </div>
      <div style="padding:16px">
        ${iipList.length === 0
          ? '<div class="empty-state" style="padding:40px"><i class="fas fa-trophy" style="opacity:.3"></i><p>배정된 과제가 없습니다</p></div>'
          : iipList.map(a => {
              const drill = drills.find(d => d.id === a.drill_id);
              const cat = drill ? CATEGORY_META[drill.category] : null;
              const diff = drill ? DIFF_META[drill.difficulty] : null;
              const isCompleted = a.status === 'completed';
              const isOverdue = !isCompleted && a.due_date && new Date(a.due_date) < new Date();
              return `
                <div class="my-iip-card ${isCompleted ? 'completed' : isOverdue ? 'overdue' : ''}">
                  <div class="my-iip-top">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
                      <div class="drill-icon-circle" style="background:${cat?.color||'#333'}20;color:${cat?.color||'#333'}">
                        ${cat?.icon || '📋'}
                      </div>
                      <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:14px">${drill?.title || '삭제된 드릴'}</div>
                        <div style="font-size:11px;color:var(--gray-500)">
                          ${diff ? `${diff.label}` : ''} · ${drill?.duration_min || '-'}분 · <span style="color:var(--yellow)">+${drill?.xp_reward || 0}xp</span>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
                      ${isCompleted
                        ? `<span class="badge badge-paid">완료 ✅</span><span class="xp-badge">+${a.xp_earned}xp</span>`
                        : isOverdue
                          ? `<span class="badge badge-injured">기한 초과</span>`
                          : `<span class="badge badge-active">${a.status === 'in_progress' ? '진행 중' : '대기'}</span>`}
                    </div>
                  </div>

                  ${a.coach_feedback ? `
                    <div class="my-iip-feedback">
                      <i class="fas fa-comment-alt" style="color:var(--primary);margin-right:4px"></i>
                      ${a.coach_feedback}
                    </div>
                  ` : ''}

                  <div class="my-iip-meta">
                    <span><i class="fas fa-calendar-alt"></i> 기한: ${a.due_date || '-'}</span>
                    ${a.completed_at ? `<span style="color:var(--green)"><i class="fas fa-check"></i> 완료: ${formatDate(a.completed_at)}</span>` : ''}
                  </div>

                  ${!isCompleted ? `
                    <div style="display:flex;gap:8px;margin-top:12px">
                      <button class="btn btn-sm btn-secondary" style="flex:1" onclick="openMyIIPDetail('${a.id}')">
                        <i class="fas fa-info-circle"></i> 드릴 보기
                      </button>
                      <button class="btn btn-sm btn-primary" style="flex:1" onclick="markMyIIPDone('${a.id}','${drill?.xp_reward||0}')">
                        <i class="fas fa-check"></i> 완료 보고
                      </button>
                    </div>
                  ` : `
                    <div style="margin-top:8px">
                      ${a.player_note ? `<div style="font-size:12px;color:var(--gray-600);background:var(--gray-50);padding:8px;border-radius:6px">"${a.player_note}"</div>` : ''}
                    </div>
                  `}
                </div>
              `;
            }).join('')}
      </div>
    </div>
  `;
}

/* 내 드릴 상세 보기 */
function openMyIIPDetail(assignmentId) {
  const assignment = (State.iipAssignments || []).find(a => a.id === assignmentId);
  const drill = assignment ? (State.drillLibrary || []).find(d => d.id === assignment.drill_id) : null;
  if (!drill) return;
  const cat = CATEGORY_META[drill.category] || {};
  const diff = DIFF_META[drill.difficulty] || {};
  openModal(`🏋️ ${drill.title}`, `
    <div>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <span style="background:${cat.color||'#333'}20;color:${cat.color||'#333'};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">${cat.icon||''} ${cat.label||drill.category}</span>
        <span style="background:${diff.bg||'#f0f0f0'};color:${diff.color||'#333'};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">${diff.label||drill.difficulty}</span>
        <span style="font-size:12px"><i class="fas fa-clock"></i> ${drill.duration_min}분</span>
        <span style="font-size:12px;color:var(--yellow)"><i class="fas fa-star"></i> +${drill.xp_reward}xp</span>
      </div>
      <div style="background:var(--gray-50);border-radius:8px;padding:14px;font-size:13px;line-height:1.8;white-space:pre-line;margin-bottom:12px">${drill.instructions || ''}</div>
      ${assignment.coach_feedback ? `
        <div style="background:rgba(123,24,24,.06);border-left:3px solid var(--primary);padding:10px;border-radius:0 6px 6px 0;font-size:13px;margin-bottom:12px">
          <strong>코치 피드백:</strong> ${assignment.coach_feedback}
        </div>` : ''}
      <div class="modal-footer" style="padding:0">
        <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
        <button class="btn btn-primary" onclick="closeModal();markMyIIPDone('${assignmentId}','${drill.xp_reward}')">
          <i class="fas fa-check"></i> 완료 보고
        </button>
      </div>
    </div>
  `, true);
}

/* 선수가 직접 완료 보고 */
async function markMyIIPDone(assignmentId, xpReward) {
  const note = prompt('완료 소감을 남겨주세요 (선택사항):') || '';
  try {
    const saved = await API.patch('iip_assignments', assignmentId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      xp_earned: Number(xpReward),
      player_note: note
    });
    const idx = (State.iipAssignments || []).findIndex(a => a.id === assignmentId);
    if (idx >= 0) State.iipAssignments[idx] = { ...State.iipAssignments[idx], ...saved };
    showToast(`훈련 완료! 🎉 +${xpReward}xp 획득!`, 'success');
    navigate('my_iip');
  } catch (err) {
    showToast('완료 보고 실패', 'error');
  }
}

/* KPI 카드 헬퍼 (iip.js 내부용) */
function kpiCard(title, value, icon, color, sub) {
  return `
    <div class="kpi-card">
      <div class="kpi-icon" style="color:${color}"><i class="${icon}"></i></div>
      <div class="kpi-info">
        <div class="kpi-value">${value}</div>
        <div class="kpi-title">${title}</div>
        ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
      </div>
    </div>
  `;
}
