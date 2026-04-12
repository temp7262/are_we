/* ================================================
   admission.js — Admission Letter Application Logic
   JDCOEM Digital Document Services Portal
   ================================================ */

// API_BASE provided by config.js

/* ── STATE ─────────────────────────────────────── */
let currentStep = 1;
let uploadedDocs = {};

const REQUIRED_DOCS = [
    'ui-regform', 'ui-photos', 'ui-aadhaar', 'ui-dob',
    'ui-10th', 'ui-12th', 'ui-tc', 'ui-character-prev',
    'ui-feereceipt', 'ui-antiragging', 'ui-collegeform', 'ui-undertaking'
];

const DETAIL_FIELDS = [
    'fullName', 'dob', 'gender', 'aadhaar', 'mobile', 'email',
    'btid', 'branch', 'year', 'acYear', 'admType', 'purpose'
];

const ALL_DOCS = [
    { id: 'ui-regform', name: 'Application / Registration Form' },
    { id: 'ui-photos', name: 'Passport-size Photographs' },
    { id: 'ui-aadhaar', name: 'Aadhaar Card' },
    { id: 'ui-dob', name: 'Birth Certificate / 10th (DOB Proof)' },
    { id: 'ui-10th', name: '10th Marksheet & Certificate' },
    { id: 'ui-12th', name: '12th Marksheet & Certificate' },
    { id: 'ui-tc', name: 'Transfer Certificate (TC)' },
    { id: 'ui-migration', name: 'Migration Certificate' },
    { id: 'ui-character-prev', name: 'Character Certificate' },
    { id: 'ui-offer', name: 'Offer Letter' },
    { id: 'ui-entrance', name: 'Entrance Scorecard' },
    { id: 'ui-allotment', name: 'Allotment Letter' },
    { id: 'ui-caste', name: 'Caste Certificate' },
    { id: 'ui-caste-validity', name: 'Caste Validity Certificate' },
    { id: 'ui-ncl', name: 'NCL Certificate' },
    { id: 'ui-ews', name: 'EWS Certificate' },
    { id: 'ui-pwd', name: 'PWD Certificate' },
    { id: 'ui-income', name: 'Income Certificate' },
    { id: 'ui-feereceipt', name: 'Fee Receipt / Payment Proof' },
    { id: 'ui-scholarship', name: 'Scholarship Form' },
    { id: 'ui-domicile', name: 'Domicile Certificate' },
    { id: 'ui-gap', name: 'Gap Certificate' },
    { id: 'ui-medical', name: 'Medical Fitness Certificate' },
    { id: 'ui-antiragging', name: 'Anti-Ragging Undertaking' },
    { id: 'ui-collegeform', name: 'College Admission Form' },
    { id: 'ui-undertaking', name: 'Undertaking / Declaration Forms' },
    { id: 'ui-bankdetails', name: 'Bank Account Details' },
];

/* ── INIT ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {

    // Auth guard
    const raw = localStorage.getItem('user');
    if (!raw) { window.location.href = 'login.html'; return; }

    const u = JSON.parse(raw);
    const name = u.name || u.btid || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent = name;

    // Pre-fill form from user data
    if (u.name) trySet('fullName', u.name);
    if (u.btid) trySet('btid', u.btid);
    if (u.email) trySet('email', u.email);
    if (u.branch) trySelectContains('branch', u.branch);
    if (u.year) trySelectContains('year', u.year);

    // Attach change listeners for live progress update
    DETAIL_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateProgress);
    });
    ['decl1', 'decl2', 'decl3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateProgress);
    });

    updateProgress();
});

/* ── HELPERS ────────────────────────────────────── */
function trySet(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function trySelectContains(id, text) {
    const sel = document.getElementById(id);
    if (!sel) return;
    for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.includes(text)) { sel.selectedIndex = i; break; }
    }
}

