/* ============================================================
   data.js — Local State & API Layer
   PlayProve Team ERP MVP
   ============================================================ */

const API = {
  async get(table, params = {}) {
    const qs = new URLSearchParams({page: 1, limit: 200, ...params}).toString();
    const res = await fetch(`tables/${table}?${qs}`);
    if (!res.ok) throw new Error('API Error');
    const json = await res.json();
    return json.data || [];
  },
  async getOne(table, id) {
    const res = await fetch(`tables/${table}/${id}`);
    if (!res.ok) throw new Error('Not Found');
    return res.json();
  },
  async post(table, data) {
    const res = await fetch(`tables/${table}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Create Failed');
    return res.json();
  },
  async put(table, id, data) {
    const res = await fetch(`tables/${table}/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Update Failed');
    return res.json();
  },
  async patch(table, id, data) {
    const res = await fetch(`tables/${table}/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Patch Failed');
    return res.json();
  },
  async del(table, id) {
    const res = await fetch(`tables/${table}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete Failed');
  }
};

/* ——— Position Catalog (Static) ——— */
const POSITIONS = {
  offense: [
    { code: 'QB', name: 'Quarterback', group: 'Backfield' },
    { code: 'RB', name: 'Running Back', group: 'Backfield' },
    { code: 'FB', name: 'Fullback', group: 'Backfield' },
    { code: 'WR', name: 'Wide Receiver', group: 'Skill' },
    { code: 'TE', name: 'Tight End', group: 'Skill' },
    { code: 'C',  name: 'Center', group: 'O-Line' },
    { code: 'G',  name: 'Guard', group: 'O-Line' },
    { code: 'T',  name: 'Tackle', group: 'O-Line' },
  ],
  defense: [
    { code: 'DE',  name: 'Defensive End', group: 'D-Line' },
    { code: 'DT',  name: 'Defensive Tackle', group: 'D-Line' },
    { code: 'NT',  name: 'Nose Tackle', group: 'D-Line' },
    { code: 'OLB', name: 'Outside Linebacker', group: 'LB' },
    { code: 'ILB', name: 'Inside Linebacker', group: 'LB' },
    { code: 'MLB', name: 'Middle Linebacker', group: 'LB' },
    { code: 'CB',  name: 'Cornerback', group: 'DB' },
    { code: 'NB',  name: 'Nickel Back', group: 'DB' },
    { code: 'FS',  name: 'Free Safety', group: 'DB' },
    { code: 'SS',  name: 'Strong Safety', group: 'DB' },
  ],
  special: [
    { code: 'K',  name: 'Kicker', group: 'Specialist' },
    { code: 'P',  name: 'Punter', group: 'Specialist' },
    { code: 'LS', name: 'Long Snapper', group: 'Specialist' },
    { code: 'KR', name: 'Kick Returner', group: 'Returner' },
    { code: 'PR', name: 'Punt Returner', group: 'Returner' },
  ]
};

const ALL_POSITIONS = [
  ...POSITIONS.offense,
  ...POSITIONS.defense,
  ...POSITIONS.special
];

function positionByCode(code) {
  return ALL_POSITIONS.find(p => p.code === code) || { code, name: code, group: '' };
}

/* ——— Label Helpers ——— */
function statusLabel(s) {
  const map = { active: '활성', injured: '부상', leave_absence: '휴학', military_leave: '군휴학' };
  return map[s] || s;
}
function statusBadge(s) {
  const cls = { active: 'badge-active', injured: 'badge-injured', leave_absence: 'badge-leave', military_leave: 'badge-military' };
  return `<span class="badge ${cls[s] || ''}">${statusLabel(s)}</span>`;
}
function unitBadge(u) {
  const cls = { offense: 'badge-offense', defense: 'badge-defense', special: 'badge-special' };
  const lbl = { offense: 'OFFENSE', defense: 'DEFENSE', special: 'SPECIAL' };
  return `<span class="badge ${cls[u] || ''}">${lbl[u] || u}</span>`;
}
function attBadge(s) {
  const cls = { attending: 'badge-attending', absent: 'badge-absent', undecided: 'badge-undecided' };
  const lbl = { attending: '참석', absent: '불참', undecided: '미정' };
  return `<span class="badge ${cls[s] || ''}">${lbl[s] || s}</span>`;
}
function duesBadge(s) {
  const cls = { paid: 'badge-paid', unpaid: 'badge-unpaid' };
  const lbl = { paid: '납부 완료', unpaid: '미납' };
  return `<span class="badge ${cls[s] || ''}">${lbl[s] || s}</span>`;
}
function eventTypeLabel(t) {
  const map = { practice: '훈련', game: '경기', meeting: '미팅', rehab: '재활' };
  return map[t] || t;
}
function eventTypeIcon(t) {
  const map = { practice: '🏈', game: '🏟️', meeting: '📋', rehab: '🩺' };
  return map[t] || '📅';
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
}
function formatDateFull(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}
function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  if (!name) return '?';
  return name.length >= 2 ? name.slice(-2) : name;
}

function playerAvatar(name, unit) {
  const color = { offense: '#7B1818', defense: '#1a5ca8', special: '#c07a00' };
  const bg = color[unit] || '#7B1818';
  return `<div class="player-avatar" style="background:${bg}">${initials(name)}</div>`;
}
