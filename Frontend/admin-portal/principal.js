/* ============================================================
   principal.js — Principal Dashboard (Node.js/JWT Version)
   ============================================================ */

const FILES_BASE = "http://localhost:5000/";

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token_principal');
  return { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
}

var session = null;
var currentAppId = null;
var ALL_APPS = [];
var priRemarks = '';

/* ── BOOT ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {
  var raw = localStorage.getItem('admin_user_principal');
  var token = localStorage.getItem('admin_token_principal');
  
  if (!raw || !token) { window.location.replace('index.html'); return; }
  try { session = JSON.parse(raw); } catch (e) { window.location.replace('index.html'); return; }

  set('hdr-av', (session.name || 'P')[0].toUpperCase());
  set('hdr-nm', session.name || 'Principal');
  set('hdr-sub', session.email);
  set('sb-role-name', 'Principal Dashboard');
  set('sb-role-email', session.email);

  ['modalDetail', 'modalSign', 'modalRejectConfirm'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { if (e.target === el) closeModal(id); });
  });

  loadApps();
  showSection('pending');
});

function handleAuthError() {
  localStorage.clear();
  window.location.replace('index.html');
}

/* ── LOAD ─────────────────────────────────────────────────── */
function loadApps() {
  loading('table-pending');

  fetch(API + '/applications/all', { headers: getAuthHeaders() })
    .then(r => {
      if (r.status === 401 || r.status === 403) handleAuthError();
      return r.json();
    })
    .then(res => {
      if (res.success && Array.isArray(res.data)) {
        ALL_APPS = res.data.map(normalize);
      } else {
        ALL_APPS = [];
      }
    })
    .finally(() => {
      refreshStats();
      renderTable('pending');
    });
}

function normalize(a) {
  var s = (a.status || 'pending').toLowerCase().trim();
  var map = {
    pending: 'pending_clerk',
    clerk_approved: 'pending_hod',
    hod_approved: 'pending_principal',
    principal_approved: 'approved',
    rejected: 'rejected'
  };
  var lbl = {
    pending_clerk: 'At Clerk',
    pending_hod: 'At HOD',
    pending_principal: 'Awaiting Principal',
    approved: 'Fully Approved',
    rejected: 'Rejected'
  };
  var st = map[s] || 'pending_clerk';
  return {
    id: a._id,
    appNumber: a.applicationId || 'JDCOEM/---',
    studentName: a.studentId?.name || 'Unknown',
    studentEmail: a.studentId?.email || '',
    btid: a.studentId?.btid || '',
    dept: a.studentId?.branch || 'N/A',
    year: a.studentId?.year || '',
    docTitle: a.applicationType || 'Document',
    purpose: a.purpose || '',
    submittedAt: a.createdAt,
    clerkRemarks: a.clerkReview?.comment || '',
    hodRemarks: a.hodReview?.comment || '',
    status: st,
    statusLabel: lbl[st] || st,
    files: a.uploadedProofs || []
  };
}

/* ── STATS ────────────────────────────────────────────────── */
function refreshStats() {
  var scope = ALL_APPS.filter(a => a.status !== 'pending_clerk' && a.status !== 'pending_hod');
  var p = scope.filter(a => a.status === 'pending_principal').length;
  var a = scope.filter(a => a.status === 'approved').length;
  var r = scope.filter(a => a.status === 'rejected').length;
  var t = scope.length;

  set('stat-total', t); set('sc-total', t);
  set('stat-pending', p); set('sc-pending', p);
  set('stat-approved', a); set('sc-approved', a);
  set('stat-rejected', r); set('sc-rejected', r);
  set('sb-pending-count', p > 0 ? String(p) : '');
}

/* ── SECTION ──────────────────────────────────────────────── */
function showSection(name) {
  ['pending', 'all', 'approved', 'rejected', 'stats'].forEach(s => {
    var e = document.getElementById('section-' + s);
    if (e) e.style.display = (s === name) ? '' : 'none';
  });
  renderTable(name);
}

/* ── TABLE ────────────────────────────────────────────────── */
function renderTable(type) {
  var el = document.getElementById('table-' + type);
  if (!el) return;

  var apps = ALL_APPS.slice();
  if (type === 'pending') apps = apps.filter(a => a.status === 'pending_principal');
  if (type === 'approved') apps = apps.filter(a => a.status === 'approved');
  if (type === 'rejected') apps = apps.filter(a => a.status === 'rejected');
  if (type === 'all') apps = apps.filter(a => a.status !== 'pending_clerk' && a.status !== 'pending_hod');

  if (!apps.length) {
    el.innerHTML = '<div class="empty-state"><h3>Nothing Here</h3></div>';
    return;
  }

  el.innerHTML =
    '<table class="app-table"><thead><tr>' +
    '<th>App ID</th><th>Student</th><th>Document</th><th>Status</th><th>Action</th>' +
    '</tr></thead><tbody>' +
    apps.map(a => `
      <tr>
        <td><strong>${esc(a.appNumber)}</strong></td>
        <td>${esc(a.studentName)}</td>
        <td>${esc(a.docTitle)}</td>
        <td><span class="badge ${badge(a.status)}">${esc(a.statusLabel)}</span></td>
        <td><button class="btn btn-sm" onclick="openDetail('${a.id}')">Review</button></td>
      </tr>
    `).join('') +
    '</tbody></table>';
}