/* ── STEPPER ────────────────────────────────────── */
function goStep(step) {
    ['step1-content', 'step2-content', 'step3-content'].forEach((id, i) => {
        document.getElementById(id).style.display = (i + 1 === step) ? '' : 'none';
    });

    currentStep = step;
    updateStepper(step);
    if (step === 3) buildReview();
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepper(step) {
    for (let i = 1; i <= 3; i++) {
        const sc = document.getElementById('sc' + i);
        const st = document.getElementById('st' + i);
        const sl = document.getElementById('sl' + i);
        if (i < step) {
            sc.className = 'step-circle done';
            sc.textContent = '✓';
            if (sl) sl.className = 'step-line done';
        } else if (i === step) {
            sc.className = 'step-circle active';
            sc.textContent = String(i);
            st.className = 's-title active';
        } else {
            sc.className = 'step-circle pending';
            sc.textContent = String(i);
            st.className = 's-title';
        }
    }
}

/* ── FILE UPLOAD ────────────────────────────────── */
function triggerUpload(id, e) {
    e.stopPropagation();
    document.querySelector(`#${id} .file-input`).click();
}

function markUploaded(id, input) {
    if (!input.files || !input.files[0]) return;
    const item = document.getElementById(id);
    const fname = input.files[0].name;

    item.classList.add('uploaded');
    item.querySelector('.ui-sub').textContent = '✓ ' + fname;

    const badge = item.querySelector('.ui-badge');
    badge.className = 'ui-badge badge-done';
    badge.textContent = 'Uploaded';

    item.querySelector('.ui-btn').textContent = 'Change';
    uploadedDocs[id] = fname;
    updateProgress();
}

/* ── PROGRESS ───────────────────────────────────── */
function checkDetailsFilled() {
    return DETAIL_FIELDS.every(id => {
        const el = document.getElementById(id);
        return el && el.value && el.value.trim() !== '';
    });
}

function updateProgress() {
    const detailsDone = checkDetailsFilled();
    const uploadedReq = REQUIRED_DOCS.filter(id => !!uploadedDocs[id]).length;
    const reqDocsDone = uploadedReq === REQUIRED_DOCS.length;

    const decl1 = document.getElementById('decl1');
    const decl2 = document.getElementById('decl2');
    const decl3 = document.getElementById('decl3');
    const declDone = currentStep === 3 &&
        decl1 && decl1.checked && decl2 && decl2.checked && decl3 && decl3.checked;

    setChk('chk-details', 'chkl-details', detailsDone, 'Student details filled');
    setChk('chk-reqDocs', 'chkl-reqDocs', reqDocsDone, `Required docs uploaded (${uploadedReq}/${REQUIRED_DOCS.length})`);
    setChk('chk-decl', 'chkl-decl', declDone, 'Declarations confirmed');

    const docScore = Math.round((uploadedReq / REQUIRED_DOCS.length) * 45);
    let score = (detailsDone ? 40 : 0) + docScore + (declDone ? 15 : 0);
    score = Math.min(score, 100);

    const circ = 150.8;
    const offset = circ - (circ * score / 100);
    document.getElementById('ringFill').setAttribute('stroke-dashoffset', offset);
    document.getElementById('ringText').textContent = score + '%';

    document.getElementById('progressTitle').textContent =
        score === 100 ? 'Ready to Submit!' :
            score >= 70 ? 'Almost There' :
                score >= 40 ? 'In Progress' : 'Getting Started';

    document.getElementById('progressSub').textContent =
        score === 100 ? 'All requirements met' : score + '% complete';
}

function setChk(dotId, lblId, done, label) {
    const dot = document.getElementById(dotId);
    const lbl = document.getElementById(lblId);
    dot.className = 'chk-dot ' + (done ? 'done' : 'pending');
    dot.textContent = done ? '✓' : '';
    lbl.className = 'chk-label ' + (done ? 'done' : 'pending');
    lbl.textContent = label;
}

/* ── REVIEW BUILD ───────────────────────────────── */
function buildReview() {
    const reviewFields = [
        { label: 'Full Name', id: 'fullName' },
        { label: 'Date of Birth', id: 'dob' },
        { label: 'Gender', id: 'gender' },
        { label: 'Mobile', id: 'mobile' },
        { label: 'Email', id: 'email' },
        { label: 'BTID', id: 'btid' },
        { label: 'Roll No.', id: 'rollno' },
        { label: 'Branch', id: 'branch' },
        { label: 'Year', id: 'year' },
        { label: 'Academic Year', id: 'acYear' },
        { label: 'Admission Type', id: 'admType' },
        { label: 'Category', id: 'category' },
        { label: 'Purpose', id: 'purpose' },
        { label: 'Remarks', id: 'remarks' },
    ];

    // Summary grid
    const rs = document.getElementById('reviewSummary');
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

    reviewFields.forEach(f => {
        const el = document.getElementById(f.id);
        const val = el ? (el.value || '—') : '—';
        const div = document.createElement('div');
        div.style.cssText = 'background:var(--g50);border-radius:var(--radius-lg);padding:10px 14px;';
        div.innerHTML = `
            <div style="font-size:11px;font-weight:700;color:var(--g400);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${f.label}</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--g900);">${val}</div>`;
        grid.appendChild(div);
    });
    rs.innerHTML = '';
    rs.appendChild(grid);

    // Documents summary
    const ds = document.getElementById('docsSummary');
    ds.innerHTML = '';

    ALL_DOCS.forEach(d => {
        const uploaded = !!uploadedDocs[d.id];
        const isReq = REQUIRED_DOCS.includes(d.id);
        if (!uploaded && !isReq) return; // skip optional not uploaded

        const div = document.createElement('div');
        div.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:8px 12px;
            border-radius:var(--radius-lg);
            background:${uploaded ? 'var(--success-bg)' : 'var(--error-bg)'};
            border:1px solid ${uploaded ? 'var(--success-border)' : 'var(--error-border)'};`;

        div.innerHTML = `
            <span style="font-size:16px;">${uploaded ? '✅' : '❌'}</span>
            <span style="font-size:13px;font-weight:600;color:${uploaded ? 'var(--success)' : 'var(--error)'};flex:1;">${d.name}</span>
            ${uploaded
                ? `<span style="font-size:11.5px;color:var(--g500);">${uploadedDocs[d.id]}</span>`
                : `<span style="font-size:11px;background:var(--error-bg);color:var(--error);padding:2px 8px;border-radius:10px;font-weight:700;">${isReq ? 'MISSING' : 'Not Uploaded'}</span>`
            }`;
        ds.appendChild(div);
    });
}

/* ── SUBMIT ─────────────────────────────────────── */
async function submitApplication() {
    const decl1 = document.getElementById('decl1');
    const decl2 = document.getElementById('decl2');
    const decl3 = document.getElementById('decl3');

    if (!decl1.checked || !decl2.checked || !decl3.checked) {
        alert('Please confirm all declarations before submitting.');
        return;
    }

    const missing = REQUIRED_DOCS.filter(id => !uploadedDocs[id]);
    if (missing.length > 0) {
        if (!confirm(`Some required documents are missing (${missing.length}). Submit anyway?`)) return;
    }

    /* ── Show loading state ── */
    const btn = document.querySelector('.submit-btn') || document.querySelector('[onclick="submitApplication()"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

    try {
        /* ── Build FormData (text fields + files) ── */
        const formData = new FormData();

        // ─── FIX: Tell the backend this is an 'admission' application
        //         so it uses storage/uploads/admission/ as the subfolder.
        //         Without this, admType = "Direct Admission (CAP)" which
        //         doesn't match any key in $typeToFolder → files land in general/.
        formData.append('certificate_type', 'admission');

        // Append all text/select fields
        DETAIL_FIELDS.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) formData.append(fieldId, el.value || '');
        });

        // Append optional fields that exist in the form
        ['rollno', 'aadhaar', 'category', 'remarks'].forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el && el.value) formData.append(fieldId, el.value);
        });

        // Append uploaded files — grab from actual DOM file inputs
        // PHP receives as $_FILES['documents']['name']['ui-regform'] etc.
        ALL_DOCS.forEach(doc => {
            const input = document.querySelector(`#${doc.id} .file-input`);
            if (input && input.files && input.files[0]) {
                formData.append(`documents[${doc.id}]`, input.files[0]);
            }
        });

        /* ── POST to backend ── */
        const response = await authFetch(`${API_BASE}/application/store`, {
            method: 'POST',
            /* credentials:include removed — use JWT */   // sends session cookie
            body: formData     // no Content-Type header — browser sets multipart boundary
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Submission failed');
        }

        /* ── Success — show modal with real app number ── */
        const appNumber = result.application_number || result.application_id || 'N/A';
        const displayEl = document.getElementById('appIdDisplay');
        if (displayEl) displayEl.textContent = appNumber;

        const modal = document.getElementById('successModal');
        if (modal) modal.classList.add('show');

    } catch (err) {
        console.error('[submitApplication]', err);
        alert('Submission failed: ' + err.message + '\n\nPlease try again or contact support.');
    } finally {
        /* ── Restore button ── */
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
}

/* ── LOGOUT ─────────────────────────────────────── */
function logout() { if(confirm("Logout?")) doLogout(); }
}
