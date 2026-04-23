/* ============================================================
   practice.js — 훈련 계획 관리
   PlayProve Team ERP v3

   ▸ 유닛별(Offense / Defense / Special) 계획 열람
   ▸ 코치 직접 작성 폼
   ▸ ERP 데이터 기반 AI 추천 계획 생성
   ============================================================ */

/* ── 상태 ── */
const PracticeState = {
  plans:      [],
  activeUnit: 'all',   // all | offense | defense | special
  activeTab:  'board', // board | write | ai
  editingId:  null,
};

/* ── 유닛 메타 ── */
const UNIT_META = {
  offense: { label: 'Offense', icon: 'fa-football-ball', color: '#e8a000', bg: '#fff8e0', pos: ['QB','RB','FB','WR','TE','OL','C','G','T'] },
  defense: { label: 'Defense', icon: 'fa-shield-alt',    color: '#1a5ca8', bg: '#e8f0fc', pos: ['DE','DT','NT','OLB','ILB','MLB','CB','NB','FS','SS'] },
  special: { label: 'Special', icon: 'fa-star',          color: '#1a8a4a', bg: '#e8fef0', pos: ['K','P','LS','KR','PR'] },
};

const PHASE_LABELS = {
  pre_season: '프리시즌', regular: '정규시즌', post_season: '포스트시즌', off_season: '오프시즌'
};
const STATUS_META = {
  draft:     { label: '초안',    cls: 'plan-status-draft'     },
  published: { label: '공개',    cls: 'plan-status-published' },
  completed: { label: '완료',    cls: 'plan-status-completed' },
};

/* ══════════════════════════════════════════
   메인 렌더
══════════════════════════════════════════ */
function renderPracticePlan() {
  return `
    <div class="practice-wrap" id="practiceWrap">
      <!-- 상단 탭 -->
      <div class="practice-tab-bar">
        <button class="practice-tab ${PracticeState.activeTab==='board'?'active':''}"
          onclick="switchPracticeTab('board')">
          <i class="fas fa-clipboard-list"></i> 훈련 계획 보드
        </button>
        <button class="practice-tab ${PracticeState.activeTab==='write'?'active':''}"
          onclick="switchPracticeTab('write')">
          <i class="fas fa-pen"></i> 계획 작성
        </button>
        <button class="practice-tab ${PracticeState.activeTab==='ai'?'active':''}"
          onclick="switchPracticeTab('ai')">
          <i class="fas fa-robot"></i> AI 추천
          <span class="plan-ai-badge">AI</span>
        </button>
      </div>

      <!-- 탭 컨텐츠 -->
      <div id="practiceTabContent"></div>
    </div>
  `;
}

async function afterRenderPracticePlan() {
  await loadPracticePlans();
  switchPracticeTab(PracticeState.activeTab);
}

/* ── 계획 데이터 로드 ── */
async function loadPracticePlans() {
  try {
    const res  = await fetch('tables/practice_plans?limit=100&sort=plan_date');
    const json = await res.json();
    PracticeState.plans = json.data || [];
  } catch {
    PracticeState.plans = [];
  }
}

/* ── 탭 전환 ── */
function switchPracticeTab(tab) {
  PracticeState.activeTab = tab;
  document.querySelectorAll('.practice-tab').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().toLowerCase().includes(
      tab === 'board' ? '보드' : tab === 'write' ? '작성' : 'ai'
    ));
  });
  // 정확히 active 재처리
  document.querySelectorAll('.practice-tab').forEach(b => b.classList.remove('active'));
  const tabs = document.querySelectorAll('.practice-tab');
  const idx = { board:0, write:1, ai:2 }[tab];
  if (tabs[idx]) tabs[idx].classList.add('active');

  const content = document.getElementById('practiceTabContent');
  if (!content) return;
  switch (tab) {
    case 'board': renderPracticeBoardTab(content); break;
    case 'write': renderPracticeWriteTab(content); break;
    case 'ai':    renderPracticeAITab(content);    break;
  }
}

/* ══════════════════════════════════════════
   TAB 1 — 훈련 계획 보드
══════════════════════════════════════════ */
function renderPracticeBoardTab(container) {
  const plans = PracticeState.plans;

  container.innerHTML = `
    <!-- 유닛 필터 -->
    <div class="plan-unit-filter">
      ${[['all','전체','fa-th-large','#555'],
         ['offense','Offense','fa-football-ball','#e8a000'],
         ['defense','Defense','fa-shield-alt','#1a5ca8'],
         ['special','Special','fa-star','#1a8a4a']
        ].map(([key, label, icon, color]) => `
        <button class="plan-unit-btn ${PracticeState.activeUnit===key?'active':''}"
          style="${PracticeState.activeUnit===key?`border-color:${color};color:${color};background:${color}15`:''}"
          onclick="filterPracticeUnit('${key}')">
          <i class="fas ${icon}"></i> ${label}
        </button>
      `).join('')}

      <button class="plan-new-btn" onclick="switchPracticeTab('write')">
        <i class="fas fa-plus"></i> 새 계획 작성
      </button>
    </div>

    <!-- 유닛별 컬럼 보드 -->
    <div class="plan-board" id="planBoard">
      ${renderPlanBoard(plans)}
    </div>
  `;
}