/* ── DETAIL ───────────────────────────────────────────────── */
function openDetail(appId) {
  var app = ALL_APPS.find(a => a.id === appId);
  if (!app) return;
  currentAppId = appId;

  set('modal-app-id', app.appNumber);
  var sb = document.getElementById('modal-app-status');
  if (sb) sb.innerHTML = '<span class="badge ' + badge(app.status) + '">' + esc(app.statusLabel) + '</span>';

  var aa = document.getElementById('pri-action-area');
  if (aa) aa.style.display = (app.status === 'pending_principal') ? '' : 'none';

  var de = document.getElementById('modal-app-detail');
  if (de) de.innerHTML = buildDetail(app);
  openModal('modalDetail');
}

function buildDetail(app) {
  var html = `
    <div class="detail-grid">
      ${field('Student Name', app.studentName)}
      ${field('Student Email', app.studentEmail || '—')}
      ${field('BT ID', app.btid || '—')}
      ${field('Department / Branch', app.dept)}
      ${field('Year', app.year || '—')}
      ${field('Application Type', '📄 ' + app.docTitle)}
      ${field('App Number', app.appNumber)}
      ${field('Purpose', app.purpose || '—')}
      ${field('Submitted', fmtDate(app.submittedAt))}
    </div>
  `;

  if (app.clerkRemarks || app.hodRemarks) {
    html += '<div class="section-divider" style="margin-top:20px;">Previous Remarks</div>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">';
    
    if (app.clerkRemarks) {
      html += `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px;">
          <label style="display:block; font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:6px;">Clerk Remarks</label>
          <div style="font-size:13px; color:var(--text-2); line-height:1.5;">${esc(app.clerkRemarks)}</div>
        </div>
      `;
    }
    if (app.hodRemarks) {
      html += `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px;">
          <label style="display:block; font-size:11px; font-weight:700; color:#8b5cf6; text-transform:uppercase; margin-bottom:6px;">HOD Remarks</label>
          <div style="font-size:13px; color:var(--text-2); line-height:1.5;">${esc(app.hodRemarks)}</div>
        </div>
      `;
    }
    html += '</div>';
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

function dIcon(t) { return '📄'; }
function badge(s) { 
  if (s === 'pending') return 'badge-pending';
  if (s === 'clerk_approved') return 'badge-ok';
  if (s === 'hod_approved') return 'badge-hod';
  if (s === 'principal_approved') return 'badge-ok';
  return 'badge-pending';
}
function field(l, v) { return '<div class="detail-field"><div class="detail-lbl">' + esc(l) + '</div><div class="detail-val">' + (v || '—') + '</div></div>'; }

/* ── ACTIONS ──────────────────────────────────────────────── */
function priAction(type) {
  var r = (val('pri-remarks') || '').trim();
  if (!r) { alert('Remarks are mandatory'); return; }
  priRemarks = r;
  if (type === 'approve') {
    closeModal('modalDetail');
    openModal('modalSign');
  } else {
    closeModal('modalDetail');
    openModal('modalRejectConfirm');
  }
}

function executePrincipalApprove() {
  var app = ALL_APPS.find(a => a.id === currentAppId);
  fetch(API + '/review/principal', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId: app.appNumber, comment: priRemarks, action: 'approve' })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        toast('✅ Approved', 'ok');
        closeModal('modalSign');
        loadApps();
      } else {
        alert(res.message);
      }
    });
}

function executePrincipalReject() {
  var app = ALL_APPS.find(a => a.id === currentAppId);
  fetch(API + '/review/principal', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId: app.appNumber, comment: priRemarks, action: 'reject' })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        toast('❌ Rejected', 'err');
        closeModal('modalRejectConfirm');
        loadApps();
      } else {
        alert(res.message);
      }
    });
}

function logout() { localStorage.clear(); window.location.replace('index.html'); }
function openModal(id) { var e = document.getElementById(id); if (e) e.classList.add('show'); }
function closeModal(id) { var e = document.getElementById(id); if (e) e.classList.remove('show'); }
function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v || ''; }
function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
function loading(id) { var e = document.getElementById(id); if (e) e.innerHTML = '⏳ Loading…'; }
function toast(msg, type) { alert(msg); }
function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }