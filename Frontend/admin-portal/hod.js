/* ============================================================
   hod.js — HOD Dashboard (Node.js/JWT Version)
   ============================================================ */

var FILES_BASE = window.location.origin + '/';

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token_hod');
  return { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
}

var session = null;
var currentAppId = null;
var ALL_APPS = [];
var hodRemarks = '';

/* ── INIT ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {
  var raw = localStorage.getItem('admin_user_hod');
  var token = localStorage.getItem('admin_token_hod');
  
  if (!raw || !token) { window.location.replace('index.html'); return; }
  try { session = JSON.parse(raw); } catch (e) { window.location.replace('index.html'); return; }

  set('hdr-av', (session.name || 'H')[0].toUpperCase());
  set('hdr-nm', session.name || 'HOD');
  set('hdr-sub', session.email);
  set('sb-role-name', 'HOD Dashboard');
  set('sb-role-email', session.email);

  ['modalDetail', 'modalSign', 'modalRejectConfirm'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { if (e.target === el) closeModal(id); });
  });

  loadAll();
  showSection('pending');
});

function handleAuthError() {
  localStorage.clear();
  window.location.replace('index.html');
}

/* ── LOAD ALL APPLICATIONS ────────────────────────────────── */
function loadAll() {
  loading('table-pending');

  fetch(API + '/applications/all', { headers: getAuthHeaders() })
    .then(function (r) { 
      if (r.status === 401 || r.status === 403) handleAuthError();
      return r.json(); 
    })
    .then(function (res) {
      if (res.success && Array.isArray(res.data)) {
        ALL_APPS = res.data.map(norm);
        console.log('[HOD Debug] Loaded Apps:', ALL_APPS);
      } else {
        ALL_APPS = [];
      }
    })
    .catch(function (err) {
      console.error('Load error:', err);
      toast('❌ Could not load applications.', 'err');
      ALL_APPS = [];
    })
    .finally(function () {
      stats();
      renderTable('pending');
    });
}

/* ── NORMALIZE backend row ────────────────────────────────── */
function norm(a) {
  var s = (a.status || 'pending').toLowerCase().trim();
  var map = {
    pending: 'pending_clerk',
    clerk_approved: 'pending_hod',
    hod_approved: 'approved_hod',
    principal_approved: 'approved_final',
    rejected: 'rejected'
  };
  var lbl = {
    pending_clerk: 'At Clerk',
    pending_hod: 'Awaiting HOD',
    approved_hod: 'At Principal',
    approved_final: 'Fully Approved',
    rejected: 'Rejected'
  };
  var st = map[s] || 'pending_clerk';
  return {
    id: a._id,
    appNo: a.applicationId || 'JDCOEM/---',
    name: a.studentId?.name || 'Unknown',
    email: a.studentId?.email || '',
    btid: a.studentId?.btid || '',
    dept: a.studentId?.branch || 'N/A',
    year: a.studentId?.year || '',
    dtype: (a.applicationType || '').toLowerCase(),
    dtitle: docTitle(a.applicationType || ''),
    purpose: a.purpose || '',
    status: st,
    label: lbl[st] || st,
    date: a.createdAt || '',
    cremarks: a.clerkReview?.comment || '',
    hremarks: a.hodReview?.comment || '',
    files: a.uploadedProofs || []
  };
}

/* ── STATS ────────────────────────────────────────────────── */
function stats() {
  var scope = ALL_APPS.filter(a => a.status !== 'pending_clerk');
  var p = scope.filter(a => a.status === 'pending_hod').length;
  var a = scope.filter(a => a.status === 'approved_hod' || a.status === 'approved_final').length;
  var r = scope.filter(a => a.status === 'rejected').length;
  var t = scope.length;
  set('stat-total', t); set('sc-total', t);
  set('stat-pending', p); set('sc-pending', p);
  set('stat-approved', a); set('sc-approved', a);
  set('stat-rejected', r); set('sc-rejected', r);
  set('sb-pending-count', p > 0 ? p : '');
}

/* ── SECTION SWITCHER ─────────────────────────────────────── */
function showSection(name) {
  ['pending', 'all', 'approved', 'rejected', 'stats'].forEach(function (s) {
    var el = document.getElementById('section-' + s);
    if (el) el.style.display = s === name ? '' : 'none';
  });
  renderTable(name);
}

