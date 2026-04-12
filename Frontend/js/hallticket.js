/* ================================================
   hallticket.js — Hall Ticket Application Logic
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
            if (res.user) {
                localStorage.setItem('user', JSON.stringify(res.user));
                fillProfile(res.user);
            }
        })
        .catch(() => { });
});

/* ── FILL PROFILE ───────────────────────────────── */
function fillProfile(u) {
    const name = u.name || u.full_name || 'Student';
    const btid = u.btid || u.student_id || '--';
    const branch = u.branch || u.department || '';
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent = name;
    document.getElementById('userId').textContent = btid;

    const branchEl = document.getElementById('sBranch');
    if (branchEl && !branchEl.value) branchEl.value = branch;
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
    errEl.classList.remove('show');

    if (file.size > maxMB * 1024 * 1024) {
        errEl.textContent = 'File too large.';
        errEl.classList.add('show');
        return;
    }
    if (types && !types.includes(file.type)) {
        errEl.textContent = 'Invalid file type.';
        errEl.classList.add('show');
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
        examType: document.getElementById('examType').value,
        semester: document.getElementById('semester').value,
        branch: document.getElementById('sBranch').value,
        acadYear: document.getElementById('academic-year').value.trim(),
        purpose: document.getElementById('purpose').value.trim()
    };

    if (!fields.examType || !fields.semester || !fields.branch) {
        alert('❌ Select Exam Type, Semester and Branch.');
        return;
    }

    if (!uploadedFiles['photo']) {
        alert('❌ Please upload a photograph.');
        return;
    }

    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.textContent = '⏳ Processing...';
    submitBtn.disabled = true;

    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const res = await authFetch(API_BASE + '/application/create', {
            method: 'POST',
            /* credentials:include removed — use JWT */
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                certificate_type: 'hallticket',
                admType: 'hallticket',
                branch: fields.branch,
                year: fields.semester,
                purpose: fields.examType + ': ' + fields.purpose,
                acYear: fields.acadYear,
                fullName: u.name || '',
                btid: u.btid || u.student_id || ''
            })
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.message);

        const appId = result.application_id;
        await uploadDocument(uploadedFiles['photo'], 'passport_photo', appId);

        document.getElementById('modalAppId').textContent = result.application_number;
        document.getElementById('successModal').classList.add('open');

    } catch (err) {
        alert('❌ Error: ' + err.message);
    } finally {
        submitBtn.textContent = '🎟️ Request Hall Ticket';
        submitBtn.disabled = false;
    }
}

function logout() { if(confirm("Logout?")) doLogout(); }
