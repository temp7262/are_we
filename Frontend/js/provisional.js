/* ================================================
   provisional.js — Provisional Certificate Logic
   JDCOEM Digital Document Services Portal
   Connected to Backend API
   ================================================ */

// API_BASE provided by config.js
const uploadedFiles = {};

/* ── INIT ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {
    const raw = localStorage.getItem('user');
    if (!raw) { window.location.href = 'login.html'; return; }

    fillProfile(JSON.parse(raw));

    authFetch(API_BASE + '/auth/me', { /* credentials:include removed — use JWT */})
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                fillProfile(res.data);
            }
        });
});

/* ── FILL PROFILE ───────────────────────────────── */
function fillProfile(u) {
    const name = u.name || u.full_name || 'Student';
    const btid = u.btid || u.student_id || '--';
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent = name;
    document.getElementById('userId').textContent = btid;
}

/* ── DRAG & DROP ────────────────────────────────── */
function onDragOver(e, id) {
    e.preventDefault();
    document.getElementById('dz-' + id).classList.add('dragover');
}
function onDragLeave(id) {
    document.getElementById('dz-' + id).classList.remove('dragover');
}
function onDrop(e, id, maxMB, types) {
    e.preventDefault();
    onDragLeave(id);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0], id, maxMB, types);
}
function onFileInput(input, id, maxMB, types) {
    if (input.files[0]) processFile(input.files[0], id, maxMB, types);
}

/* ── FILE PROCESSING ────────────────────────────── */
function processFile(file, id, maxMB, types) {
    const errEl = document.getElementById('fe-' + id);
    if (errEl) errEl.classList.remove('show');

    if (file.size > maxMB * 1024 * 1024) {
        alert('File size too large.');
        return;
    }

    uploadedFiles[id] = file;
    const dz = document.getElementById('dz-' + id);
    const dzd = document.getElementById('dzd-' + id);
    dz.classList.add('has-file');
    dzd.style.display = 'none';
}

/* ── UPLOAD HELPER ──────────────────────────────── */
async function uploadDocument(file, type, appId) {
    const fd = new FormData();
    fd.append('application_id', appId);
    fd.append('document_type', type);
    fd.append('file', file);

    const r = await authFetch(API_BASE + '/documents/upload', {
        method: 'POST',
        /* credentials:include removed — use JWT */
        body: fd
    });
    return r.json();
}

/* ── SUBMIT ─────────────────────────────────────── */
async function submitForm() {
    const fields = {
        passingMonth: document.getElementById('passingMonth').value,
        passingYear: document.getElementById('passingYear').value,
        cgpa: document.getElementById('resultPointer').value,
        grade: document.getElementById('grade').value,
        purpose: document.getElementById('purpose').value.trim()
    };

    if (!fields.passingMonth || !fields.passingYear || !fields.cgpa || !fields.grade) {
        alert('❌ Please complete all mandatory fields.');
        return;
    }

    if (!uploadedFiles['finalMarksheet']) {
        alert('❌ Please upload your Final Semester Marksheet.');
        return;
    }

    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.textContent = '⏳ Processing Request...';
    submitBtn.disabled = true;

    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const res = await authFetch(API_BASE + '/application/create', {
            method: 'POST',
            /* credentials:include removed — use JWT */
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                certificate_type: 'provisional',
                admType: 'provisional',
                branch: u.branch || u.department || 'B.Tech',
                year: 'Graduated',
                purpose: 'Passing Month: ' + fields.passingMonth + ' ' + fields.passingYear + ' | CGPA: ' + fields.cgpa + ' | ' + fields.purpose,
                acYear: fields.passingYear,
                fullName: u.name || '',
                btid: u.btid || u.student_id || ''
            })
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.message);

        const appId = result.application_id;
        await uploadDocument(uploadedFiles['finalMarksheet'], 'final_marksheet', appId);

        document.getElementById('modalAppId').textContent = result.application_number;
        document.getElementById('successModal').classList.add('open');

    } catch (err) {
        alert('❌ Error: ' + err.message);
    } finally {
        submitBtn.textContent = '🚀 Apply for Provisional';
        submitBtn.disabled = false;
    }
}

function logout() { if(confirm("Logout?")) doLogout(); }
