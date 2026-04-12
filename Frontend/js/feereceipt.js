/* ================================================
   feereceipt.js — Fee Receipt Application
   JDCOEM Digital Document Services Portal
   Connected to Backend API (Node.js/JWT)
   ================================================ */

const API_BASE = "http://localhost:5000/api";
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

    fillProfile(JSON.parse(raw));
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
   4. DRAG & DROP + FILE HANDLING
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

    const dz = document.getElementById('dz-' + id);
    const dzd = document.getElementById('dzd-' + id);
    if (dz) dz.classList.add('has-file');
    if (dzd) dzd.style.display = 'none';

    const row = document.getElementById('fp-' + id);
    if (row) {
        const fpnEl = document.getElementById('fpn-' + id);
        if (fpnEl) fpnEl.textContent = file.name.length > 30 ? file.name.substring(0, 28) + '...' : file.name;
        row.classList.add('show');
    }
}

function removeFile(id, e) {
    if (e) e.stopPropagation();
    delete uploadedFiles[id];
    const dz = document.getElementById('dz-' + id);
    if (dz) dz.classList.remove('has-file');
    const dzd = document.getElementById('dzd-' + id);
    if (dzd) dzd.style.display = '';
    const row = document.getElementById('fp-' + id);
    if (row) row.classList.remove('show');
}

/* ══════════════════════════════════════════════
   5. DECLARATION
══════════════════════════════════════════════ */
function toggleDecl(e) {
    if (e && e.target && e.target.id === 'declCheck') return;
    const cb = document.getElementById('declCheck');
    if (cb) cb.checked = !cb.checked;
}

/* ══════════════════════════════════════════════
   6. SUBMIT FORM — Atomic Multer (same as character.js)
══════════════════════════════════════════════ */
async function submitForm() {
    const branch = document.getElementById('sBranch').value;
    const year = document.getElementById('sYear').value;
    const feeType = document.getElementById('feeType').value;
    const acadYear = document.getElementById('academic-year')?.value?.trim() || '';
    const transactionId = document.getElementById('transactionId').value.trim();
    const amount = document.getElementById('paidAmount').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const decl = document.getElementById('declCheck').checked;

    // Validate
    if (!branch || !year || !feeType || !transactionId || !amount || !uploadedFiles['paymentProof'] || !decl) {
        showAlert('Please fill all required fields, upload payment proof, and accept the declaration.');
        return;
    }
    if (isNaN(amount) || +amount <= 0) {
        showAlert('Please enter a valid amount paid.');
        return;
    }

    const submitBtn = document.querySelector('.btn-primary');
    const origLabel = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('applicationType', 'Fee Receipt');
        formData.append('purpose', feeType + (purpose ? ': ' + purpose : ''));

        const extraData = {
            branch,
            current_year: year,
            fee_type: feeType,
            academic_year: acadYear,
            transaction_id: transactionId,
            amount: amount,
            name: document.getElementById('sName').textContent,
            btid: document.getElementById('sBtid').textContent
        };
        formData.append('extraData', JSON.stringify(extraData));

        if (uploadedFiles['paymentProof']) formData.append('proofDocs', uploadedFiles['paymentProof']);

        const res = await fetch(API_BASE + '/applications', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Submission failed');

        document.getElementById('modalAppId').textContent = result.data.applicationId;
        document.getElementById('successModal').classList.add('open');
    } catch (err) {
        showAlert(err.message || 'Network error. Please try again.');
    } finally {
        submitBtn.textContent = origLabel;
        submitBtn.disabled = false;
    }
}

/* ══════════════════════════════════════════════
   7. UTILS
══════════════════════════════════════════════ */
function showAlert(msg) {
    const al = document.getElementById('formAlert');
    if (document.getElementById('formAlertMsg')) document.getElementById('formAlertMsg').textContent = msg;
    if (al) al.classList.add('show');
}
function hideAlert() {
    const al = document.getElementById('formAlert');
    if (al) al.classList.remove('show');
}

function logout() {
    if (confirm('Logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}
