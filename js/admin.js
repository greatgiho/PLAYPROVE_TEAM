/* ============================================================
   admin.js — Team Admin Dashboard & Approval Workflow
   PlayProve Team ERP v3

   ▸ 팀 어드민(owner/admin) 전용 기능
   ▸ 가입 신청 승인/거절
   ▸ 멤버 역할 관리
   ▸ 팀 설정
   ============================================================ */

/* ──────────────────────────────────────
   ADMIN STATE
────────────────────────────────────── */
const AdminState = {
  joinRequests: [],
  teamMembers:  [],
  teamInfo:     null,
  loaded:       false,
};

/* ──────────────────────────────────────
   ADMIN DASHBOARD 렌더
────────────────────────────────────── */
function renderAdminDashboard() {
  if (!AUTH.isOwnerOrAdmin()) {
    return `
      <div class="access-denied-screen">
        <i class="fas fa-shield-alt" style="font-size:48px;color:var(--gray-300);margin-bottom:16px"></i>
        <h2>접근 권한 없음</h2>
        <p>팀 어드민(오너/관리자)만 접근할 수 있는 페이지입니다.</p>
      </div>`;
  }
  return `
    <div class="admin-dashboard">
      <!-- 탭 네비게이션 -->
      <div class="admin-tabs" id="adminTabs">
        <button class="admin-tab active" onclick="switchAdminTab('requests')" data-tab="requests">
          <i class="fas fa-user-clock"></i> 가입 신청
          <span class="tab-badge" id="pendingBadge" style="display:none">0</span>
        </button>
        <button class="admin-tab" onclick="switchAdminTab('members')" data-tab="members">
          <i class="fas fa-users"></i> 멤버 관리
        </button>
        <button class="admin-tab" onclick="switchAdminTab('team')" data-tab="team">
          <i class="fas fa-cog"></i> 팀 설정
        </button>
      </div>

      <!-- 탭 컨텐츠 -->
      <div id="adminTabContent">
        <div class="admin-loading">
          <i class="fas fa-spinner fa-spin"></i> 데이터 로딩 중...
        </div>
      </div>
    </div>`;
}

/* ──────────────────────────────────────
   탭 전환
────────────────────────────────────── */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const content = document.getElementById('adminTabContent');
  switch (tab) {
    case 'requests': renderRequestsTab(content); break;
    case 'members':  renderMembersTab(content);  break;
    case 'team':     renderTeamSettingsTab(content); break;
  }
}

