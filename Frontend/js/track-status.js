const API_BASE = "http://localhost:5000/api";
const FILES_BASE = "http://localhost:5000/";

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('user_token')
    };
}

/* ══════════════════════════════════════════
   INITIALIZATION
   ══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    const raw = localStorage.getItem('user');
    if(raw) {
        try {
            renderHeaders(JSON.parse(raw));
        } catch(e){}
    }
    
    fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderHeaders(res.data);
            }
        });

    loadRecentApps();
});

function renderHeaders(u) {
    if(!u) return;
    const name = u.name || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    set('uAv', initials);
    set('uName', name);
}

/* ══════════════════════════════════════════
   TRACKING CORE
   ══════════════════════════════════════════ */
function loadRecentApps() {
    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && Array.isArray(res.data)) {
                set('sideChip', res.data.length);
                renderQuickPicks(res.data);
                autoLoadFromUrl();
            }
        });
}

function renderQuickPicks(apps) {
    const qp = document.getElementById('quickPicks');
    if(!qp) return;
    qp.innerHTML = apps.slice(0, 3).map(app => `
        <button class="quick-chip" onclick="quickTrack('${app.applicationId}')" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.9); padding:7px 14px; border-radius:20px; cursor:pointer; font-size:12px; transition:all 0.2s;">
            ${app.applicationId}
        </button>
    `).join('');
}

function quickTrack(id) {
    document.getElementById('lookupInput').value = id;
    trackId(id);
}

function handleLookup() {
    const id = document.getElementById('lookupInput').value.trim();
    if(!id) return showToast("Enter Application ID");
    trackId(id);
}

function trackId(appId) {
    showToast("Finding application...");
    fetch(`${API_BASE}/applications/${encodeURIComponent(appId)}/status`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                renderAll(res.data);
            } else {
                showToast("Application ID not found");
            }
        });
}

function renderAll(app) {
    const status = (app.status || 'pending').toLowerCase();
    
    renderAlert(status);
    set('idDocName', app.applicationType || 'Document');
    set('idAppCode', app.applicationId);
    set('idDate', fmtDate(app.createdAt));
    set('idProc', status === 'principal_approved' ? 'Completed' : '3-5 Working Days');
    set('idStatus', statusLabel(status));
    set('idUpdated', fmtDate(app.updatedAt || app.createdAt));

    updateTimeline(status);
    set('ssCurStatus', statusReadable(status));
    set('ssUpdated', fmtDate(app.updatedAt || app.createdAt));
    set('ssAuthority', getAuthority(status));

    renderRemarks(app);
    renderFiles(app);
    renderActions(app);

    ['alertBanner', 'identityCard', 'trackerCard', 'statusSummaryCard', 'remarksCard', 'filesCard', 'actionsCard'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'block';
    });
}

/* ══════════════════════════════════════════
   UI HELPERS (Emoji-free)
   ══════════════════════════════════════════ */
function renderAlert(s) {
    const b = document.getElementById('alertBanner');
    const t = document.getElementById('abTitle');
    const m = document.getElementById('abMsg');
    b.classList.remove('ab-info', 'ab-approved', 'ab-rejected');
    
    if(s === 'rejected') {
        b.classList.add('ab-rejected'); t.textContent = "Application Rejected";
        m.textContent = "Your document request was declined. Please view remarks below for feedback.";
    } else if (s === 'principal_approved') {
        b.classList.add('ab-approved'); t.textContent = "Certificate Issued";
        m.textContent = "Your official document has been signed and is ready for download.";
    } else {
        b.classList.add('ab-info'); t.textContent = "Processing Application";
        m.textContent = `Your request is currently at the ${getAuthority(s)} stage.`;
    }
}

function updateTimeline(s) {
    const stages = ['pending', 'clerk_approved', 'hod_approved', 'principal_approved'];
    let idx = stages.indexOf(s);
    if (idx === -1) idx = (s === 'rejected' ? 1 : 0);

    // Progress bar fill %
    const pct = idx === 0 ? 10 : (idx === 1 ? 40 : (idx === 2 ? 75 : 100));
    const bar = document.getElementById('progFill');
    if (bar) bar.style.width = pct + '%';

    const steps = [
        { name: 'Submitted',          sub: 'Application received',      state: 'done'                                },
        { name: 'Admin Verified',     sub: 'Clerk verification',        state: idx >= 1 ? 'done' : (idx === 0 ? 'active' : 'todo') },
        { name: 'Academic Approval',  sub: 'HOD review',                state: idx >= 2 ? 'done' : (idx === 1 ? 'active' : 'todo') },
        { name: 'Final Issuance',     sub: 'Principal signed',          state: idx >= 3 ? 'done' : (idx === 2 ? 'active' : 'todo') }
    ];

    // ── Horizontal progress steps (desktop) ──────────────────────
    const progSteps = document.getElementById('progSteps');
    if (progSteps) {
        // Keep the fill bar (first child), rebuild the rest
        const fill = progSteps.querySelector('#progFill');
        progSteps.innerHTML = '';
        if (fill) progSteps.appendChild(fill);

        steps.forEach(st => {
            const div = document.createElement('div');
            div.className = 'prog-step';
            div.innerHTML = `
                <div class="ps-dot ${st.state}">
                    ${st.state === 'done' ? `<span class="ps-icon" style="color:#fff;font-size:20px;font-weight:700;">✓</span>` :
                      st.state === 'active' ? `<span class="ps-icon" style="font-size:12px;font-weight:700;color:#fff;">●</span>` :
                      `<span class="ps-icon" style="font-size:12px;color:var(--g400);">○</span>`}
                </div>
                <div class="ps-label">
                    <div class="ps-name ${st.state}">${st.name}</div>
                    <div class="ps-sub ${st.state}">${st.state === 'done' ? 'Completed' : (st.state === 'active' ? 'Current Stage' : 'Pending')}</div>
                </div>`;
            progSteps.appendChild(div);
        });
    }

    // ── Vertical timeline (mobile) ────────────────────────────────
    const tlVert = document.getElementById('timelineVert');
    if (tlVert) {
        tlVert.innerHTML = steps.map(st => `
            <div class="tv-row ${st.state}">
                <div class="tv-dot ${st.state}">
                    ${st.state === 'done' ? '✓' : (st.state === 'active' ? '●' : '')}
                </div>
                <div class="tv-cnt">
                    <div class="tv-name ${st.state}">${st.name}</div>
                    <div class="tv-sub ${st.state}">${st.sub} · ${st.state === 'done' ? 'Completed' : (st.state === 'active' ? 'In Progress' : 'Pending')}</div>
                </div>
            </div>
        `).join('');
    }
}


