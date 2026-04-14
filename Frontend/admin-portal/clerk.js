/* ============================================================
   clerk.js — Clerk Dashboard (Node.js/JWT Version)
   ============================================================ */

var FILES_BASE = window.location.origin + '/';

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token_clerk');
  return { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
}

var session = null;
var currentAppId = null;
var ALL_APPS = [];

/* ── INIT ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {
  var raw = localStorage.getItem('admin_user_clerk');
  var token = localStorage.getItem('admin_token_clerk');
  
  if (!raw || !token) { window.location.replace('index.html'); return; }
  try { session = JSON.parse(raw); } catch (e) { window.location.replace('index.html'); return; }

  set('hdr-av', (session.name || 'A')[0].toUpperCase());
  set('hdr-nm', session.name || 'Clerk');
  set('hdr-sub', session.email);
  set('sb-role-name', 'Clerk Dashboard');
  set('sb-role-email', session.email);

  ['modalDetail', 'modalConfirm'].forEach(function (id) {
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

function downloadApp(app) {
    toast('⬇️ Preparing download…');
    fetch(API + '/documents/application/' + encodeURIComponent(app.id) + '/download', {
        headers: getAuthHeaders()
    })
    .then(function (r) { 
      if (r.status === 401 || r.status === 403) handleAuthError();
      return r.json(); 
    })
    .then(function (res) {
      if (res.success && res.url) {
        window.open(res.url, '_blank');
      } else {
        toast('❌ Download failed.', 'err');
      }
    })
    .catch(function (err) {
      console.error('Download error:', err);
      toast('❌ Download failed.', 'err');
    });
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
    pending: 'pending',
    clerk_approved: 'clerk_approved',
    hod_approved: 'hod_approved',
    principal_approved: 'approved',
    rejected: 'rejected'
  };
  var lbl = {
    pending: 'Pending at Clerk',
    clerk_approved: 'Forwarded to HOD',
    hod_approved: 'Forwarded to Principal',
    approved: 'Fully Approved',
    rejected: 'Rejected'
  };
  var st = map[s] || 'pending';
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
    files: a.uploadedProofs || []
  };
}

/* ── STATS ────────────────────────────────────────────────── */
function stats() {
  var p = ALL_APPS.filter(function (a) { return a.status === 'pending'; }).length;
  var a = ALL_APPS.filter(function (a) {
    return a.status === 'clerk_approved' || a.status === 'hod_approved' || a.status === 'approved';
  }).length;
  var r = ALL_APPS.filter(function (a) { return a.status === 'rejected'; }).length;
  var t = ALL_APPS.length;
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
  document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
  document.querySelectorAll('.nav-link').forEach(function (l) {
    if ((l.getAttribute('onclick') || '').indexOf("'" + name + "'") > -1) l.classList.add('active');
  });
  renderTable(name);
}