/* ──────────────────────────────────────
   가입 신청 탭
────────────────────────────────────── */
async function renderRequestsTab(container) {
  container.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';

  try {
    const session = AUTH.getSession();
    let requests = [];

    // 실제 API 호출
    try {
      const res = await fetch('tables/join_requests?limit=100&sort=requested_at');
      const json = await res.json();
      requests = (json.data || []).filter(r => r.team_id === session.teamId || session.role === 'owner');
    } catch {
      requests = [];
    }

    AdminState.joinRequests = requests;
    const pending  = requests.filter(r => r.status === 'pending');
    const reviewed = requests.filter(r => r.status !== 'pending');

    // 배지 업데이트
    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
      badge.textContent = pending.length;
    }

    container.innerHTML = `
      <div class="requests-panel">
        ${pending.length === 0 && reviewed.length === 0 ? `
          <div class="empty-state">
            <i class="fas fa-inbox" style="font-size:40px;color:var(--gray-300);margin-bottom:12px"></i>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px">가입 신청이 없습니다</div>
            <div style="font-size:13px;color:var(--gray-500)">
              팀 초대 코드를 선수들에게 공유하면<br>가입 신청이 여기 표시됩니다.
            </div>
            <div class="team-code-display" id="inviteCodeDisplay" style="margin:20px auto 0">
              <div>
                <div style="font-size:10px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px">팀 초대 코드</div>
                <div class="team-code-val" id="adminTeamCode">${session.teamCode || '------'}</div>
              </div>
              <button class="copy-btn" onclick="copyAdminCode()">
                <i class="fas fa-copy"></i> 복사
              </button>
            </div>
          </div>
        ` : ''}

        ${pending.length > 0 ? `
          <div class="req-section">
            <div class="req-section-title">
              <i class="fas fa-clock" style="color:var(--yellow)"></i> 
              대기 중 <span class="req-count">${pending.length}</span>
            </div>
            ${pending.map(r => renderRequestCard(r, true)).join('')}
          </div>
        ` : ''}

        ${reviewed.length > 0 ? `
          <div class="req-section" style="margin-top:24px">
            <div class="req-section-title" style="color:var(--gray-500)">
              <i class="fas fa-history"></i> 
              처리 완료 <span class="req-count">${reviewed.length}</span>
            </div>
            ${reviewed.map(r => renderRequestCard(r, false)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="error-state">로드 실패: ${err.message}</div>`;
  }
}

function renderRequestCard(req, isPending) {
  const roleLabels = { player:'선수 🏈', coach:'코치 📋', manager:'매니저 📊', staff:'스태프 🔧' };
  const roleLabel  = roleLabels[req.requested_role] || req.requested_role || '미정';
  const statusMeta = {
    pending:  { label:'대기 중',  cls:'status-pending'  },
    approved: { label:'승인됨',   cls:'status-approved' },
    rejected: { label:'거절됨',   cls:'status-rejected' },
  };
  const sm = statusMeta[req.status] || statusMeta.pending;

  return `
    <div class="req-card" id="req-${req.id}">
      <div class="req-card-header">
        <div class="req-avatar">${(req.display_name || req.user_id || '?')[0].toUpperCase()}</div>
        <div class="req-info">
          <div class="req-name">${req.display_name || req.user_id || '이름 없음'}</div>
          <div class="req-meta">
            <span class="req-role-tag">${roleLabel}</span>
            ${req.requested_position ? `<span class="req-pos-tag">${req.requested_position}</span>` : ''}
            ${req.jersey_number ? `<span class="req-jersey">#${req.jersey_number}</span>` : ''}
          </div>
        </div>
        <div class="req-status ${sm.cls}">${sm.label}</div>
      </div>

      ${req.message ? `
        <div class="req-message">
          <i class="fas fa-quote-left" style="font-size:10px;color:var(--gray-400);margin-right:4px"></i>
          ${req.message}
        </div>` : ''}

      <div class="req-detail-row">
        ${req.height_cm ? `<span><i class="fas fa-ruler-vertical"></i> ${req.height_cm}cm</span>` : ''}
        ${req.weight_kg ? `<span><i class="fas fa-weight"></i> ${req.weight_kg}kg</span>` : ''}
        ${req.requested_unit ? `<span><i class="fas fa-layer-group"></i> ${req.requested_unit}</span>` : ''}
        <span><i class="fas fa-calendar-alt"></i> ${req.requested_at ? new Date(req.requested_at).toLocaleDateString('ko') : '-'}</span>
      </div>

      ${isPending ? `
        <div class="req-actions">
          <button class="req-btn approve" onclick="approveRequest('${req.id}')">
            <i class="fas fa-check"></i> 승인
          </button>
          <button class="req-btn reject" onclick="openRejectModal('${req.id}')">
            <i class="fas fa-times"></i> 거절
          </button>
        </div>` : ''}

      ${req.status === 'rejected' && req.reject_reason ? `
        <div class="req-reject-reason">
          <i class="fas fa-exclamation-circle"></i> 거절 사유: ${req.reject_reason}
        </div>` : ''}
    </div>
  `;
}

/* ──────────────────────────────────────
   가입 신청 승인
────────────────────────────────────── */
async function approveRequest(requestId) {
  const req = AdminState.joinRequests.find(r => r.id === requestId);
  if (!req) return;

  const card = document.getElementById(`req-${requestId}`);
  if (card) {
    card.style.opacity = '0.6';
    card.querySelector('.req-actions').innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
  }

  try {
    await AUTH.approveRequest(requestId, req);
    showAdminToast('✅ 가입 승인 완료! 멤버로 등록되었습니다.', 'success');
    // 탭 새로고침
    await renderRequestsTab(document.getElementById('adminTabContent'));
  } catch (err) {
    showAdminToast('승인 실패: ' + err.message, 'error');
    if (card) {
      card.style.opacity = '1';
      const actions = card.querySelector('.req-actions');
      if (actions) actions.innerHTML = `
        <button class="req-btn approve" onclick="approveRequest('${requestId}')"><i class="fas fa-check"></i> 승인</button>
        <button class="req-btn reject" onclick="openRejectModal('${requestId}')"><i class="fas fa-times"></i> 거절</button>
      `;
    }
  }
}

/* ──────────────────────────────────────
   거절 모달
────────────────────────────────────── */
function openRejectModal(requestId) {
  const req = AdminState.joinRequests.find(r => r.id === requestId);
  const bodyHTML = `
    <div style="padding:8px 0">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:8px">가입 신청 거절</h3>
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:16px">
        <strong>${req?.display_name || req?.user_id || '사용자'}</strong>의 가입 신청을 거절합니다.
      </p>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label" style="font-size:12px">거절 사유 (선택)</label>
        <textarea id="rejectReasonInput" class="form-control" rows="3"
          placeholder="거절 사유를 입력하면 신청자에게 안내됩니다..."
          style="font-size:13px;resize:vertical"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-secondary" style="flex:1" onclick="closeModal()">취소</button>
        <button class="req-btn reject" style="flex:1;padding:10px" onclick="confirmReject('${requestId}')">
          <i class="fas fa-times"></i> 거절 확정
        </button>
      </div>
    </div>
  `;
  if (typeof openModal === 'function') {
    openModal('가입 거절', bodyHTML);
  } else {
    const mb = document.getElementById('modalBody');
    if (mb) { mb.innerHTML = bodyHTML; }
    const bd = document.getElementById('modalBackdrop');
    if (bd) bd.classList.add('show');
  }
}

async function confirmReject(requestId) {
  const reason = document.getElementById('rejectReasonInput')?.value?.trim() || '';
  closeModal();

  try {
    await AUTH.rejectRequest(requestId, reason);
    showAdminToast('거절 처리 완료', 'info');
    await renderRequestsTab(document.getElementById('adminTabContent'));
  } catch (err) {
    showAdminToast('거절 처리 실패: ' + err.message, 'error');
  }
}

/* ──────────────────────────────────────
   멤버 관리 탭
────────────────────────────────────── */
async function renderMembersTab(container) {
  container.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';

  try {
    const session = AUTH.getSession();
    let members = [];

    try {
      const res = await fetch('tables/team_members?limit=100');
      const json = await res.json();
      members = (json.data || []).filter(m => m.team_id === session.teamId || session.role === 'owner');
    } catch {
      members = [];
    }

    // State.players와 매핑
    const players = (typeof State !== 'undefined' ? State.players : []) || [];

    const roleGroups = {
      owner:   { label: '매니저',  icon: 'fa-shield-alt',         color: '#7B1818', members: [] },
      admin:   { label: '매니저',  icon: 'fa-shield-alt',         color: '#7B1818', members: [] },
      coach:   { label: '코치',   icon: 'fa-chalkboard-teacher', color: '#1a5ca8', members: [] },
      manager: { label: '매니저', icon: 'fa-clipboard-list',     color: '#c07a00', members: [] },
      player:  { label: '선수',   icon: 'fa-running',            color: '#1a8a4a', members: [] },
      staff:   { label: '스태프', icon: 'fa-user-cog',           color: '#555',    members: [] },
    };

    members.forEach(m => {
      if (roleGroups[m.role]) roleGroups[m.role].members.push(m);
      else roleGroups.staff.members.push(m);
    });

    // 선수 목록 (State.players 추가)
    if (players.length > 0 && members.length === 0) {
      roleGroups.player.members = players.map(p => ({
        id: p.id, user_id: p.id,
        display_name: p.full_name,
        role: 'player',
        jersey_number: p.jersey_number,
        position: p.primary_position,
        unit: p.unit,
        status: p.player_status
      }));
    }

    const totalCount = members.length || players.length;

    container.innerHTML = `
      <div class="members-panel">
        <div class="members-header">
          <div class="members-count">
            <i class="fas fa-users"></i> 총 <strong>${totalCount}</strong>명
          </div>
          <button class="admin-action-btn" onclick="copyInviteCode()">
            <i class="fas fa-link"></i> 초대 코드 복사
          </button>
        </div>

        ${Object.values(roleGroups).filter(g => g.members.length > 0).map(group => `
          <div class="member-group">
            <div class="member-group-header">
              <i class="fas ${group.icon}" style="color:${group.color}"></i>
              ${group.label} <span class="req-count">${group.members.length}</span>
            </div>
            <div class="member-list">
              ${group.members.map(m => renderMemberRow(m)).join('')}
            </div>
          </div>
        `).join('')}

        ${totalCount === 0 ? `
          <div class="empty-state">
            <i class="fas fa-users" style="font-size:36px;color:var(--gray-300);margin-bottom:10px"></i>
            <div style="font-weight:700;margin-bottom:4px">아직 멤버가 없습니다</div>
            <div style="font-size:12px;color:var(--gray-500)">가입 신청을 승인하면 멤버가 추가됩니다.</div>
          </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="error-state">로드 실패: ${err.message}</div>`;
  }
}

function renderMemberRow(member) {
  const statusColors = {
    active:         '#1a8a4a',
    inactive:       '#888',
    suspended:      '#c0392b',
    military_leave: '#c07a00',
  };
  const statusLabels = {
    active: '활동', inactive: '비활동', suspended: '정지', military_leave: '군입대'
  };
  const color = statusColors[member.status] || '#888';
  const statusLabel = statusLabels[member.status] || member.status || '활동';

  return `
    <div class="member-row">
      <div class="member-avatar" style="background:${color}20;color:${color}">
        ${(member.display_name || member.user_id || '?')[0].toUpperCase()}
      </div>
      <div class="member-row-info">
        <div class="member-row-name">${member.display_name || member.user_id || '이름 없음'}</div>
        <div class="member-row-meta">
          ${member.jersey_number ? `#${member.jersey_number} · ` : ''}
          ${member.position || ''} ${member.unit ? `(${member.unit})` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:${color};font-weight:700;background:${color}15;padding:2px 8px;border-radius:20px">${statusLabel}</span>
        <button class="member-edit-btn" onclick="openMemberEdit('${member.id}')">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `;
}

/* ──────────────────────────────────────
   멤버 편집 모달
────────────────────────────────────── */
function openMemberEdit(memberId) {
  const members = AdminState.teamMembers;
  const member = members.find(m => m.id === memberId) ||
    (typeof State !== 'undefined' ? State.players.find(p => p.id === memberId) : null);

  const roles = ['owner','admin','coach','manager','player','staff'];
  const roleLabels = { owner:'오너', admin:'어드민', coach:'코치', manager:'매니저', player:'선수', staff:'스태프' };

  const bodyHTML = `
    <div style="padding:8px 0">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:16px">
        멤버 편집 — ${member?.display_name || member?.full_name || '이름 없음'}
      </h3>
      <div class="form-group">
        <label class="form-label" style="font-size:12px">역할 변경</label>
        <select id="memberRoleSelect" class="form-control" style="font-size:13px">
          ${roles.map(r => '<option value="' + r + '"' + (member?.role===r?' selected':'') + '>' + roleLabels[r] + '</option>').join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-size:12px">상태</label>
        <select id="memberStatusSelect" class="form-control" style="font-size:13px">
          <option value="active" ${member?.status==='active'?'selected':''}>활동</option>
          <option value="inactive" ${member?.status==='inactive'?'selected':''}>비활동</option>
          <option value="suspended" ${member?.status==='suspended'?'selected':''}>정지</option>
          <option value="military_leave" ${member?.status==='military_leave'?'selected':''}>군입대</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-secondary" style="flex:1" onclick="closeModal()">취소</button>
        <button class="btn btn-primary" style="flex:1" onclick="saveMemberEdit('${memberId}')">
          <i class="fas fa-save"></i> 저장
        </button>
      </div>
    </div>
  `;
  if (typeof openModal === 'function') {
    openModal('멤버 편집', bodyHTML);
  } else {
    const mb = document.getElementById('modalBody');
    if (mb) { mb.innerHTML = bodyHTML; }
    const bd = document.getElementById('modalBackdrop');
    if (bd) bd.classList.add('show');
  }
}

async function saveMemberEdit(memberId) {
  const role   = document.getElementById('memberRoleSelect')?.value;
  const status = document.getElementById('memberStatusSelect')?.value;
  closeModal();

  try {
    await fetch(`tables/team_members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, status })
    });
    showAdminToast('멤버 정보가 업데이트되었습니다.', 'success');
    await renderMembersTab(document.getElementById('adminTabContent'));
  } catch (err) {
    showAdminToast('업데이트 실패: ' + err.message, 'error');
  }
}

