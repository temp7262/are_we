/* ============================================================
   download.js — Student Downloads Page
   Full backend connection, emoji-free, professional output
   ============================================================ */

const API_BASE = "http://localhost:5000/api";

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('user_token')
    };
}

/* ══════════════════════════════════════════
   INITIALIZATION
   ══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    // Instantly populate from cache
    const raw = localStorage.getItem('user');
    if (raw) {
        try {
            const u = JSON.parse(raw);
            renderHeader(u);
            renderStudentStrip(u);
        } catch (e) {}
    }

    // Refresh session from server
    fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderHeader(res.data);
                renderStudentStrip(res.data);
            } else {
                // Token expired — redirect to login
                window.location.href = 'login.html';
            }
        })
        .catch(() => {});

    loadApprovedDocuments();
});

/* ══════════════════════════════════════════
   HEADER & STUDENT STRIP
   ══════════════════════════════════════════ */
function renderHeader(u) {
    if (!u) return;
    const name = u.name || 'Student';
    const ini = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    set('uAv', ini);
    set('uName', name);
}

function renderStudentStrip(u) {
    const name = u.name || 'Student';
    const ini = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    set('stuAv', ini);
    set('stuName', name);
    set('stuBtid', u.btid || u.studentId || '—');
    set('stuBranch', u.branch || 'JDCOEM');
    set('stuYear', u.year || 'N/A');
}

/* ══════════════════════════════════════════
   LOAD APPROVED DOCUMENTS FROM BACKEND
   ══════════════════════════════════════════ */
function loadApprovedDocuments() {
    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            hide('loadingState');

            if (res.success && Array.isArray(res.data)) {
                // Sidebar chip — total applications
                set('sideChip', res.data.length);

                // Filter only fully approved
                const approved = res.data.filter(a =>
                    ['approved', 'principal_approved'].includes((a.status || '').toLowerCase())
                );

                // Pending count for the empty-state note
                const pending = res.data.filter(a =>
                    !['approved', 'principal_approved', 'rejected'].includes((a.status || '').toLowerCase())
                );

                updateStats(res.data, approved);
                renderDownloads(approved, pending);
            } else {
                hide('loadingState');
                renderDownloads([], []);
            }
        })
        .catch(() => {
            hide('loadingState');
            renderDownloads([], []);
        });
}

/* ══════════════════════════════════════════
   RENDER DOCUMENT CARDS
   ══════════════════════════════════════════ */
function renderDownloads(docs, pending) {
    const list    = document.getElementById('docCardsList');
    const empty   = document.getElementById('emptyState');
    const section = document.getElementById('docCardsSection');
    const strip   = document.getElementById('stuStrip');
    const pendingNote = document.getElementById('esPendingNote');

    if (docs.length === 0) {
        show('emptyState');
        hide('docCardsSection');
        hide('stuStrip');
        if (pending && pending.length > 0 && pendingNote) {
            pendingNote.style.display = 'flex';
            set('esPendingText', `You have ${pending.length} pending application${pending.length > 1 ? 's' : ''} — check back soon!`);
        }
        return;
    }

    hide('emptyState');
    show('docCardsSection');
    if (strip) strip.style.display = 'flex';

    // Update student strip with latest approved doc
    const latest = docs[0];
    set('siDocName', latest.applicationType || 'Document');
    set('siApproved', fmtDate(latest.updatedAt || latest.createdAt));

    // Render document cards
    list.innerHTML = docs.map(doc => `
        <div class="doc-card fu" style="margin-bottom:14px;">
            <div class="dc-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
            </div>
            <div class="dc-info">
                <div class="dc-name">${esc(doc.applicationType || 'Document')}</div>
                <div class="dc-meta">
                    App ID: <strong>${esc(doc.applicationId)}</strong>
                    &nbsp;&middot;&nbsp;
                    Approved: ${fmtDate(doc.updatedAt || doc.createdAt)}
                    &nbsp;&middot;&nbsp;
                    <span style="color:var(--success);font-weight:600;">Issued</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
                <button class="dc-btn" onclick="downloadPdf('${esc(doc.applicationId)}')">Download PDF</button>
                <a href="track-status.html?id=${encodeURIComponent(doc.applicationId)}"
                   style="padding:10px 16px;border:1.5px solid var(--g300);border-radius:8px;font-size:13px;font-weight:600;color:var(--g600);text-decoration:none;display:inline-flex;align-items:center;">
                   Track
                </a>
            </div>
        </div>
    `).join('');
}

/* ══════════════════════════════════════════
   STATS
   ══════════════════════════════════════════ */
function updateStats(all, approved) {
    set('statIssued', approved.length);
    set('statDownloads', approved.length);
    set('issuedCount', `${approved.length} document${approved.length !== 1 ? 's' : ''}`);
}

/* ══════════════════════════════════════════
   DOWNLOAD PDF
   ══════════════════════════════════════════ */
function downloadPdf(appId) {
    showToast("Preparing download...");
    fetch(`${API_BASE}/documents/application/${encodeURIComponent(appId)}/download`, {
        headers: getAuthHeaders()
    })
    .then(r => {
        if (!r.ok) throw new Error('Not ready');
        return r.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${appId.replace(/\//g, '_')}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Download started");
    })
    .catch(() => showToast("Document is still being processed. Please try again later."));
}

/* ══════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════ */
function set(id, v) {
    const e = document.getElementById(id);
    if (e) e.textContent = v != null ? v : '';
}
function show(id) { const e = document.getElementById(id); if (e) e.style.display = 'block'; }
function hide(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
function esc(s) { return (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
function showToast(m) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}