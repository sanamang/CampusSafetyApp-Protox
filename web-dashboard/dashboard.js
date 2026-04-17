const API = 'http://localhost:3000/api';
let token = localStorage.getItem('cs_token');
let currentUser = null;
let allAlerts = [];
let map = null;
let alertMarkers = {};
let officerMarkers = {};
let socket = null;
let chartInstance = null;

// ─── Auth ───────────────────────────────────────────────────────────────────

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('cs_token', token);
    showDashboard();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch(`${API}/auth/logout`, { method: 'POST', headers: authHeaders() }).catch(() => {});
  localStorage.removeItem('cs_token');
  token = null;
  currentUser = null;
  if (socket) socket.disconnect();
  document.getElementById('dashboard-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'flex';
});

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  if (res.status === 401) { localStorage.removeItem('cs_token'); location.reload(); }
  return res.json();
}

// ─── Init dashboard ──────────────────────────────────────────────────────────

async function showDashboard() {
  if (!currentUser) {
    const me = await apiFetch('/auth/me');
    currentUser = me.user;
  }
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  document.getElementById('user-info').textContent = currentUser?.name || currentUser?.email || '';

  initMap();
  initSocket();
  await loadAlerts();
  await loadOfficers();
  setupTabs();
  setupFilters();
}

// Auto-login if token stored
(async () => {
  if (token) {
    try {
      const me = await apiFetch('/auth/me');
      if (me.user) { currentUser = me.user; showDashboard(); }
    } catch { localStorage.removeItem('cs_token'); }
  }
})();

// ─── Map ─────────────────────────────────────────────────────────────────────

