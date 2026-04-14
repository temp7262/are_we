// Smart API detection (works on Vercel, ngrok, localhost)
var API_BASE = (window.location.port === '3000')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';
var ALL_NOTIFS = [];

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
    
    // 2. Refresh session & Load notifications
    fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderHeader(res.data);
            }
        });

    loadNotifications();
});

function renderHeader(u) {
    if(!u) return;
    const name = u.name || 'Student';
    const ini = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    
    document.getElementById('uAv').textContent = ini;
    document.getElementById('uName').textContent = name;
}

/* ══════════════════════════════════════════
   NOTIFICATIONS LOGIC (Simplified)
══════════════════════════════════════════ */
function loadNotifications() {
    const list = document.getElementById('notifList');
    if(list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Loading notifications…</div>';

    // Note: If you don't have a dedicated notification table yet, we show application status as notifications
    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if(res.success && Array.isArray(res.data)) {
                ALL_NOTIFS = res.data.map(app => ({
                    id: app._id || app.id,
                    title: 'Application Update',
                    msg: `Your request for ${app.applicationType} is currently: ${app.status?.replace('_',' ')}`,
                    time: new Date(app.updatedAt || app.createdAt).toLocaleString(),
                    cat: 'document',
                    read: false
                }));
                renderNotifs(ALL_NOTIFS);
                updateCounts(ALL_NOTIFS);
            } else {
                renderNotifs([]);
            }
        });
}

function renderNotifs(notifs) {
    const list = document.getElementById('notifList');
    const empty = document.getElementById('emptyState');
    
    if(!list) return;
    if(notifs.length === 0) {
        empty.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    empty.style.display = 'none';
    list.innerHTML = notifs.map(n => `
        <div class="notif-card unread">
            <div class="notif-icon">📄</div>
            <div class="notif-content">
                <div class="notif-title">${n.title}</div>
                <div class="notif-msg">${n.msg}</div>
                <div class="notif-footer">
                    <div class="notif-time">${n.time}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCounts(notifs) {
    const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent = v; };
    const unread = notifs.filter(n => !n.read).length;
    set('statUnread', unread);
    set('statTotal', notifs.length);
    set('bellBadge', unread);
    set('sideChip', unread);
    set('tc-all', notifs.length);
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}