function renderRemarks(app) {
    const b = document.getElementById('remarksBody');
    if(!b) return;
    let html = '';
    if(app.clerkReview?.comment) html += `<div class="rk-bubble"><strong>Admin Clerk:</strong> ${esc(app.clerkReview.comment)}</div>`;
    if(app.hodReview?.comment) html += `<div class="rk-bubble"><strong>Dept Head:</strong> ${esc(app.hodReview.comment)}</div>`;
    if(app.principalReview?.comment) html += `<div class="rk-bubble"><strong>Principal:</strong> ${esc(app.principalReview.comment)}</div>`;
    if(!html) html = '<div style="color:var(--g400);font-size:13px;padding:10px;">No remarks available.</div>';
    b.innerHTML = html;
}

function renderFiles(app) {
    const b = document.getElementById('filesBody');
    if(!b || !app.uploadedProofs) return;
    if(app.uploadedProofs.length === 0) {
        b.innerHTML = '<div style="color:var(--g400);font-size:13px;padding:10px;">No uploads found.</div>';
        return;
    }
    b.innerHTML = app.uploadedProofs.map(f => `
        <div class="file-item" style="border-bottom:1px solid var(--g100); padding:10px 0; display:flex; justify-content:space-between;">
            <span style="font-size:13px; color:var(--g700);">${esc(f.documentName)}</span>
            <a href="${FILES_BASE}${f.fileUrl.replace(/\\/g,'/')}" target="_blank" style="font-size:12px; color:var(--info); text-decoration:none; font-weight:600;">View</a>
        </div>
    `).join('');
}

function renderActions(app) {
    const row = document.getElementById('actionsRow');
    if(!row) return;
    if(app.status === 'principal_approved') {
        row.innerHTML = `<button class="btn-primary" onclick="downloadPdf('${app.applicationId}')">Download Official Document</button>`;
    } else {
        row.innerHTML = `<button class="btn-outline" style="opacity:0.5; cursor:not-allowed;" disabled>Download Unavailable</button>`;
    }
}

function downloadPdf(id) {
    showToast("Preparing PDF...");
    fetch(`${API_BASE}/documents/application/${encodeURIComponent(id)}/download`, { headers: getAuthHeaders() })
    .then(r => { if(!r.ok) throw new Error(); return r.blob(); })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Document_${id.replace(/\//g,'_')}.pdf`;
        a.click();
    })
    .catch(() => showToast("Error generating document"));
}

/* ── UTILS ── */
function set(id, t) { const e = document.getElementById(id); if(e) e.textContent = t || ''; }
function esc(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) : '—'; }
function showToast(m) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
function logout() { localStorage.clear(); window.location.href = 'login.html'; }

function statusLabel(s) {
    const map = {
        'pending': '<span class="sp sp-pending">Awaiting Verification</span>',
        'clerk_approved': '<span class="sp sp-verified">Verified</span>',
        'hod_approved': '<span class="sp sp-processing">Academic Approved</span>',
        'principal_approved': '<span class="sp sp-approved">Issued</span>',
        'rejected': '<span class="sp sp-rejected">Rejected</span>'
    };
    return map[s] || s;
}

function statusReadable(s) {
    const map = {
        'pending': 'Initial Verification',
        'clerk_approved': 'Documents Verified',
        'hod_approved': 'Academic Approval Granted',
        'principal_approved': 'Finalized and Issued',
        'rejected': 'Application Rejected'
    };
    return map[s] || s;
}

function getAuthority(s) {
    if(s === 'pending') return "Admin Clerk";
    if(s === 'clerk_approved') return "HOD Department";
    if(s === 'hod_approved') return "Principal Office";
    return "Administrative Cell";
}

function autoLoadFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('id');
    if(id) {
        if(document.getElementById('lookupInput')) document.getElementById('lookupInput').value = id;
        trackId(id);
    }
}