/* ──────────────────────────────────────
   팀 설정 탭
────────────────────────────────────── */
async function renderTeamSettingsTab(container) {
  const session = AUTH.getSession();

  // 팀 코드 표시
  let teamCode = session.teamCode || '';
  let teamInfo = null;

  try {
    if (session.teamId) {
      const res = await fetch(`tables/teams/${session.teamId}`);
      if (res.ok) {
        teamInfo = await res.json();
        teamCode = teamInfo.team_code || teamCode;
      }
    }
  } catch {}

  const sportEmojis = {
    american_football: '🏈', flag_football: '🚩',
    soccer: '⚽', baseball: '⚾', basketball: '🏀', other: '🏅'
  };
  const sportEmoji = sportEmojis[teamInfo?.sport] || '🏅';

  container.innerHTML = `
    <div class="team-settings-panel">

      <!-- 팀 초대 코드 -->
      <div class="settings-section">
        <div class="settings-section-title">
          <i class="fas fa-link"></i> 팀 초대 코드
        </div>
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:12px">
          이 코드를 공유하면 팀에 가입 신청할 수 있습니다.
        </p>
        <div class="team-code-display" style="max-width:320px">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px">INVITE CODE</div>
            <div class="team-code-val" id="settingsTeamCode">${teamCode || '------'}</div>
          </div>
          <button class="copy-btn" onclick="copyAdminCode()"><i class="fas fa-copy"></i> 복사</button>
        </div>
      </div>

      <!-- 팀 정보 -->
      <div class="settings-section">
        <div class="settings-section-title">
          <i class="fas fa-shield-alt"></i> 팀 정보
        </div>
        <form id="teamSettingsForm" onsubmit="saveTeamSettings(event)">
          <div class="grid-2" style="gap:12px">
            <div class="form-group">
              <label class="form-label" style="font-size:12px">팀 이름</label>
              <input class="form-control" name="team_name" value="${teamInfo?.team_name || session.teamName || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:12px">연고지</label>
              <input class="form-control" name="city" value="${teamInfo?.city || ''}" placeholder="서울" />
            </div>
          </div>
          <div class="grid-2" style="gap:12px">
            <div class="form-group">
              <label class="form-label" style="font-size:12px">스포츠</label>
              <select class="form-control" name="sport">
                ${Object.entries(sportEmojis).map(([k,v]) => 
                  `<option value="${k}" ${teamInfo?.sport===k?'selected':''}>${v} ${k.replace('_',' ')}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:12px">시즌 연도</label>
              <input class="form-control" type="number" name="season_year" value="${teamInfo?.season_year || new Date().getFullYear()}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px">팀 소개</label>
            <textarea class="form-control" name="description" rows="2">${teamInfo?.description || ''}</textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:4px">
            <i class="fas fa-save"></i> 팀 정보 저장
          </button>
        </form>
      </div>

      <!-- 위험 구역 -->
      <div class="settings-section danger-zone">
        <div class="settings-section-title" style="color:var(--red)">
          <i class="fas fa-exclamation-triangle"></i> 위험 구역
        </div>
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:12px">
          아래 작업은 되돌릴 수 없습니다. 신중히 진행하세요.
        </p>
        <button class="btn" style="background:var(--red);color:#fff;font-size:13px" 
          onclick="confirmDeleteTeam()">
          <i class="fas fa-trash-alt"></i> 팀 해산
        </button>
      </div>
    </div>
  `;
}

async function saveTeamSettings(e) {
  e.preventDefault();
  const session = AUTH.getSession();
  if (!session.teamId) { showAdminToast('팀 ID가 없습니다', 'error'); return; }

  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch(`tables/teams/${session.teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('저장 실패');
    AUTH.setSession({ ...session, teamName: data.team_name });
    showAdminToast('팀 정보가 저장되었습니다.', 'success');
  } catch (err) {
    showAdminToast('저장 실패: ' + err.message, 'error');
  }
}