/* ── TABLE RENDERER ───────────────────────────────────────── */
function renderTable(type) {
  var el = document.getElementById('table-' + type);
  if (!el) return;

  var apps = ALL_APPS.slice();
  if (type === 'pending') apps = apps.filter(a => a.status === 'pending_hod');
  if (type === 'approved') apps = apps.filter(a => a.status === 'approved_hod' || a.status === 'approved_final');
  if (type === 'rejected') apps = apps.filter(a => a.status === 'rejected');
  if (type === 'all') apps = apps.filter(a => a.status !== 'pending_clerk');

  if (!apps.length) {
    el.innerHTML = '<div class="empty-state"><h3>Nothing Here</h3></div>';
    return;
  }

  el.innerHTML =
    '<table class="app-table"><thead><tr>' +
    '<th>App ID</th><th>Student</th><th>Document</th><th>Date</th><th>Status</th><th>Action</th>' +
    '</tr></thead><tbody>' +
    apps.map(function (a) {
      return '<tr>' +
        '<td><strong>' + esc(a.appNo) + '</strong></td>' +
        '<td>' + esc(a.name) + '</td>' +
        '<td>' + esc(a.dtitle) + '</td>' +
        '<td>' + fmtDate(a.date) + '</td>' +
        '<td><span class="badge ' + badge(a.status) + '">' + esc(a.label) + '</span></td>' +
        '<td><button class="btn btn-sm" onclick="openDetail(\'' + a.id + '\')">Review</button></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table>';
}

/* ── DETAIL MODAL ────────────────────────────────────── */
function openDetail(appId) {
  var app = ALL_APPS.find(a => a.id === appId);
  if (!app) return;
  currentAppId = appId;

  set('modal-app-id', app.appNo);
  var sb = document.getElementById('modal-app-status');
  if (sb) sb.innerHTML = '<span class="badge ' + badge(app.status) + '">' + esc(app.label) + '</span>';

  var aa = document.getElementById('hod-action-area');
  if (aa) aa.style.display = (app.status === 'pending_hod') ? '' : 'none';

  var det = document.getElementById('modal-app-detail');
  if (det) det.innerHTML = buildDetail(app);
  openModal('modalDetail');
}

function buildDetail(app) {
  var html = `
    <div class="detail-grid">
      ${field('Student Name', app.name)}
      ${field('Student Email', app.email || '—')}
      ${field('Department / Branch', app.dept)}
      ${field('Year', app.year || '—')}
      ${field('Application Type', '📄 ' + app.dtitle)}
      ${field('App Number', app.appNo)}
      ${field('Purpose', app.purpose || '—')}
      ${field('Submitted', fmtDate(app.date))}
    </div>
  `;

  if (app.cremarks) {
    html += `
      <div class="section-divider" style="margin-top:20px;">Previous Remarks</div>
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px;">
        <label style="display:block; font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:6px;">Clerk Remarks</label>
        <div style="font-size:13px; color:var(--text-2); line-height:1.5;">${esc(app.cremarks)}</div>
      </div>
    `;
  }

  html += `
    <div class="section-divider" style="margin-top:20px;">📎 Student Uploaded Documents</div>
    <div style="display:flex; flex-direction:column; gap:10px;">
  `;

  if (!app.files || app.files.length === 0) {
    html += '<div style="padding:20px; text-align:center; color:var(--text-3); background:var(--surface); border-radius:10px;">📂 No documents uploaded.</div>';
  } else {
    app.files.forEach(f => {
      const fileName = f.documentName || 'Proof Document';
      const fileUrl = FILES_BASE + f.fileUrl.replace(/\\/g, '/');
      html += `
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:20px;">📄</span>
            <div style="font-size:13px; font-weight:600; color:var(--text-1);">${esc(fileName)}</div>
          </div>
          <a href="${fileUrl}" target="_blank" class="btn btn-sm" style="background:var(--info); color:#fff; text-decoration:none; padding:6px 14px; border-radius:8px; font-weight:600; font-size:12px;">View File</a>
        </div>
      `;
    });
  }

  html += `
    </div>
  `;

  return html;
}

function field(l, v) { return '<div><b>' + esc(l) + ':</b> ' + esc(v) + '</div>'; }

/* ── HOD ACTIONS ────────────────────────────────────────── */
function hodAction(type) {
  var remarks = (val('hod-remarks') || '').trim();
  if (!remarks) { alert('Remarks are mandatory'); return; }
  hodRemarks = remarks;

  if (type === 'approve') {
    closeModal('modalDetail');
    openModal('modalSign');
  } else {
    closeModal('modalDetail');
    openModal('modalRejectConfirm');
  }
}

function executeHODApprove() {
  var app = ALL_APPS.find(a => a.id === currentAppId);
  fetch(API + '/review/hod', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId: app.appNo, comment: hodRemarks, action: 'approve' })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        toast('✅ Approved', 'ok');
        closeModal('modalSign');
        loadAll();
      } else {
        alert(res.message);
      }
    });
}

function executeHODReject() {
  var app = ALL_APPS.find(a => a.id === currentAppId);
  fetch(API + '/review/hod', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId: app.appNo, comment: hodRemarks, action: 'reject' })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        toast('❌ Rejected', 'err');
        closeModal('modalRejectConfirm');
        loadAll();
      } else {
        alert(res.message);
      }
    });
}

/* ── LOGOUT ───────────────────────────────────────────────── */
function logout() { localStorage.clear(); window.location.replace('index.html'); }

/* ── UTILS ────────────────────────────────────────────────── */
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v || ''; }
function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
function loading(id) { var e = document.getElementById(id); if (e) e.innerHTML = '⏳ Loading…'; }
function toast(msg, type) { alert(msg); }
function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }
function dIcon(t) { return '📄'; }
function docTitle(t) { return t || 'Document'; }
function badge(s) { 
  if (s === 'pending' || s === 'pending_clerk') return 'badge-pending';
  if (s === 'clerk_approved') return 'badge-ok';
  if (s === 'hod_approved') return 'badge-hod';
  if (s === 'principal_approved') return 'badge-ok';
  return 'badge-pending';
}
function field(l, v) { return '<div class="detail-field"><div class="detail-lbl">' + esc(l) + '</div><div class="detail-val">' + (v || '—') + '</div></div>'; }