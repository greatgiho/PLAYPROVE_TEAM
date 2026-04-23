/* ============================================================
   notifications.js — 개인화 알림 시스템
   PlayProve Team ERP v2

   핵심 기능:
   1. 알림 패널 (종 버튼 클릭 → 슬라이드다운)
   2. 훈련/경기 2시간 전 알림 자동 스케줄링
   3. 미납 회비 알림
   4. 등급 변동 알림
   ============================================================ */

/* ——— 알림 유형별 설정 ——— */
const NOTIF_CONFIG = {
  training_reminder: { icon: '⏰', iconClass: 'training', color: 'var(--primary)' },
  game_reminder:     { icon: '🏟️', iconClass: 'game',     color: 'var(--green)' },
  dues_reminder:     { icon: '💰', iconClass: 'dues',     color: 'var(--red)' },
  injury_update:     { icon: '🩺', iconClass: 'training', color: 'var(--yellow)' },
  grade_up:          { icon: '🏆', iconClass: 'grade',    color: 'var(--yellow)' },
  notice:            { icon: '📋', iconClass: 'training', color: 'var(--blue)' }
};

/* ——— 알림 패널 토글 ——— */
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');

  // 외부 클릭 시 닫기
  if (panel.classList.contains('open')) {
    setTimeout(() => {
      document.addEventListener('click', closeNotifOutside, { once: true });
    }, 10);
  }
}

function closeNotifOutside(e) {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('notifPanel')?.classList.remove('open');
  }
}