function filterPracticeUnit(unit) {
  PracticeState.activeUnit = unit;
  const board = document.getElementById('planBoard');
  if (!board) return;

  // 필터 버튼 스타일 업데이트
  document.querySelectorAll('.plan-unit-btn').forEach(b => {
    const key = b.textContent.trim().toLowerCase();
    const isActive = (key === unit) || (unit === 'all' && key === '전체');
    b.classList.toggle('active', isActive);
  });
  board.innerHTML = renderPlanBoard(PracticeState.plans);
}

function renderPlanBoard(allPlans) {
  const unit = PracticeState.activeUnit;
  const units = unit === 'all' ? ['offense','defense','special'] : [unit];

  return `<div class="plan-columns ${unit === 'all' ? 'three-col' : 'one-col'}">
    ${units.map(u => {
      const meta  = UNIT_META[u];
      const plans = allPlans.filter(p => p.unit === u || p.unit === 'full');
      return `
        <div class="plan-column">
          <div class="plan-column-header" style="border-left:4px solid ${meta.color};background:${meta.bg}">
            <i class="fas ${meta.icon}" style="color:${meta.color}"></i>
            <span>${meta.label}</span>
            <span class="plan-col-count">${plans.length}</span>
            <button class="plan-col-add-btn" onclick="openWriteForUnit('${u}')" title="계획 추가">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="plan-card-list">
            ${plans.length === 0
              ? `<div class="plan-empty-col"><i class="fas fa-clipboard" style="font-size:24px;color:var(--gray-200);margin-bottom:8px"></i><div>계획 없음</div></div>`
              : plans.map(p => renderPlanCard(p, meta)).join('')
            }
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderPlanCard(plan, meta) {
  const sm   = STATUS_META[plan.status] || STATUS_META.draft;
  const date = plan.plan_date ? new Date(plan.plan_date).toLocaleDateString('ko', { month:'short', day:'numeric', weekday:'short' }) : '-';
  let drills = [];
  try { drills = JSON.parse(plan.main_drills || '[]'); } catch {}

  return `
    <div class="plan-card" onclick="openPlanDetail('${plan.id}')">
      <div class="plan-card-top">
        <div class="plan-card-title">${plan.title}</div>
        <span class="${sm.cls}">${sm.label}</span>
      </div>

      ${plan.ai_generated ? `<div class="plan-ai-chip"><i class="fas fa-robot"></i> AI 생성</div>` : ''}

      <div class="plan-card-meta">
        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
        <span><i class="fas fa-clock"></i> ${plan.duration_min || '-'}분</span>
        ${plan.position_group ? `<span><i class="fas fa-user-tag"></i> ${plan.position_group}</span>` : ''}
      </div>

      ${plan.goals ? `<div class="plan-card-goal">${plan.goals.slice(0,60)}${plan.goals.length>60?'…':''}</div>` : ''}

      ${drills.length > 0 ? `
        <div class="plan-drill-chips">
          ${drills.slice(0,3).map(d => `<span class="plan-drill-chip">${d.name}</span>`).join('')}
          ${drills.length > 3 ? `<span class="plan-drill-chip more">+${drills.length-3}</span>` : ''}
        </div>` : ''}

      <div class="plan-card-actions">
        <button class="plan-edit-btn" onclick="event.stopPropagation();openEditPlan('${plan.id}')">
          <i class="fas fa-pen"></i>
        </button>
        <button class="plan-del-btn" onclick="event.stopPropagation();deletePlan('${plan.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`;
}

/* ── 계획 상세 모달 ── */
function openPlanDetail(planId) {
  const plan = PracticeState.plans.find(p => p.id === planId);
  if (!plan) return;
  const meta = UNIT_META[plan.unit] || UNIT_META.offense;
  const sm   = STATUS_META[plan.status] || STATUS_META.draft;
  let drills = [];
  try { drills = JSON.parse(plan.main_drills || '[]'); } catch {}

  const body = `
    <div class="plan-detail">
      <div class="plan-detail-header" style="background:${meta.bg};border-bottom:3px solid ${meta.color}">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="plan-unit-pill" style="background:${meta.color};color:#fff">
            <i class="fas ${meta.icon}"></i> ${meta.label}
          </span>
          ${plan.position_group ? `<span class="plan-pos-pill">${plan.position_group}</span>` : ''}
          <span class="${sm.cls}">${sm.label}</span>
          ${plan.ai_generated ? `<span class="plan-ai-chip"><i class="fas fa-robot"></i> AI 생성</span>` : ''}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--gray-500);display:flex;gap:14px;flex-wrap:wrap">
          <span><i class="fas fa-calendar-alt"></i> ${plan.plan_date || '-'}</span>
          <span><i class="fas fa-clock"></i> ${plan.duration_min || '-'}분</span>
          <span><i class="fas fa-layer-group"></i> ${PHASE_LABELS[plan.phase] || plan.phase || '-'}</span>
        </div>
      </div>

      <div class="plan-detail-body">
        ${plan.goals ? `
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-bullseye"></i> 훈련 목표</div>
            <div class="plan-section-content">${plan.goals}</div>
          </div>` : ''}

        ${plan.warm_up ? `
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-fire-alt" style="color:#e8a000"></i> 워밍업</div>
            <div class="plan-section-content">${plan.warm_up}</div>
          </div>` : ''}

        ${drills.length > 0 ? `
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-dumbbell" style="color:var(--primary)"></i> 본운동 드릴</div>
            <div class="plan-drill-table">
              ${drills.map((d, i) => `
                <div class="plan-drill-row">
                  <div class="plan-drill-num">${i+1}</div>
                  <div class="plan-drill-info">
                    <div class="plan-drill-name">${d.name}</div>
                    <div class="plan-drill-focus">${d.focus || ''}</div>
                  </div>
                  <div class="plan-drill-dur">${d.duration || '-'}분</div>
                </div>`).join('')}
            </div>
          </div>` : ''}

        ${plan.conditioning ? `
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-heartbeat" style="color:#c0392b"></i> 체력 훈련</div>
            <div class="plan-section-content">${plan.conditioning}</div>
          </div>` : ''}

        ${plan.cool_down ? `
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-snowflake" style="color:#1a5ca8"></i> 쿨다운</div>
            <div class="plan-section-content">${plan.cool_down}</div>
          </div>` : ''}

        ${plan.coach_notes ? `
          <div class="plan-section plan-notes-section">
            <div class="plan-section-title"><i class="fas fa-sticky-note"></i> 코치 메모</div>
            <div class="plan-section-content">${plan.coach_notes}</div>
          </div>` : ''}
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-secondary" style="flex:1" onclick="closeModal()">닫기</button>
        <button class="btn btn-primary" style="flex:1" onclick="closeModal();openEditPlan('${plan.id}')">
          <i class="fas fa-pen"></i> 수정
        </button>
      </div>
    </div>`;

  openModal(plan.title, body, true);
}

/* ══════════════════════════════════════════
   TAB 2 — 계획 작성 폼
══════════════════════════════════════════ */
function openWriteForUnit(unit) {
  PracticeState.activeUnit = unit;
  PracticeState.editingId  = null;
  switchPracticeTab('write');
}

function openEditPlan(planId) {
  PracticeState.editingId = planId;
  switchPracticeTab('write');
}

function renderPracticeWriteTab(container) {
  const editId = PracticeState.editingId;
  const plan   = editId ? PracticeState.plans.find(p => p.id === editId) : null;
  const unit   = plan?.unit || PracticeState.activeUnit || 'offense';

  // 기존 드릴 파싱
  let drills = [];
  try { drills = JSON.parse(plan?.main_drills || '[]'); } catch {}
  if (drills.length === 0) drills = [{ name:'', duration:15, focus:'' }];

  container.innerHTML = `
    <div class="plan-write-wrap">
      <div class="plan-write-header">
        <div class="plan-write-title">
          <i class="fas fa-pen"></i>
          ${plan ? '훈련 계획 수정' : '새 훈련 계획 작성'}
        </div>
        ${plan ? `<button class="btn btn-secondary btn-sm" onclick="PracticeState.editingId=null;switchPracticeTab('write')">
          <i class="fas fa-plus"></i> 새로 작성
        </button>` : ''}
      </div>

      <form id="planWriteForm" onsubmit="submitPlanForm(event)">
        <!-- 기본 정보 -->
        <div class="plan-form-section">
          <div class="plan-form-section-title">📋 기본 정보</div>
          <div class="form-group">
            <label class="form-label">계획 제목 <span class="required">*</span></label>
            <input class="form-control" name="title" required placeholder="예) 오펜스 패싱 게임 집중 훈련" value="${plan?.title||''}" />
          </div>
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">유닛 <span class="required">*</span></label>
              <select class="form-control" name="unit" id="planUnitSelect" onchange="updatePosGroupOptions(this.value)" required>
                <option value="offense" ${unit==='offense'?'selected':''}>🟡 Offense</option>
                <option value="defense" ${unit==='defense'?'selected':''}>🔵 Defense</option>
                <option value="special" ${unit==='special'?'selected':''}>🟢 Special</option>
                <option value="full"    ${unit==='full'?'selected':''}>⚪ 전체 팀</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">포지션 그룹</label>
              <select class="form-control" name="position_group" id="planPosGroup">
                ${getPosGroupOptions(unit, plan?.position_group)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">시즌 단계</label>
              <select class="form-control" name="phase">
                ${Object.entries(PHASE_LABELS).map(([k,v])=>`<option value="${k}" ${plan?.phase===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">훈련 날짜</label>
              <input class="form-control" type="date" name="plan_date" value="${plan?.plan_date||getTodayStr()}" />
            </div>
            <div class="form-group">
              <label class="form-label">예정 시간 (분)</label>
              <input class="form-control" type="number" name="duration_min" min="10" max="300" value="${plan?.duration_min||90}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">공개 상태</label>
            <select class="form-control" name="status" style="max-width:180px">
              ${Object.entries(STATUS_META).map(([k,v])=>`<option value="${k}" ${plan?.status===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- 훈련 내용 -->
        <div class="plan-form-section">
          <div class="plan-form-section-title">🎯 훈련 목표</div>
          <textarea class="form-control" name="goals" rows="2" placeholder="이번 훈련에서 달성하려는 목표를 적어주세요.">${plan?.goals||''}</textarea>
        </div>

        <div class="plan-form-section">
          <div class="plan-form-section-title">🔥 워밍업</div>
          <textarea class="form-control" name="warm_up" rows="2" placeholder="예) 동적 스트레칭 10분 → 경량 캐치 드릴 5분">${plan?.warm_up||''}</textarea>
        </div>

        <!-- 드릴 목록 (동적 추가) -->
        <div class="plan-form-section">
          <div class="plan-form-section-title">
            🏋️ 본운동 드릴
            <button type="button" class="plan-add-drill-btn" onclick="addDrillRow()">
              <i class="fas fa-plus"></i> 드릴 추가
            </button>
          </div>
          <div id="drillRows">
            ${drills.map((d, i) => drillRowHTML(i, d)).join('')}
          </div>
        </div>

        <div class="plan-form-section">
          <div class="plan-form-section-title">❤️ 체력 훈련</div>
          <textarea class="form-control" name="conditioning" rows="2" placeholder="예) 40야드 대시 × 5세트">${plan?.conditioning||''}</textarea>
        </div>

        <div class="plan-form-section">
          <div class="plan-form-section-title">❄️ 쿨다운</div>
          <input class="form-control" name="cool_down" placeholder="예) 정적 스트레칭 5분" value="${plan?.cool_down||''}" />
        </div>

        <div class="plan-form-section">
          <div class="plan-form-section-title">📝 코치 메모</div>
          <textarea class="form-control" name="coach_notes" rows="3" placeholder="선수별 주의사항, 다음 훈련 연결 포인트 등...">${plan?.coach_notes||''}</textarea>
        </div>

        <div style="display:flex;gap:10px;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="switchPracticeTab('board')">
            <i class="fas fa-arrow-left"></i> 목록으로
          </button>
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fas fa-save"></i> ${plan ? '수정 저장' : '계획 등록'}
          </button>
        </div>
      </form>
    </div>`;
}

function getPosGroupOptions(unit, selected) {
  const groups = {
    offense: ['QB', 'RB/FB', 'WR/TE', 'OL', 'QB/WR/TE', '전체 오펜스'],
    defense: ['DL', 'LB', 'DB/LB', 'DB', 'DL/LB', '전체 디펜스'],
    special: ['ST', 'K/P', '전체 스페셜'],
    full:    ['전체 팀'],
  };
  const list = groups[unit] || groups.offense;
  return list.map(g => `<option value="${g}" ${selected===g?'selected':''}>${g}</option>`).join('');
}

function updatePosGroupOptions(unit) {
  const sel = document.getElementById('planPosGroup');
  if (sel) sel.innerHTML = getPosGroupOptions(unit, '');
}

function drillRowHTML(i, d = {}) {
  return `
    <div class="drill-row" id="drillRow${i}">
      <div class="drill-row-num">${i+1}</div>
      <input class="form-control drill-name" placeholder="드릴 이름" value="${d.name||''}" data-idx="${i}" data-field="name" />
      <input class="form-control drill-focus" placeholder="집중 포인트" value="${d.focus||''}" data-idx="${i}" data-field="focus" />
      <div style="display:flex;align-items:center;gap:6px">
        <input class="form-control drill-dur" type="number" min="1" max="120" placeholder="분" value="${d.duration||15}" style="width:64px" data-idx="${i}" data-field="duration" />
        <span style="font-size:11px;color:var(--gray-400)">분</span>
      </div>
      <button type="button" class="drill-del-btn" onclick="removeDrillRow(${i})">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
}

let _drillCount = 1;
function addDrillRow() {
  const container = document.getElementById('drillRows');
  if (!container) return;
  const idx = container.children.length;
  container.insertAdjacentHTML('beforeend', drillRowHTML(idx));
  _drillCount++;
}

function removeDrillRow(idx) {
  const row = document.getElementById('drillRow' + idx);
  if (row) row.remove();
  // 번호 재정렬
  document.querySelectorAll('.drill-row').forEach((r, i) => {
    const numEl = r.querySelector('.drill-row-num');
    if (numEl) numEl.textContent = i + 1;
  });
}

function collectDrills() {
  const rows = document.querySelectorAll('.drill-row');
  return [...rows].map(r => ({
    name:     r.querySelector('.drill-name')?.value || '',
    focus:    r.querySelector('.drill-focus')?.value || '',
    duration: Number(r.querySelector('.drill-dur')?.value) || 15,
  })).filter(d => d.name.trim());
}

async function submitPlanForm(e) {
  e.preventDefault();
  const data    = Object.fromEntries(new FormData(e.target));
  const drills  = collectDrills();
  const session = typeof AUTH !== 'undefined' ? AUTH.getSession() : null;

  const payload = {
    team_id:        session?.teamId || 'team-001',
    title:          data.title,
    unit:           data.unit,
    position_group: data.position_group,
    plan_date:      data.plan_date,
    duration_min:   Number(data.duration_min) || 90,
    phase:          data.phase,
    status:         data.status,
    goals:          data.goals,
    warm_up:        data.warm_up,
    main_drills:    JSON.stringify(drills),
    conditioning:   data.conditioning,
    cool_down:      data.cool_down,
    coach_notes:    data.coach_notes,
    ai_generated:   false,
    created_by:     session?.userId || 'unknown',
    created_at_plan: new Date().toISOString(),
  };

  try {
    if (PracticeState.editingId) {
      await fetch(`tables/practice_plans/${PracticeState.editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (typeof showToast === 'function') showToast('훈련 계획이 수정되었습니다', 'success');
    } else {
      await fetch('tables/practice_plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (typeof showToast === 'function') showToast('훈련 계획이 등록되었습니다', 'success');
    }
    PracticeState.editingId = null;
    await loadPracticePlans();
    switchPracticeTab('board');
  } catch (err) {
    if (typeof showToast === 'function') showToast('저장 실패: ' + err.message, 'error');
  }
}

async function deletePlan(planId) {
  if (!confirm('이 훈련 계획을 삭제하시겠습니까?')) return;
  try {
    await fetch(`tables/practice_plans/${planId}`, { method: 'DELETE' });
    PracticeState.plans = PracticeState.plans.filter(p => p.id !== planId);
    if (typeof showToast === 'function') showToast('삭제되었습니다', '');
    const board = document.getElementById('planBoard');
    if (board) board.innerHTML = renderPlanBoard(PracticeState.plans);
  } catch (err) {
    if (typeof showToast === 'function') showToast('삭제 실패', 'error');
  }
}

/* ══════════════════════════════════════════
   TAB 3 — AI 추천 훈련 계획
══════════════════════════════════════════ */
function renderPracticeAITab(container) {
  container.innerHTML = `
    <div class="plan-ai-wrap">
      <div class="plan-ai-header">
        <div class="plan-ai-title">
          <i class="fas fa-robot"></i> AI 훈련 계획 추천
        </div>
        <div class="plan-ai-desc">
          ERP에 쌓인 <strong>역량 평가 · 출결 · 부상 · IIP 데이터</strong>를 분석해<br>
          유닛별 맞춤 훈련 계획을 자동으로 생성합니다.
        </div>
      </div>

      <!-- 분석 현황 카드 -->
      <div class="plan-ai-data-cards" id="aiDataCards">
        <div style="text-align:center;padding:20px;color:var(--gray-400)">
          <i class="fas fa-spinner fa-spin"></i> 데이터 분석 중...
        </div>
      </div>

      <!-- 유닛 선택 & 생성 -->
      <div class="plan-ai-generate-box">
        <div class="plan-form-section-title" style="margin-bottom:12px">
          <i class="fas fa-magic"></i> 계획 생성 설정
        </div>
        <div class="grid-2" style="gap:12px;margin-bottom:12px">
          <div class="form-group" style="margin:0">
            <label class="form-label" style="font-size:12px">대상 유닛</label>
            <select class="form-control" id="aiUnitSelect">
              <option value="offense">🟡 Offense</option>
              <option value="defense">🔵 Defense</option>
              <option value="special">🟢 Special</option>
              <option value="full">⚪ 전체 팀</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label" style="font-size:12px">훈련 날짜</label>
            <input class="form-control" type="date" id="aiPlanDate" value="${getTodayStr(7)}" />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label" style="font-size:12px">추가 요청사항 (선택)</label>
          <textarea class="form-control" id="aiExtraNote" rows="2"
            placeholder="예) 다음 주 경기 전 마지막 훈련, OL 블로킹 집중 요망..."></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="generateAIPlan()" id="aiGenerateBtn">
          <i class="fas fa-robot"></i> AI 훈련 계획 생성
        </button>
      </div>

      <!-- AI 생성 결과 -->
      <div id="aiPlanResult" style="margin-top:20px"></div>
    </div>`;

  // 데이터 분석 카드 로드
  renderAIDataCards();
}

/* ── ERP 데이터 분석 카드 ── */
async function renderAIDataCards() {
  const container = document.getElementById('aiDataCards');
  if (!container) return;

  const players   = typeof State !== 'undefined' ? State.players   : [];
  const perf      = typeof State !== 'undefined' ? State.performanceScores : [];
  const injuries  = typeof State !== 'undefined' ? State.injuries  : [];
  const iip       = typeof State !== 'undefined' ? State.iipAssignments   : [];
  const attendance= typeof State !== 'undefined' ? State.attendance: [];

  // 역량 평가 평균
  const avgScore = perf.length > 0
    ? (perf.reduce((s,p) => s + ((p.physical+p.skill+p.tactical+p.attendance+p.mental)/5), 0) / perf.length).toFixed(1)
    : 'N/A';

  // 부족 카테고리 분석
  const weakMap = {};
  perf.forEach(p => {
    const scores = { '피지컬': p.physical, '스킬': p.skill, '전술': p.tactical, '출결': p.attendance, '멘탈': p.mental };
    Object.entries(scores).forEach(([k, v]) => {
      if (!weakMap[k]) weakMap[k] = [];
      weakMap[k].push(Number(v)||0);
    });
  });
  const weakAreas = Object.entries(weakMap)
    .map(([k, arr]) => ({ label: k, avg: arr.reduce((a,b)=>a+b,0)/arr.length }))
    .sort((a,b) => a.avg - b.avg)
    .slice(0, 2);

  // 부상 중 선수
  // 확정된 활성 부상만 집계 (pending 신청 제외)
  const activeInjuries = injuries.filter(i =>
    i.is_active && (i.approval_status === 'confirmed' || !i.approval_status)
  );

  // IIP 미완료
  const iipPending = iip.filter(i => i.status === 'assigned' || i.status === 'in_progress');

  // 출결률
  const recent = attendance.slice(-30);
  const attRate = recent.length > 0
    ? Math.round(recent.filter(a => a.status === 'present').length / recent.length * 100)
    : null;

  container.innerHTML = `
    <div class="ai-data-grid">
      <div class="ai-data-card">
        <div class="ai-data-icon" style="color:#1a5ca8"><i class="fas fa-star"></i></div>
        <div class="ai-data-val">${avgScore}</div>
        <div class="ai-data-label">팀 평균 역량 점수</div>
      </div>
      <div class="ai-data-card">
        <div class="ai-data-icon" style="color:#c0392b"><i class="fas fa-medkit"></i></div>
        <div class="ai-data-val">${activeInjuries.length}</div>
        <div class="ai-data-label">부상 선수 수</div>
      </div>
      <div class="ai-data-card">
        <div class="ai-data-icon" style="color:#e8a000"><i class="fas fa-tasks"></i></div>
        <div class="ai-data-val">${iipPending.length}</div>
        <div class="ai-data-label">IIP 미완료 과제</div>
      </div>
      <div class="ai-data-card">
        <div class="ai-data-icon" style="color:#1a8a4a"><i class="fas fa-calendar-check"></i></div>
        <div class="ai-data-val">${attRate !== null ? attRate + '%' : 'N/A'}</div>
        <div class="ai-data-label">최근 출결률</div>
      </div>
    </div>

    ${weakAreas.length > 0 ? `
      <div class="ai-weak-alert">
        <i class="fas fa-exclamation-triangle" style="color:#e8a000"></i>
        <strong>AI 분석:</strong>
        ${weakAreas.map(w => `<span class="ai-weak-tag">${w.label} (평균 ${w.avg.toFixed(1)}점)</span>`).join('')} 영역이 상대적으로 부족합니다.
        아래에서 AI 훈련 계획을 생성하면 이 부분을 집중 반영합니다.
      </div>` : ''}
  `;
}

/* ── AI 계획 생성 (시뮬레이션) ── */
async function generateAIPlan() {
  const unit      = document.getElementById('aiUnitSelect')?.value || 'offense';
  const date      = document.getElementById('aiPlanDate')?.value || getTodayStr(7);
  const extraNote = document.getElementById('aiExtraNote')?.value || '';
  const btn       = document.getElementById('aiGenerateBtn');
  const result    = document.getElementById('aiPlanResult');

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...'; }

  // ERP 데이터 수집
  const perf     = typeof State !== 'undefined' ? State.performanceScores : [];
  const injuries = typeof State !== 'undefined' ? State.injuries          : [];
  const iip      = typeof State !== 'undefined' ? State.iipAssignments    : [];
  const meta     = UNIT_META[unit] || UNIT_META.offense;

  // 부족 영역 분석
  const avgMap = {};
  perf.forEach(p => {
    ['physical','skill','tactical','attendance','mental'].forEach(k => {
      if (!avgMap[k]) avgMap[k] = [];
      avgMap[k].push(Number(p[k])||0);
    });
  });
  const avgs = Object.fromEntries(
    Object.entries(avgMap).map(([k,arr]) => [k, arr.reduce((a,b)=>a+b,0)/arr.length])
  );
  const weakKey   = Object.entries(avgs).sort((a,b)=>a[1]-b[1])[0]?.[0] || 'skill';
  const activeInj = injuries.filter(i => i.is_active).length;

  // 유닛별 드릴 생성 로직
  const drillTemplates = {
    offense: [
      { name: '7on7 패싱 드릴',         focus: 'QB 릴리즈 & WR 루트 정확도', duration: 25 },
      { name: '런 플레이 블로킹',         focus: 'OL 핸드플레이스먼트',         duration: 20 },
      { name: '레드존 공격 스크리미지',   focus: '골라인 패싱',                  duration: 20 },
      { name: '스크린 패스 타이밍',       focus: 'RB 릴리즈 & WR 블로킹',       duration: 15 },
    ],
    defense: [
      { name: '맨커버리지 1on1',          focus: 'DB 힙 회전 & 트래킹',          duration: 25 },
      { name: '존 드롭 패턴',             focus: 'LB 패스커버리지',              duration: 20 },
      { name: '패스 러시 1on1',           focus: 'DE 런치 & 핀 무브',            duration: 20 },
      { name: '태클 더미 드릴',           focus: '어깨 태클 & 랩',               duration: 15 },
    ],
    special: [
      { name: '킥오프 커버리지 워크스루', focus: '레인 유지',                    duration: 20 },
      { name: '펀트 리턴 블로킹',         focus: '블로킹 타이밍',                duration: 15 },
      { name: 'FG/PAT 스냅-홀드-킥',     focus: '일관성 확보',                  duration: 15 },
    ],
    full: [
      { name: '팀 스크리미지',            focus: '공수 전체 연계',                duration: 30 },
      { name: '2분 드릴',                focus: '클러치 상황 대처',              duration: 20 },
    ],
  };

  // 약점 기반 보정 드릴 추가
  const bonusDrills = {
    physical:    { name: '기초 체력 서킷',      focus: '전신 근력·지구력',     duration: 15 },
    skill:       { name: '포지션별 스킬 드릴',  focus: '기본기 반복 강화',     duration: 15 },
    tactical:    { name: '전술 퀴즈 & 워크스루',focus: '플레이북 이해도 점검', duration: 15 },
    attendance:  { name: '팀 빌딩 세션',        focus: '책임감·팀워크',        duration: 10 },
    mental:      { name: '멘탈 루틴 훈련',      focus: '집중력·루틴 정착',     duration: 10 },
  };

  const baseDrills = (drillTemplates[unit] || drillTemplates.offense).slice(0, 3);
  if (bonusDrills[weakKey]) baseDrills.push(bonusDrills[weakKey]);

  const totalDur = 10 + baseDrills.reduce((s,d)=>s+d.duration,0) + 15 + 5;

  // 부상 주의사항
  const injNote = activeInj > 0
    ? `\n⚠️ 현재 부상 선수 ${activeInj}명 — 컨택 훈련 시 대체 운동 제공 필요.` : '';

  const aiPlan = {
    title:          `[AI 추천] ${meta.label} ${new Date(date).toLocaleDateString('ko',{month:'short',day:'numeric'})} 훈련`,
    unit,
    position_group: Object.keys(UNIT_META[unit]||{})[0] || '',
    plan_date:      date,
    duration_min:   totalDur,
    phase:          'regular',
    status:         'draft',
    goals:          `AI 분석 결과 [${['physical','skill','tactical','attendance','mental'].map(k=>k===weakKey?`**${k}(${avgs[k]?.toFixed(1)})**`:null).filter(Boolean).join(', ')}] 영역 집중 보강. ${extraNote}`.trim(),
    warm_up:        '동적 스트레칭 5분 → 경량 볼 핸들링 5분',
    main_drills:    JSON.stringify(baseDrills),
    conditioning:   '전력 셔틀 × 4 + 플랭크 3세트',
    cool_down:      '정적 스트레칭 5분',
    coach_notes:    `AI 자동 생성 계획. 검토 후 수정하세요.${injNote}`,
    ai_generated:   true,
  };

  // 결과 표시
  await sleep(1200);
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-robot"></i> AI 훈련 계획 생성'; }

  if (!result) return;
  result.innerHTML = `
    <div class="ai-result-wrap">
      <div class="ai-result-header">
        <i class="fas fa-check-circle" style="color:var(--green)"></i>
        AI 계획 생성 완료!
        <span class="plan-ai-chip" style="margin-left:8px"><i class="fas fa-robot"></i> AI 생성</span>
      </div>

      <div class="plan-detail">
        <div class="plan-detail-header" style="background:${meta.bg};border-bottom:3px solid ${meta.color}">
          <div style="font-size:16px;font-weight:800;color:var(--gray-900);margin-bottom:6px">${aiPlan.title}</div>
          <div style="font-size:11px;color:var(--gray-500);display:flex;gap:14px;flex-wrap:wrap">
            <span><i class="fas fa-calendar-alt"></i> ${date}</span>
            <span><i class="fas fa-clock"></i> ${totalDur}분</span>
            <span><i class="fas fa-layer-group"></i> 정규시즌</span>
          </div>
        </div>
        <div class="plan-detail-body" style="max-height:300px;overflow-y:auto">
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-bullseye"></i> 훈련 목표</div>
            <div class="plan-section-content">${aiPlan.goals}</div>
          </div>
          <div class="plan-section">
            <div class="plan-section-title"><i class="fas fa-dumbbell" style="color:var(--primary)"></i> 본운동 드릴</div>
            <div class="plan-drill-table">
              ${baseDrills.map((d,i)=>`
                <div class="plan-drill-row">
                  <div class="plan-drill-num">${i+1}</div>
                  <div class="plan-drill-info">
                    <div class="plan-drill-name">${d.name}</div>
                    <div class="plan-drill-focus">${d.focus}</div>
                  </div>
                  <div class="plan-drill-dur">${d.duration}분</div>
                </div>`).join('')}
            </div>
          </div>
          <div class="plan-section plan-notes-section">
            <div class="plan-section-title"><i class="fas fa-sticky-note"></i> 코치 메모</div>
            <div class="plan-section-content">${aiPlan.coach_notes}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-secondary" style="flex:1" onclick="document.getElementById('aiPlanResult').innerHTML=''">
          <i class="fas fa-redo"></i> 다시 생성
        </button>
        <button class="btn btn-primary" style="flex:1" onclick="saveAIPlan(${JSON.stringify(JSON.stringify(aiPlan))})">
          <i class="fas fa-save"></i> 계획으로 저장
        </button>
      </div>
    </div>`;
}

async function saveAIPlan(jsonStr) {
  const aiPlan  = JSON.parse(jsonStr);
  const session = typeof AUTH !== 'undefined' ? AUTH.getSession() : null;
  const payload = {
    ...aiPlan,
    team_id:        session?.teamId || 'team-001',
    created_by:     session?.userId || 'ai',
    created_at_plan: new Date().toISOString(),
  };
  try {
    await fetch('tables/practice_plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (typeof showToast === 'function') showToast('AI 계획이 저장되었습니다', 'success');
    await loadPracticePlans();
    switchPracticeTab('board');
  } catch (err) {
    if (typeof showToast === 'function') showToast('저장 실패: ' + err.message, 'error');
  }
}

/* ── 유틸 ── */
function getTodayStr(addDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split('T')[0];
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