function confirmDeleteTeam() {
  const ok = confirm('정말로 팀을 해산하시겠습니까?\n이 작업은 되돌릴 수 없습니다.\n\n"확인"을 누르면 로그아웃 됩니다.');
  if (ok) {
    showAdminToast('팀 해산 기능은 실제 서비스에서 지원됩니다.', 'info');
  }
}

/* ──────────────────────────────────────
   유틸리티
────────────────────────────────────── */
function copyAdminCode() {
  const session = AUTH.getSession();
  const code = session.teamCode ||
    document.getElementById('settingsTeamCode')?.textContent ||
    document.getElementById('adminTeamCode')?.textContent || '';
  if (!code || code === '------') {
    showAdminToast('초대 코드가 없습니다', 'error');
    return;
  }
  navigator.clipboard.writeText(code)
    .then(() => showAdminToast('초대 코드 복사됨: ' + code, 'success'))
    .catch(() => showAdminToast('복사 실패 — 코드: ' + code, 'info'));
}

function copyInviteCode() { copyAdminCode(); }

function showAdminToast(msg, type = '') {
  // app.js의 showToast 사용 (있으면)
  if (typeof showToast === 'function') {
    showToast(msg, type === 'success' ? 'success' : type === 'error' ? 'error' : '');
    return;
  }
  // 없으면 기본 alert
  alert(msg);
}

/* ──────────────────────────────────────
   어드민 페이지 초기화 (app.js에서 호출)
────────────────────────────────────── */
async function afterRenderAdmin() {
  if (!AUTH.isOwnerOrAdmin()) return;
  // 기본 탭: 가입 신청
  const content = document.getElementById('adminTabContent');
  if (content) {
    await renderRequestsTab(content);
  }
}