/* ——— 알림 목록 렌더 ——— */
function renderNotifPanel(playerId) {
  const playerNotifs = State.notifications
    .filter(n => n.player_id === playerId)
    .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
    .slice(0, 10);

  const list = document.getElementById('notifList');
  if (!list) return;

  const unread = playerNotifs.filter(n => !n.is_read && n.is_read !== 'true').length;

  // Update dot
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  if (playerNotifs.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:28px 16px;color:var(--gray-500);font-size:13px">
      <div style="font-size:28px;margin-bottom:8px">🔔</div>
      <div>알림이 없습니다</div>
    </div>`;
    return;
  }

  list.innerHTML = playerNotifs.map(n => {
    const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG['notice'];
    const isUnread = !n.is_read && n.is_read !== 'true';
    const timeAgo = formatTimeAgo(n.scheduled_at);

    return `
      <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="markNotifRead('${n.id}')">
        <div class="notif-item-icon ${cfg.iconClass}">${cfg.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-body">${n.body?.slice(0, 80)}${(n.body?.length||0)>80?'…':''}</div>
          <div class="notif-item-time">${timeAgo}</div>
        </div>
        ${isUnread ? '<div class="notif-unread-dot"></div>' : ''}
      </div>
    `;
  }).join('');
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}일 전`;
  if (h > 0) return `${h}시간 전`;
  if (m > 0) return `${m}분 전`;
  return '방금';
}

async function markNotifRead(id) {
  const n = State.notifications.find(x => x.id === id);
  if (!n || n.is_read === true || n.is_read === 'true') return;
  try {
    await API.patch('notifications', id, { is_read: true });
    const idx = State.notifications.findIndex(x => x.id === id);
    if (idx >= 0) State.notifications[idx].is_read = true;
    const player = getCurrentPlayer();
    if (player) renderNotifPanel(player.id);
  } catch (e) {}
}

async function markAllRead() {
  const player = getCurrentPlayer();
  if (!player) return;
  const unread = State.notifications.filter(n =>
    n.player_id === player.id && (!n.is_read || n.is_read === 'false')
  );
  await Promise.all(unread.map(n => API.patch('notifications', n.id, { is_read: true }).catch(() => {})));
  unread.forEach(n => { n.is_read = true; });
  renderNotifPanel(player.id);
  showToast('모두 읽음 처리했습니다', 'success');
}

/* ============================================================
   알림 스케줄러 — 훈련/경기 2시간 전 자동 알림 생성
   ============================================================ */

/**
 * 특정 선수의 다가오는 일정을 기반으로 알림을 예약한다.
 * - 출결 상태가 'attending'인 일정에 대해 2시간 전 알림 생성
 * - 이미 생성된 알림이 있으면 중복 생성하지 않음
 */
async function scheduleRemindersForPlayer(playerId) {
  const player = State.players.find(p => p.id === playerId);
  if (!player) return;

  const upcomingEvents = State.events
    .filter(e => new Date(e.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 5);

  const created = [];

  for (const ev of upcomingEvents) {
    // 해당 이벤트에 참석 확정한 경우만
    const att = State.attendance.find(a => a.player_id === playerId && a.event_id === ev.id);
    if (!att || att.status !== 'attending') continue;

    // 이미 이 이벤트 알림이 있으면 스킵
    const existing = State.notifications.find(n =>
      n.player_id === playerId && n.event_id === ev.id &&
      (n.type === 'training_reminder' || n.type === 'game_reminder')
    );
    if (existing) continue;

    // 2시간 전 예약 시각
    const scheduledAt = new Date(new Date(ev.starts_at).getTime() - 2 * 60 * 60 * 1000);

    // 유니폼 색상 결정 (경기 유형에 따라)
    const uniformColor = ev.event_type === 'game'
      ? (ev.opponent ? '원정 화이트' : '홈 마룬')
      : '홈 마룬';

    // 준비물 (포지션 그룹별 맞춤)
    const posInfo = ALL_POSITIONS.find(p => p.code === player.primary_position);
    const defaultItems = ['번호 테이프', '마우스가드', '스파이크 클리트'];
    const posItems = {
      'O-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
      'D-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
      'LB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
      'DB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
      'Backfield': ['번호 테이프', '마우스가드', '장갑'],
      'Skill':  ['번호 테이프', '마우스가드', '장갑'],
      'Specialist': ['티', '킹 클리트', '마우스가드']
    };
    const items = posItems[posInfo?.group] || defaultItems;

    const meta = JSON.stringify({
      location: ev.location || '미정',
      uniform: uniformColor,
      items
    });

    const type = ev.event_type === 'game' ? 'game_reminder' : 'training_reminder';
    const emoji = ev.event_type === 'game' ? '⚾' : '⏰';
    const title = `${emoji} ${ev.event_type === 'game' ? '경기' : '훈련'} 2시간 전 알림`;
    const bodyLines = [
      `📍 장소: ${ev.location || '미정'}`,
      `👕 유니폼: ${uniformColor}`,
      `🎒 준비물: ${items.join(', ')}`
    ];
    if (ev.opponent) bodyLines.splice(1, 0, `🆚 상대: ${ev.opponent}`);
    const body = bodyLines.join('\n');

    try {
      const newNotif = await API.post('notifications', {
        player_id: playerId,
        type,
        title,
        body,
        event_id: ev.id,
        scheduled_at: scheduledAt.toISOString(),
        sent_at: null,
        is_read: false,
        is_sent: false,
        meta
      });
      State.notifications.push(newNotif);
      created.push(newNotif);
    } catch (e) {}
  }

  if (created.length > 0) {
    showToast(`${created.length}건의 알림이 예약되었습니다 🔔`, 'success');
    renderNotifPanel(playerId);
  }
  return created;
}

/**
 * 실시간 알림 체크 — 페이지 로드 시 + 1분마다 실행
 * 예약 시간이 지난 미발송 알림을 인-앱 알림으로 트리거
 */
function startNotifChecker() {
  checkPendingNotifs();
  setInterval(checkPendingNotifs, 60000); // 1분마다 체크
}

function checkPendingNotifs() {
  const now = new Date();
  const player = getCurrentPlayer();
  if (!player) return;

  const pending = State.notifications.filter(n =>
    n.player_id === player.id &&
    !n.is_sent && n.is_sent !== 'true' &&
    n.scheduled_at && new Date(n.scheduled_at) <= now
  );

  pending.forEach(async (n) => {
    // 인앱 토스트로 알림 표시
    showToast(`🔔 ${n.title}`, 'success');
    try {
      await API.patch('notifications', n.id, { is_sent: true, sent_at: new Date().toISOString() });
      n.is_sent = true;
    } catch(e) {}
  });

  if (pending.length > 0) {
    renderNotifPanel(player.id);
  }
}

/* ============================================================
   알림 설정 페이지 렌더 (My Page 내 탭)
   ============================================================ */
function renderNotifSettings(playerId) {
  const player = State.players.find(p => p.id === playerId);
  if (!player) return '';

  const posInfo = ALL_POSITIONS.find(p => p.code === player.primary_position);

  const upcomingWithAtt = State.events
    .filter(e => new Date(e.starts_at) > new Date())
    .map(ev => ({
      event: ev,
      att: State.attendance.find(a => a.player_id === playerId && a.event_id === ev.id),
      existingNotif: State.notifications.find(n =>
        n.player_id === playerId && n.event_id === ev.id &&
        (n.type === 'training_reminder' || n.type === 'game_reminder')
      )
    }))
    .filter(x => x.att?.status === 'attending')
    .sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at));

  const posItems = {
    'O-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
    'D-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
    'LB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
    'DB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
    'Backfield': ['번호 테이프', '마우스가드', '장갑'],
    'Skill':  ['번호 테이프', '마우스가드', '장갑'],
    'Specialist': ['티', '킹 클리트', '마우스가드']
  };
  const myItems = posItems[posInfo?.group] || ['번호 테이프', '마우스가드', '스파이크 클리트'];

  return `
    <div style="margin-bottom:20px">
      <div style="font-size:15px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:8px">
        <i class="fas fa-bell" style="color:var(--primary)"></i> 개인화 알림 스케줄
      </div>
      <div style="font-size:12px;color:var(--gray-500);margin-bottom:16px">
        참석 확정한 일정 기준 · 훈련/경기 2시간 전 자동 발송
      </div>

      <!-- 내 포지션 맞춤 준비물 -->
      <div style="background:var(--primary-fade);border-radius:10px;padding:14px 16px;margin-bottom:16px;border-left:3px solid var(--primary)">
        <div style="font-size:12px;font-weight:800;color:var(--primary);margin-bottom:8px">
          ${player.primary_position} (${posInfo?.group||''}) 기본 준비물
        </div>
        <div class="notif-meta-chips">
          ${myItems.map(item => `<span class="notif-chip item"><i class="fas fa-check-circle"></i>${item}</span>`).join('')}
        </div>
      </div>

      ${upcomingWithAtt.length === 0
        ? `<div class="empty-state" style="padding:30px 0"><i class="fas fa-calendar-check" style="opacity:.3"></i><p>참석 확정된 다가오는 일정이 없습니다</p></div>`
        : upcomingWithAtt.map(({ event: ev, existingNotif: notif }) => {
            const schedTime = new Date(new Date(ev.starts_at).getTime() - 2 * 3600000);
            const uniformColor = ev.event_type === 'game' ? '원정 화이트' : '홈 마룬';
            const meta = notif?.meta ? (() => { try { return JSON.parse(notif.meta); } catch(e) { return {}; } })() : {};

            return `
              <div class="notif-schedule-card">
                <div class="notif-schedule-icon" style="background:${ev.event_type==='game'?'var(--green-bg)':'var(--primary-fade)'}">
                  ${eventTypeIcon(ev.event_type)}
                </div>
                <div class="notif-schedule-content">
                  <div class="notif-schedule-title">${ev.title}</div>
                  <div class="notif-schedule-time">
                    <i class="fas fa-clock"></i> ${formatDateTime(ev.starts_at)} &nbsp;|&nbsp;
                    <i class="fas fa-bell"></i> 알림: ${schedTime.toLocaleString('ko-KR', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div class="notif-meta-chips" style="margin-top:6px">
                    <span class="notif-chip location"><i class="fas fa-map-marker-alt"></i>${ev.location||'미정'}</span>
                    <span class="notif-chip uniform"><i class="fas fa-tshirt"></i>${meta.uniform||uniformColor}</span>
                    ${myItems.map(item => `<span class="notif-chip item">${item}</span>`).join('')}
                  </div>
                </div>
                <div>
                  ${notif
                    ? `<span class="badge badge-active" style="white-space:nowrap"><i class="fas fa-check"></i> 예약됨</span>`
                    : `<button class="btn btn-sm btn-primary" onclick="scheduleSingleReminder('${playerId}','${ev.id}')">예약</button>`
                  }
                </div>
              </div>
            `;
          }).join('')}

      ${upcomingWithAtt.length > 0 ? `
        <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="scheduleRemindersForPlayer('${playerId}')">
          <i class="fas fa-bell"></i> 모든 예정 일정 알림 예약
        </button>
      ` : ''}
    </div>
  `;
}

async function scheduleSingleReminder(playerId, eventId) {
  const player = State.players.find(p => p.id === playerId);
  const ev = State.events.find(e => e.id === eventId);
  if (!player || !ev) return;

  const posInfo = ALL_POSITIONS.find(p => p.code === player.primary_position);
  const posItems = {
    'O-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
    'D-Line': ['번호 테이프', '암패드', '스파이크 클리트'],
    'LB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
    'DB':     ['번호 테이프', '마우스가드', '스파이크 클리트'],
    'Backfield': ['번호 테이프', '마우스가드', '장갑'],
    'Skill':  ['번호 테이프', '마우스가드', '장갑'],
    'Specialist': ['티', '킹 클리트', '마우스가드']
  };
  const items = posItems[posInfo?.group] || ['번호 테이프', '마우스가드', '스파이크 클리트'];
  const uniformColor = ev.event_type === 'game' ? '원정 화이트' : '홈 마룬';
  const scheduledAt = new Date(new Date(ev.starts_at).getTime() - 2 * 60 * 60 * 1000);
  const type = ev.event_type === 'game' ? 'game_reminder' : 'training_reminder';

  try {
    const newNotif = await API.post('notifications', {
      player_id: playerId, type,
      title: `${type === 'game_reminder' ? '⚾' : '⏰'} ${ev.event_type==='game'?'경기':'훈련'} 2시간 전 알림`,
      body: `📍 장소: ${ev.location||'미정'}\n👕 유니폼: ${uniformColor}\n🎒 준비물: ${items.join(', ')}`,
      event_id: ev.id,
      scheduled_at: scheduledAt.toISOString(),
      is_read: false, is_sent: false,
      meta: JSON.stringify({ location: ev.location||'미정', uniform: uniformColor, items })
    });
    State.notifications.push(newNotif);
    showToast('알림이 예약되었습니다 🔔', 'success');
    navigate('mypage');
  } catch (err) {
    showToast('예약 실패: ' + err.message, 'error');
  }
}
