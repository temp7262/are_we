/* ============================================================
   header-info.js — Universal Header User Info Injector
   Include this script on EVERY student page to show
   the user name + BT ID in the header chip automatically.
   ============================================================ */
(function () {
    // Auto-inject CSS for the BT ID badge
    var style = document.createElement('style');
    style.textContent = [
        '.u-btid, .user-id {',
        '  font-size:10px; font-weight:600; color:rgba(255,255,255,.55);',
        '  letter-spacing:.3px; margin-top:1px; line-height:1;',
        '}',
        '.user-chip .user-info { display:flex; flex-direction:column; gap:1px; }',
        '.user-chip .u-name { line-height:1.2; }'
    ].join('\n');
    document.head.appendChild(style);
    document.addEventListener('DOMContentLoaded', function () {
        const raw = localStorage.getItem('user');
        if (!raw) return;
        let u;
        try { u = JSON.parse(raw); } catch (e) { return; }

        const name = u.name || 'Student';
        const btid = u.btid || u.studentId || '';
        const ini = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

        // ── Pattern 1: New-style header (.hdr / .u-av / .u-name) ──
        const uAv = document.getElementById('uAv');
        const uName = document.getElementById('uName');
        if (uAv) uAv.textContent = ini;
        if (uName) {
            uName.textContent = name;
            // Inject BT ID below name if not already present
            if (btid && !document.getElementById('uBtid')) {
                const idEl = document.createElement('div');
                idEl.id = 'uBtid';
                idEl.className = 'u-btid';
                idEl.textContent = btid;
                uName.parentNode.insertBefore(idEl, uName.nextSibling);
            }
        }

        // ── Pattern 2: Old-style header (.site-header / .user-avatar / .user-name-text) ──
        const userInitials = document.getElementById('userInitials');
        const userName = document.getElementById('userName');
        if (userInitials) userInitials.textContent = ini;
        if (userName) {
            userName.textContent = name;
            // Inject BT ID below name if not already present
            if (btid && !document.getElementById('userId')) {
                const idEl = document.createElement('div');
                idEl.id = 'userId';
                idEl.className = 'user-id';
                idEl.textContent = btid;
                userName.parentNode.insertBefore(idEl, userName.nextSibling);
            }
        }

        // ── Pattern 3: Home page already has userId ──
        const userId = document.getElementById('userId');
        if (userId && btid) userId.textContent = btid;

        // ── Pattern 4: Profile page (.hdrInitials / .hdrName) ──
        const hdrIni = document.getElementById('hdrInitials');
        const hdrName = document.getElementById('hdrName');
        if (hdrIni) hdrIni.textContent = ini;
        if (hdrName) {
            hdrName.textContent = name;
            if (btid && !document.getElementById('hdrBtid')) {
                const idEl = document.createElement('div');
                idEl.id = 'hdrBtid';
                idEl.className = 'u-btid';
                idEl.textContent = btid;
                hdrName.parentNode.insertBefore(idEl, hdrName.nextSibling);
            }
        }
    });
})();
