const API_BASE = "http://localhost:5000/api";
var allApps = [];
var filtered = [];

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
    // 1. Instant header from local cache
    const raw = localStorage.getItem('user');
    if(raw) {
        try {
            const u = JSON.parse(raw);
            renderHeader(u);
        } catch(e){}
    }
    
    // 2. Refresh session & Load apps
    fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderHeader(res.data);
            }
        });

    loadApplications();
});

function renderHeader(u) {
    if(!u) return;
    const name = u.name || 'Student';
    const ini = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    
    let av = document.getElementById('uAv');
    let nm = document.getElementById('uName');
    if(av) av.textContent = ini;
    if(nm) nm.textContent = name;
}

/* ══════════════════════════════════════════
   LOAD & TRANSFORM
══════════════════════════════════════════ */
function loadApplications() {
    const tb = document.getElementById('tbody');
    if(tb) tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#9ca3af;">⏳ Loading applications…</td></tr>';

    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && Array.isArray(res.data)) {
                allApps = res.data;
                filtered = [...allApps];
                renderTable(filtered);
                updateStats(allApps);
            } else {
                renderTable([]);
            }
        })
        .catch(err => {
            console.error("LoadApps error", err);
            renderTable([]);
        });
}

function renderTable(apps) {
    const tbody = document.getElementById('tbody');
    const empty = document.getElementById('emptyState');
    const wrap = document.getElementById('tableWrap');
    const vis = document.getElementById('visCnt');
    const tot = document.getElementById('totCnt');

    if(vis) vis.textContent = apps.length;
    if(tot) tot.textContent = allApps.length;

    if(!tbody) return;

    if(apps.length === 0) {
        if(empty) empty.style.display = 'block';
        if(wrap) wrap.style.display = 'none';
        tbody.innerHTML = '';
        return;
    }

    if(empty) empty.style.display = 'none';
    if(wrap) wrap.style.display = 'block';

    tbody.innerHTML = apps.map((app, i) => {
        const type = app.certificate_type || app.applicationType || 'Document';
        const date = new Date(app.created_at || app.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric'});
        const status = (app.status || 'pending').toLowerCase();
        
        return `
            <tr>
                <td><span class="app-id-badge">${app.application_number || ('APP-' + (app.id || app._id).substring(0,6).toUpperCase())}</span></td>
                <td><div class="doc-cell"><span class="doc-ico">📄</span><span class="doc-name">${type}</span></div></td>
                <td><span class="date-text">📅 ${date}</span></td>
                <td><span class="proc-text">⏱ 2-4 Days</span></td>
                <td>${statusPill(status)}</td>
                <td><div class="act-wrap">
                    <button class="act act-view" onclick="viewDetail('${app._id || app.id}')">🔍 View</button>
                    <button class="act act-track" onclick="window.location.href='track-status.html?id=${app._id || app.id}'">📍 Track</button>
                </div></td>
            </tr>
        `;
    }).join('');
}

function statusPill(s) {
    const map = {
        'pending': '<span class="pill pill-pending">🟡 Pending at Clerk</span>',
        'clerk_approved': '<span class="pill pill-verified">🔵 Clerk Verified</span>',
        'hod_approved': '<span class="pill pill-processing">🟣 HOD Approved</span>',
        'principal_approved': '<span class="pill pill-approved">🟢 Approved</span>',
        'approved': '<span class="pill pill-approved">🟢 Ready</span>',
        'rejected': '<span class="pill pill-rejected">🔴 Rejected</span>'
    };
    return map[s] || `<span class="pill">${s}</span>`;
}

function updateStats(apps) {
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
    const side = document.getElementById('sideChip');
    
    const pending = apps.filter(a => !['approved','principal_approved','rejected'].includes(a.status?.toLowerCase())).length;
    const approved = apps.filter(a => ['approved','principal_approved'].includes(a.status?.toLowerCase())).length;
    const rejected = apps.filter(a => a.status?.toLowerCase().includes('reject')).length;

    set('sumTotal', apps.length);
    set('sumPending', pending);
    set('sumApproved', approved);
    set('sumRejected', rejected);
    if(side) side.textContent = apps.length;
}

function applyFilters() {
    const q = document.getElementById('qSearch').value.toLowerCase();
    const s = document.getElementById('fStatus').value.toLowerCase();
    const t = document.getElementById('fType').value.toLowerCase();

    filtered = allApps.filter(a => {
        const matchQ = !q || (a.application_number?.toLowerCase().includes(q) || (a.certificate_type||'').toLowerCase().includes(q));
        const matchS = !s || (a.status||'').toLowerCase().includes(s);
        const matchT = !t || (a.certificate_type||'').toLowerCase().includes(t);
        return matchQ && matchS && matchT;
    });
    renderTable(filtered);
}

function clearFilters() {
    document.getElementById('qSearch').value = '';
    document.getElementById('fStatus').value = '';
    document.getElementById('fType').value = '';
    filtered = [...allApps];
    renderTable(filtered);
}

function logout() {
    if(confirm("Logout?")) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}