/* ── TABLE RENDERER ───────────────────────────────────────── */
function renderTable(type) {
  var el = document.getElementById('table-' + type);
  if (!el) return;

  var apps = ALL_APPS.slice();
  if (type === 'pending') apps = apps.filter(function (a) { return a.status === 'pending'; });
  if (type === 'approved') apps = apps.filter(function (a) {
    return a.status === 'clerk_approved' || a.status === 'hod_approved' || a.status === 'approved';
  });
  if (type === 'rejected') apps = apps.filter(function (a) { return a.status === 'rejected'; });

  var q = (val('search-' + type) || '').toLowerCase();
  if (q) apps = apps.filter(function (a) {
    return (a.name + a.appNo + a.dtitle + a.email + a.btid).toLowerCase().indexOf(q) > -1;
  });

  if (!apps.length) {
    el.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-ico">📭</div>' +
      '<h3>Nothing Here</h3>' +
      '<p>' + (type === 'pending' ? 'No pending applications. All caught up! 🎉' : 'No applications found.') + '</p>' +
      '</div>';
    return;
  }

  el.innerHTML =
    '<table class="app-table"><thead><tr>' +
    '<th>App ID</th><th>Student</th><th>Document</th>' +
    '<th>Submitted</th><th>Status</th><th>Action</th>' +
    '</tr></thead><tbody>' +
    apps.map(function (a) {
      return '<tr>' +
        '<td><strong style="font-family:monospace;font-size:12px;">' + esc(a.appNo) + '</strong></td>' +
        '<td>' +
        '<div style="font-weight:600;">' + esc(a.name) + '</div>' +
        '<div style="font-size:11px;color:var(--text-3);">' + esc(a.email) + '</div>' +
        (a.dept ? '<div style="font-size:11px;color:var(--text-3);">' + esc(a.dept) + (a.year ? ' · Yr ' + a.year : '') + '</div>' : '') +
        '</td>' +
        '<td>' +
        '<div style="font-weight:600;">' + dIcon(a.dtype) + ' ' + esc(a.dtitle) + '</div>' +
        (a.purpose ? '<div style="font-size:11px;color:var(--text-3);">' + esc(a.purpose.substring(0, 50)) + '</div>' : '') +
        '</td>' +
        '<td style="font-size:12px;">' + fmtDate(a.date) + '</td>' +
        '<td><span class="badge ' + badge(a.status) + '">' + esc(a.label) + '</span></td>' +
        '<td><button class="btn btn-primary btn-sm" onclick="openDetail(\'' + a.id + '\')">' +
        (a.status === 'pending' ? '📂 Review' : '👁 View') +
        '</button></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table>';
}

/* ── OPEN DETAIL MODAL ────────────────────────────────────── */
function openDetail(appId) {
  var app = ALL_APPS.find(function (a) { return a.id === appId; });
  if (!app) return;
  currentAppId = appId;

  set('modal-app-id', app.appNo);
  var sb = document.getElementById('modal-app-status');
  if (sb) sb.innerHTML = '<span class="badge ' + badge(app.status) + '">' + esc(app.label) + '</span>';

  var aa = document.getElementById('clerk-action-area');
  if (aa) aa.style.display = app.status === 'pending' ? '' : 'none';

  var rd = document.getElementById('clerk-remarks');
  if (rd) rd.value = '';

  var det = document.getElementById('modal-app-detail');
  if (det) det.innerHTML = buildDetail(app);
  openModal('modalDetail');
}

/* ── BUILD DETAIL HTML ────────────────────────────────────── */
function buildDetail(app) {
  var html =
    '<div class="detail-grid">' +
    field('Student Name', app.name) +
    field('Student Email', app.email || '—') +
    field('Department', app.dept) +
    field('Year', app.year || '—') +
    field('Document', dIcon(app.dtype) + ' ' + app.dtitle) +
    field('App Number', app.appNo) +
    field('Purpose', app.purpose || '—') +
    field('Submitted', fmtDate(app.date)) +
    '</div>';

  if (app.cremarks) {
    html +=
      '<div class="section-divider" style="margin-top:16px;">Previous Remarks</div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;">' + esc(app.cremarks) + '</div>';
  }

  html += '<div class="section-divider" style="margin-top:16px;">📎 Student Uploaded Documents</div>';
  if (!app.files || app.files.length === 0) {
    html += '<div style="padding:15px;text-align:center;color:var(--text-3);background:var(--surface);border-radius:8px;">📂 No documents uploaded.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    app.files.forEach(function (f) {
      const fileName = f.documentName || 'Proof Document';
      const fileUrl = FILES_BASE + f.fileUrl.replace(/\\/g, '/');
      html += `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">📄</span>
            <div style="font-size:13px; font-weight:500; color:var(--text-1);">${esc(fileName)}</div>
          </div>
          <a href="${fileUrl}" target="_blank" class="btn btn-sm" style="background:#2563eb; color:#fff; text-decoration:none; padding:5px 12px; border-radius:6px; font-weight:600; font-size:12px;">View File</a>
        </div>
      `;
    });
    html += '</div>';
  }
  return html;
}

function field(l, v) { return '<div class="detail-field"><div class="detail-lbl">' + esc(l) + '</div><div class="detail-val">' + (v || '—') + '</div></div>'; }

/* ── CLERK ACTIONS ────────────────────────────────────────── */
function clerkAction(type) {
  var remarks = (val('clerk-remarks') || '').trim();
  if (!remarks) {
    toast('⚠️ Please write remarks.', 'warn');
    return;
  }
  var ok = type === 'approve';
  set('conf-ico', ok ? '✅' : '❌');
  set('conf-title', ok ? 'Forward to HOD?' : 'Reject Application?');
  var btn = document.getElementById('conf-btn');
  if (btn) {
    btn.dataset.type = type;
    btn.dataset.remarks = remarks;
  }
  closeModal('modalDetail');
  openModal('modalConfirm');
}

function executeAction() {
  var btn = document.getElementById('conf-btn');
  var type = btn ? btn.dataset.type : null;
  var rmks = btn ? btn.dataset.remarks : '';
  if (!currentAppId || !type) return;

  var app = ALL_APPS.find(function (a) { return a.id === currentAppId; });

  fetch(API + '/review/clerk', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId: app.appNo, comment: rmks, action: type })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        toast('✅ Action recorded.', 'ok');
        closeModal('modalConfirm');
        loadAll();
      } else {
        toast('❌ Failed: ' + res.message, 'err');
      }
    });
}

/* ── LOGOUT ───────────────────────────────────────────────── */
function logout() {
  localStorage.clear();
  window.location.replace('index.html');
}

/* ── UTILS ────────────────────────────────────────────────── */
function openModal(id) { var e = document.getElementById(id); if (e) e.classList.add('show'); }
function closeModal(id) { var e = document.getElementById(id); if (e) e.classList.remove('show'); }
function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v || ''; }
function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
function loading(id) { var e = document.getElementById(id); if (e) e.innerHTML = '<div style="text-align:center;padding:50px;">⏳ Loading…</div>'; }
function toast(msg, type) { alert(msg); }
function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }
function dIcon(t) { return '📄'; }
function docTitle(t) { return t || 'Document'; }
function badge(s) { return s === 'pending' ? 'badge-pending' : 'badge-ok'; }