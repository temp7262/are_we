/* ================================================
   bonafide.js — Bonafide Certificate Application Logic
   JDCOEM Digital Document Services Portal
   Connected to Backend API (Node.js/JWT)
   ================================================ */

// Smart API detection (works on Vercel, ngrok, localhost)
var API_BASE = (window.location.port === '3000')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';
const uploadedFiles = {};

function getAuthHeaders() {
  const token = localStorage.getItem('user_token');
  return { 'Authorization': 'Bearer ' + token };
}

/* ══════════════════════════════════════════════
   1. INIT
   ══════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function () {
    const raw = localStorage.getItem('user');
    if (!raw) { window.location.href = 'login.html'; return; }

    const u = JSON.parse(raw);
    fillProfile(u);

    // Sidebar and status indicators
    if (document.getElementById('dot-info')) document.getElementById('dot-info').classList.add('ok');
    
    const cb = document.getElementById('declCheck');
    if (cb) cb.addEventListener('change', function () { setDot('decl', cb.checked); });

    loadSidebarBadge();
});

/* ══════════════════════════════════════════════
   2. FILL PROFILE
   ══════════════════════════════════════════════ */
function fillProfile(u) {
    const name = u.name || u.full_name || u.btid || 'Student';
    const btid = u.btid || u.student_id || u.email || '--';
    const email = u.email || '--';
    const branch = u.branch || u.department || '';
    const year = u.year || u.current_year || '';

    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    if (document.getElementById('userInitials')) document.getElementById('userInitials').textContent = initials;
    if (document.getElementById('userName')) document.getElementById('userName').textContent = name;
    if (document.getElementById('userId')) document.getElementById('userId').textContent = btid;

    if (document.getElementById('sName')) document.getElementById('sName').textContent = name;
    if (document.getElementById('sBtid')) document.getElementById('sBtid').textContent = btid;
    if (document.getElementById('sEmail')) document.getElementById('sEmail').textContent = email;

    const branchEl = document.getElementById('sBranch');
    const yearEl = document.getElementById('sYear');
    if (branchEl && !branchEl.value) branchEl.value = branch;
    if (yearEl && !yearEl.value) yearEl.value = year;
}

/* ══════════════════════════════════════════════
   3. SIDEBAR BADGE
   ══════════════════════════════════════════════ */
function loadSidebarBadge() {
    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            const badge = document.querySelector('.nav-badge');
            if (badge && res.success) badge.textContent = res.data.length;
        })
        .catch(() => {});
}

/* ══════════════════════════════════════════════
   4. FILE HANDLING (DRAG & DROP)
   ══════════════════════════════════════════════ */
function onDragOver(e, id) { e.preventDefault(); document.getElementById('dz-' + id).classList.add('dragover'); }
function onDragLeave(id) { document.getElementById('dz-' + id).classList.remove('dragover'); }
function onDrop(e, id, maxMB, types) {
    e.preventDefault();
    onDragLeave(id);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0], id, maxMB, types);
}
function onFileInput(input, id, maxMB, types) {
    if (input.files[0]) processFile(input.files[0], id, maxMB, types);
}

function processFile(file, id, maxMB, types) {
    const errEl = document.getElementById('fe-' + id);
    if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }

    if (file.size > maxMB * 1024 * 1024) {
        if (errEl) { errEl.textContent = 'File too large (Max ' + maxMB + 'MB)'; errEl.classList.add('show'); }
        return;
    }
    
    uploadedFiles[id] = file;
    showPreview(id, file);
    markChecklist(id, true);
    updateReadiness();
}

function showPreview(id, file) {
    const dz = document.getElementById('dz-' + id);
    const dzd = document.getElementById('dzd-' + id);
    if (dz) dz.classList.add('has-file');
    if (dzd) dzd.style.display = 'none';

    if (id === 'photo') {
        const img = document.getElementById('pp-img-photo');
        const reader = new FileReader();
        reader.onload = e => { if (img) img.src = e.target.result; };
        reader.readAsDataURL(file);
        document.getElementById('pp-name-photo').textContent = file.name;
        document.getElementById('pp-photo').classList.add('show');
    } else {
        const row = document.getElementById('fp-' + id);
        document.getElementById('fpn-' + id).textContent = file.name;
        if (row) row.classList.add('show');
    }
}