function initMap() {
  if (map) return;
  map = L.map('map').setView([37.7749, -122.4194], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
}

const ALERT_COLORS = { SOS: '#DC2626', Medical: '#2563EB', Fire: '#D97706', Suspicious: '#7C3AED' };

function alertIcon(type) {
  const color = ALERT_COLORS[type] || '#DC2626';
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 8px ${color}88"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const officerIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;border:3px solid #fff;font-size:10px;display:flex;align-items:center;justify-content:center">👮</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function placeAlertPin(alert) {
  if (alertMarkers[alert.id]) {
    alertMarkers[alert.id].remove();
  }
  if (alert.status === 'resolved') {
    delete alertMarkers[alert.id];
    return;
  }
  const marker = L.marker([alert.latitude, alert.longitude], { icon: alertIcon(alert.alert_type) })
    .addTo(map)
    .bindPopup(`
      <b>${alert.alert_type}</b><br>
      ${alert.student_name || 'Unknown student'}<br>
      Status: ${alert.status}<br>
      ${new Date(alert.created_at).toLocaleTimeString()}
    `);
  alertMarkers[alert.id] = marker;
}

function placeOfficerPin(data) {
  const { officer_id, latitude, longitude, name } = data;
  if (officerMarkers[officer_id]) officerMarkers[officer_id].remove();
  officerMarkers[officer_id] = L.marker([latitude, longitude], { icon: officerIcon })
    .addTo(map)
    .bindPopup(`<b>👮 ${name || 'Officer'}</b>`);
}

// ─── Socket ──────────────────────────────────────────────────────────────────

function initSocket() {
  if (socket) socket.disconnect();
  socket = io('http://localhost:3000', { auth: { token } });

  socket.on('alert:new', (alert) => {
    allAlerts.unshift(alert);
    placeAlertPin(alert);
    renderTable();
    updateStats();
    notify(`New ${alert.alert_type} alert!`);
  });

  socket.on('alert:updated', (updated) => {
    const idx = allAlerts.findIndex((a) => a.id === updated.id);
    if (idx !== -1) allAlerts[idx] = { ...allAlerts[idx], ...updated };
    placeAlertPin(updated);
    renderTable();
    updateStats();
  });

  socket.on('officer:location', (data) => {
    placeOfficerPin(data);
    updateOfficerSidebar(data);
  });
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

async function loadAlerts() {
  const data = await apiFetch('/alerts');
  allAlerts = data.alerts || [];
  allAlerts.forEach(placeAlertPin);
  renderTable();
  updateStats();
  renderChart();
}

function getFilteredAlerts() {
  const status = document.getElementById('filter-status')?.value || '';
  const type   = document.getElementById('filter-type')?.value || '';
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();

  return allAlerts.filter((a) => {
    if (status && a.status !== status) return false;
    if (type && a.alert_type !== type) return false;
    if (search && !(a.student_name || '').toLowerCase().includes(search) && !(a.student_email || '').toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderTable() {
  const tbody = document.getElementById('alerts-tbody');
  if (!tbody) return;
  const filtered = getFilteredAlerts();
  tbody.innerHTML = filtered.map((a) => `
    <tr>
      <td><span class="badge-type ${a.alert_type}">${a.alert_type}</span></td>
      <td>
        <div style="font-weight:600">${a.student_name || '—'}</div>
        <div style="color:#555;font-size:11px">${a.student_email || ''}</div>
      </td>
      <td style="color:#888;font-size:12px">${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}</td>
      <td><span class="badge-status ${a.status}">${a.status}</span></td>
      <td style="color:#555;font-size:12px">${new Date(a.created_at).toLocaleString()}</td>
      <td>
        ${a.status === 'pending' ? `<button class="action-btn ack" onclick="updateAlert('${a.id}','acknowledged')">Ack</button>` : ''}
        ${a.status !== 'resolved' ? `<button class="action-btn res" onclick="updateAlert('${a.id}','resolved')">Resolve</button>` : ''}
        <button class="action-btn del" onclick="deleteAlert('${a.id}')">Del</button>
      </td>
    </tr>
  `).join('');
}

window.updateAlert = async (id, status) => {
  await apiFetch(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
};

window.deleteAlert = async (id) => {
  if (!confirm('Delete this alert?')) return;
  await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
  allAlerts = allAlerts.filter((a) => a.id !== id);
  if (alertMarkers[id]) { alertMarkers[id].remove(); delete alertMarkers[id]; }
  renderTable();
  updateStats();
};

function updateStats() {
  const today = new Date().toDateString();
  document.getElementById('stat-active').textContent =
    allAlerts.filter((a) => a.status === 'pending').length;
  document.getElementById('stat-ack').textContent =
    allAlerts.filter((a) => a.status === 'acknowledged').length;
  document.getElementById('stat-resolved').textContent =
    allAlerts.filter((a) => a.status === 'resolved' && new Date(a.resolved_at || a.created_at).toDateString() === today).length;
}

// ─── Officers sidebar ────────────────────────────────────────────────────────

const seenOfficers = {};

async function loadOfficers() {
  const data = await apiFetch('/map/officers');
  (data.officers || []).forEach((o) => {
    placeOfficerPin(o);
    seenOfficers[o.officer_id] = { ...o, last_updated: o.last_updated };
    renderOfficerSidebar();
  });
}

function updateOfficerSidebar(data) {
  seenOfficers[data.officer_id] = { ...seenOfficers[data.officer_id], ...data, last_updated: new Date().toISOString() };
  renderOfficerSidebar();
}

function renderOfficerSidebar() {
  const el = document.getElementById('officers-list');
  const entries = Object.values(seenOfficers);
  if (!entries.length) { el.innerHTML = '<p style="color:#555;font-size:13px">No officers online</p>'; return; }
  el.innerHTML = entries.map((o) => {
    const ago = Math.round((Date.now() - new Date(o.last_updated).getTime()) / 1000);
    const online = ago < 300;
    return `<div class="officer-item">
      <div class="officer-dot ${online ? '' : 'offline'}"></div>
      <span class="officer-name">${o.name || 'Officer'}</span>
      <span class="officer-time">${ago < 60 ? `${ago}s ago` : `${Math.round(ago/60)}m ago`}</span>
    </div>`;
  }).join('');
}

// ─── Chart ───────────────────────────────────────────────────────────────────

function renderChart() {
  const ctx = document.getElementById('alertChart')?.getContext('2d');
  if (!ctx) return;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });

  const counts = days.map((label, i) => {
    const target = new Date();
    target.setDate(target.getDate() - (6 - i));
    const dateStr = target.toDateString();
    return allAlerts.filter((a) => new Date(a.created_at).toDateString() === dateStr).length;
  });

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Alerts',
        data: counts,
        backgroundColor: 'rgba(124,58,237,0.6)',
        borderColor: '#7C3AED',
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#2d2d5e' } },
        y: { ticks: { color: '#888', stepSize: 1 }, grid: { color: '#2d2d5e' }, beginAtZero: true },
      },
    },
  });
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) {
        panel.classList.add('active');
        if (btn.dataset.tab === 'map') setTimeout(() => map?.invalidateSize(), 50);
        if (btn.dataset.tab === 'chart') renderChart();
      }
    });
  });
}

function setupFilters() {
  ['filter-status', 'filter-type', 'filter-search'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderTable);
  });
}

// ─── Notify ──────────────────────────────────────────────────────────────────

function notify(msg) {
  if (Notification.permission === 'granted') {
    new Notification('Campus Safety Alert', { body: msg, icon: '' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}
