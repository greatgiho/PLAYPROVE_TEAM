/* ============================================================
   auth.js — Authentication & Session Management
   PlayProve Team ERP v3

   ▸ 실제 서비스에서는 Google OAuth / Apple Sign-In SDK 연동 필요
   ▸ 현재: localStorage 기반 데모 세션 + API DB 연동
   ============================================================ */

const AUTH = {
  /* ──────────────────────────────────────
     SESSION KEYS
  ────────────────────────────────────── */
  SESSION_KEY:     'pp_session_v3',
  ONBOARD_KEY:     'pp_onboard_draft',

  /* ──────────────────────────────────────
     ROLE 메타
  ────────────────────────────────────── */
  ROLE_META: {
    owner:   { label: '매니저',  icon: 'fa-shield-alt',           color: '#7B1818', canApprove: true,  viewMode: 'manager' },
    manager: { label: '매니저',  icon: 'fa-shield-alt',           color: '#7B1818', canApprove: true,  viewMode: 'manager' },
    coach:   { label: '코치',    icon: 'fa-chalkboard-teacher',   color: '#1a5ca8', canApprove: false, viewMode: 'coach'  },
    player:  { label: '선수',    icon: 'fa-running',              color: '#1a8a4a', canApprove: false, viewMode: 'player' },
    staff:   { label: '스태프',  icon: 'fa-user-cog',             color: '#555',    canApprove: false, viewMode: 'player' },
  },

  /* ──────────────────────────────────────
     세션 읽기 / 쓰기
  ────────────────────────────────────── */
  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  setSession(data) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      ...data,
      _savedAt: Date.now()
    }));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.ONBOARD_KEY);
  },

  isLoggedIn() {
    const s = this.getSession();
    if (!s) return false;
    // 7일 세션 유효
    return (Date.now() - (s._savedAt || 0)) < 7 * 24 * 60 * 60 * 1000;
  },

  /* ──────────────────────────────────────
     현재 세션의 역할·권한
  ────────────────────────────────────── */
  getRole() {
    return this.getSession()?.role || 'player';
  },

  getRoleMeta() {
    return this.ROLE_META[this.getRole()] || this.ROLE_META.player;
  },

  canApprove() {
    return this.getRoleMeta().canApprove;
  },

  getViewMode() {
    return this.getRoleMeta().viewMode;
  },

  isOwnerOrAdmin() {
    // 기존 'admin' 역할도 하위 호환 유지 (DB에 저장된 오래된 세션 대응)
    return ['owner', 'manager', 'admin'].includes(this.getRole());
  },

  /* ──────────────────────────────────────
     데모 로그인 (소셜 OAuth 시뮬레이션)
     실제: Google Sign-In / Apple Sign-In SDK 호출
  ────────────────────────────────────── */
  async demoLogin(provider, demoUserKey) {
    // demoUserKey: 'owner' | 'coach' | 'player' | 'new'
    const DEMO_USERS = {
      owner: {
        userId:      'user-admin-001',
        email:       'admin@seouldragonz.kr',
        displayName: '김주성 (Manager)',
        provider,
        role:        'owner',
        teamId:      'team-001',
        teamName:    '서울 드래곤즈',
        memberId:    'mem-001',
        status:      'active'
      },
      coach: {
        userId:      'user-coach-001',
        email:       'coach@seouldragonz.kr',
        displayName: '김철수 코치',
        provider,
        role:        'coach',
        teamId:      'team-001',
        teamName:    '서울 드래곤즈',
        memberId:    'mem-002',
        status:      'active'
      },
      player: {
        userId:      'user-player-001',
        email:       'player1@gmail.com',
        displayName: '박진우',
        provider,
        role:        'player',
        teamId:      'team-001',
        teamName:    '서울 드래곤즈',
        memberId:    'mem-003',
        status:      'active',
        playerId:    'player-007'   // State.players 연결 키
      },
      new: {
        userId:      'user-new-' + Date.now(),
        email:       'newuser@' + (provider === 'apple' ? 'icloud.com' : 'gmail.com'),
        displayName: provider === 'apple' ? '애플 신규 사용자' : '구글 신규 사용자',
        provider,
        role:        null,          // 팀 미가입
        teamId:      null,
        status:      'no_team'
      }
    };

    const user = DEMO_USERS[demoUserKey];
    this.setSession(user);
    return user;
  },

  /* ──────────────────────────────────────
     로그아웃
  ────────────────────────────────────── */
  logout() {
    this.clearSession();
    // index.html SPA 환경에서는 showScreen()으로 재정의됨
    // index_v2.html 단독 환경 fallback
    if (typeof showScreen === 'function') {
      showScreen('login');
      if (typeof loginShowStep === 'function') loginShowStep('stepSocial');
    } else {
      window.location.href = 'index.html';
    }
  },

  /* ──────────────────────────────────────
     페이지 가드 (비로그인 → login.html 리다이렉트)
  ────────────────────────────────────── */
  requireAuth() {
    if (!this.isLoggedIn()) {
      if (typeof showScreen === 'function') {
        showScreen('login');
      } else {
        window.location.href = 'index.html';
      }
      return false;
    }
    return true;
  },

  /* ──────────────────────────────────────
     팀 가입 신청 저장 (API)
  ────────────────────────────────────── */
  async submitJoinRequest(teamId, requestData) {
    const session = this.getSession();
    const payload = {
      team_id:           teamId,
      user_id:           session.userId,
      requested_role:    requestData.role,
      requested_position: requestData.position,
      requested_unit:    requestData.unit,
      jersey_number:     Number(requestData.jersey_number) || null,
      height_cm:         Number(requestData.height_cm) || null,
      weight_kg:         Number(requestData.weight_kg) || null,
      message:           requestData.message || '',
      status:            'pending',
      requested_at:      new Date().toISOString()
    };
    const res = await fetch('tables/join_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('신청 실패');
    return res.json();
  },

  /* ──────────────────────────────────────
     팀 신청 승인 (Admin/Owner 전용)
  ────────────────────────────────────── */
  async approveRequest(requestId, requestData) {
    const session = this.getSession();

    // 1. join_requests 업데이트
    await fetch(`tables/join_requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status:      'approved',
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString()
      })
    });

    // 2. team_members 생성
    const memberPayload = {
      team_id:      requestData.team_id,
      user_id:      requestData.user_id,
      role:         requestData.requested_role,
      jersey_number: requestData.jersey_number,
      position:     requestData.requested_position,
      unit:         requestData.requested_unit,
      height_cm:    requestData.height_cm,
      weight_kg:    requestData.weight_kg,
      join_year:    new Date().getFullYear(),
      status:       'active',
      joined_at:    new Date().toISOString()
    };
    const res = await fetch('tables/team_members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberPayload)
    });
    if (!res.ok) throw new Error('멤버 생성 실패');
    return res.json();
  },

  /* 팀 신청 거절 */
  async rejectRequest(requestId, reason) {
    const session = this.getSession();
    const res = await fetch(`tables/join_requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status:        'rejected',
        reviewed_by:   session.userId,
        reviewed_at:   new Date().toISOString(),
        reject_reason: reason || ''
      })
    });
    if (!res.ok) throw new Error('거절 처리 실패');
    return res.json();
  },

  /* 팀 생성 */
  async createTeam(teamData) {
    const session = this.getSession();
    const teamCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const teamPayload = {
      team_name:    teamData.team_name,
      team_code:    teamCode,
      sport:        teamData.sport || 'american_football',
      city:         teamData.city,
      founded_year: Number(teamData.founded_year) || new Date().getFullYear(),
      owner_user_id: session.userId,
      description:  teamData.description || '',
      is_public:    true,
      season_year:  new Date().getFullYear()
    };

    const teamRes = await fetch('tables/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamPayload)
    });
    if (!teamRes.ok) throw new Error('팀 생성 실패');
    const team = await teamRes.json();

    // 오너 멤버 자동 등록
    await fetch('tables/team_members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id:   team.id,
        user_id:   session.userId,
        role:      'owner',
        position:  'GM',
        unit:      'staff',
        join_year: new Date().getFullYear(),
        status:    'active',
        joined_at: new Date().toISOString()
      })
    });

    // 세션에 팀 정보 저장
    this.setSession({
      ...session,
      role:     'owner',
      teamId:   team.id,
      teamName: team.team_name,
      teamCode: team.team_code,
      status:   'active'
    });

    return { team, teamCode };
  }
};