function removeFile(id, e) {
    if (e) e.stopPropagation();
    delete uploadedFiles[id];
    const dz = document.getElementById('dz-' + id);
    if (dz) dz.classList.remove('has-file');
    const dzd = document.getElementById('dzd-' + id);
    if (dzd) dzd.style.display = '';
    
    const pp = document.getElementById('pp-' + id) || document.getElementById('fp-' + id);
    if (pp) pp.classList.remove('show');
    
    markChecklist(id, false);
    updateReadiness();
}

function markChecklist(id, done) {
    const item = document.getElementById('req-' + id);
    const check = document.getElementById('check-' + id);
    if (!item || !check) return;
    if (done) { item.classList.add('complete'); check.textContent = 'Done'; }
    else { item.classList.remove('complete'); check.textContent = ''; }
}

function setPurpose(text) {
    const p = document.getElementById('purpose');
    if (p) { p.value = text; onPurposeInput(); }
}
function onPurposeInput() {
    const v = document.getElementById('purpose').value;
    if (document.getElementById('charCount')) document.getElementById('charCount').textContent = v.length;
    setDot('purpose', v.trim().length >= 10);
}

function setDot(id, ok) {
    const d = document.getElementById('dot-' + id);
    if (d) d.classList.toggle('ok', !!ok);
}
function updateReadiness() {
    setDot('photo', !!uploadedFiles['photo']);
    setDot('fee', !!uploadedFiles['fee']);
}

/* ══════════════════════════════════════════════
   5. SUBMIT FORM (Atomic Multer)
   ══════════════════════════════════════════════ */
function submitForm() {
    const branch = document.getElementById('sBranch').value;
    const year = document.getElementById('sYear').value;
    const sem = document.getElementById('semester').value;
    const mobile = document.getElementById('mobile').value.trim();
    const parent = document.getElementById('parentName').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const decl = document.getElementById('declCheck').checked;

    if (!branch || !year || !sem || mobile.length !== 10 || !parent || !purpose || !decl || !uploadedFiles['photo'] || !uploadedFiles['fee']) {
        showAlert('Please fill all required fields, upload both documents, and accept the declaration.');
        return;
    }

    const submitBtn = document.querySelector('.btn-primary');
    const origLabel = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const fileData = new FormData();
    fileData.append('applicationType', 'Bonafide Certificate');
    fileData.append('purpose', purpose);

    const extraData = {
        branch, 
        current_year: year, 
        semester: sem, 
        mobile, 
        parent_name: parent,
        academic_year: document.getElementById('academic-year')?.value || '',
        admission_year: document.getElementById('admissionYear')?.value || '',
        category: document.getElementById('category')?.value || '',
        name: document.getElementById('sName').textContent,
        btid: document.getElementById('sBtid').textContent,
        email: document.getElementById('sEmail').textContent
    };
    fileData.append('extraData', JSON.stringify(extraData));

    // Append both files to proofDocs (Multer array)
    if (uploadedFiles['photo']) fileData.append('proofDocs', uploadedFiles['photo']);
    if (uploadedFiles['fee']) fileData.append('proofDocs', uploadedFiles['fee']);

    fetch(API_BASE + '/applications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fileData
    })
    .then(r => r.json())
    .then(res => {
        if (!res.success) throw new Error(res.message || 'Submission failed');
        
        document.getElementById('modalAppId').textContent = res.data.applicationId;
        document.getElementById('successModal').classList.add('open');
    })
    .catch(err => {
        showAlert(err.message || 'Network error. Please try again.');
    })
    .finally(() => {
        submitBtn.textContent = origLabel;
        submitBtn.disabled = false;
    });
}

function showAlert(msg) {
    const al = document.getElementById('formAlert');
    if (document.getElementById('formAlertMsg')) document.getElementById('formAlertMsg').textContent = msg;
    if (al) al.classList.add('show');
    al.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideAlert() {
    const al = document.getElementById('formAlert');
    if (al) al.classList.remove('show');
}

function toggleDecl(e) {
    // If the user clicked the checkbox directly, the browser handles the toggle.
    // We only need to manually toggle if they clicked the surrounding box/text.
    const cb = document.getElementById('declCheck');
    if (!cb) return;

    if (e && e.target === cb) {
        // Just sync the dot
        setDot('decl', cb.checked);
        return;
    }

    // Manually toggle and sync
    cb.checked = !cb.checked;
    setDot('decl', cb.checked);
}

function logout() {
    if (confirm('Logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}