/* ================================================
   degree.js — Degree Certificate Application Logic
   JDCOEM Digital Document Services Portal
   Connected to Backend API

   Upload Flow:
     Step 1 → POST /api/application/create        (JSON)
              ← { success, application_id, application_number }
     Step 2 → POST /api/documents/upload           (FormData)
              Fields: application_id, document_type, file
              ← { success, message, file_name }
     Step 3 → Show success modal
   ================================================ */

// API_BASE provided by config.js
const uploadedFiles = {};

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function () {
    const raw = localStorage.getItem('user');
    if (!raw) { window.location.href = 'login.html'; return; }

    /* Fill from localStorage immediately (no flicker) */
    fillProfile(JSON.parse(raw));

    /* Verify session + refresh user data from backend */
    authFetch(API_BASE + '/auth/me', { /* credentials:include removed — use JWT */})
        .then(function (r) {
            if (!r.ok) throw new Error('Session check failed');
            return r.json();
        })
        .then(function (res) {
            if (!res.success && !res.user) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            if (res.user) {
                localStorage.setItem('user', JSON.stringify(res.user));
                fillProfile(res.user);
            }
        })
        .catch(function (err) {
            console.warn('Auth check failed:', err);
            /* Keep localStorage data — page still usable */
        });

    /* Declaration checkbox listener */
    const cb = document.getElementById('declCheck');
    if (cb) cb.addEventListener('change', function () { setDot('decl', cb.checked); });

    loadSidebarBadge();
});

/* ══════════════════════════════════════════════
   FILL PROFILE FIELDS
══════════════════════════════════════════════ */
function fillProfile(u) {
    const name = u.name || u.full_name || u.btid || 'Student';
    const btid = u.btid || u.student_id || u.email || '--';
    const branch = u.branch || u.department || '';
    const email = u.email || '--';
    const initials = name.split(' ').filter(Boolean)
        .map(function (n) { return n[0]; })
        .join('').substring(0, 2).toUpperCase();

    /* Header */
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent = name;
    document.getElementById('userId').textContent = btid;

    /* Read-only auto-filled fields */
    const sName = document.getElementById('sName');
    const sBtid = document.getElementById('sBtid');
    const sEmail = document.getElementById('sEmail');
    if (sName) sName.textContent = name;
    if (sBtid) sBtid.textContent = btid;
    if (sEmail) sEmail.textContent = email;

    /* Editable fields — only set if student hasn't filled them yet */
    const branchEl = document.getElementById('sBranch');
    if (branchEl && !branchEl.value) branchEl.value = branch;
}

/* ══════════════════════════════════════════════
   SIDEBAR BADGE
══════════════════════════════════════════════ */
function loadSidebarBadge() {
    authFetch(API_BASE + '/application/my', { /* credentials:include removed — use JWT */})
        .then(function (r) { return r.json(); })
        .then(function (res) {
            if (res.success && res.data) {
                const badge = document.querySelector('.nav-badge');
                if (badge) badge.textContent = res.data.length;
            }
        })
        .catch(function () { }); /* silent */
}

/* ══════════════════════════════════════════════
   DRAG & DROP
══════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════
   FILE PROCESSING — validate then store in memory
══════════════════════════════════════════════ */
function processFile(file, id, maxMB, types) {
    const errEl = document.getElementById('fe-' + id);
    if (errEl) {
        errEl.classList.remove('show');
        errEl.textContent = '';
    }

    if (file.size > maxMB * 1024 * 1024) {
        if (errEl) {
            errEl.textContent = '⚠ File too large. Maximum allowed size is ' + maxMB + 'MB.';
            errEl.classList.add('show');
        }
        return;
    }
    if (types && types.length && !types.includes(file.type)) {
        const readable = types.map(function (t) {
            return t.replace('image/', '').replace('application/', '').toUpperCase();
        }).join(', ');
        if (errEl) {
            errEl.textContent = '⚠ Invalid file type. Allowed: ' + readable;
            errEl.classList.add('show');
        }
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

    const row = document.getElementById('fp-' + id);
    if (row) {
        const icons = { 'application/pdf': '📕', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
        const fpiEl = document.getElementById('fpi-' + id);
        const fpnEl = document.getElementById('fpn-' + id);
        const fpsEl = document.getElementById('fps-' + id);
        if (fpiEl) fpiEl.textContent = icons[file.type] || '📄';
        if (fpnEl) fpnEl.textContent = file.name.length > 30 ? file.name.substring(0, 28) + '…' : file.name;
        if (fpsEl) fpsEl.textContent = (file.size / 1024).toFixed(1) + ' KB';
        row.classList.add('show');
    }
}

function removeFile(id, e) {
    if (e) e.stopPropagation();
    delete uploadedFiles[id];

    const dz = document.getElementById('dz-' + id);
    const dzd = document.getElementById('dzd-' + id);
    if (dz) dz.classList.remove('has-file');
    if (dzd) dzd.style.display = '';

    const row = document.getElementById('fp-' + id);
    if (row) row.classList.remove('show');

    markChecklist(id, false);
    updateReadiness();
}

function markChecklist(id, done) {
    const item = document.getElementById('req-' + id);
    const check = document.getElementById('check-' + id);
    if (!item || !check) return;
    if (done) { item.classList.add('complete'); check.textContent = '✓'; }
    else { item.classList.remove('complete'); check.textContent = '○'; }
}

/* ══════════════════════════════════════════════
   PURPOSE
══════════════════════════════════════════════ */
function setPurpose(text) {
    const el = document.getElementById('purpose');
    if (el) el.value = text;
    onPurposeInput();
}
function onPurposeInput() {
    const v = document.getElementById('purpose').value;
    const countEl = document.getElementById('charCount');
    if (countEl) countEl.textContent = v.length;
    setDot('purpose', v.trim().length >= 10);
}

/* ══════════════════════════════════════════════
   DECLARATION
══════════════════════════════════════════════ */
function toggleDecl() {
    const cb = document.getElementById('declCheck');
    if (cb) setDot('decl', cb.checked);
}

/* ══════════════════════════════════════════════
   READINESS DOTS
══════════════════════════════════════════════ */
function setDot(id, ok) {
    const d = document.getElementById('dot-' + id);
    if (!d) return;
    d.classList.toggle('ok', !!ok);
    d.classList.toggle('bad', !ok);
}
function updateReadiness() {
    setDot('marksheet', !!uploadedFiles['marksheet']);
}

/* ══════════════════════════════════════════════
   UPLOAD A SINGLE DOCUMENT TO BACKEND
   ─────────────────────────────────────────────
   POST /api/documents/upload
   FormData fields:
     application_id  → integer  (from /application/create)
     document_type   → string   e.g. "consolidated_marksheet"
     file            → File     (backend reads via $_FILES['file'])
   ─────────────────────────────────────────────
   Always resolves — never rejects.
══════════════════════════════════════════════ */
function uploadDocument(file, documentType, applicationId) {
    return new Promise(function (resolve) {
        const fd = new FormData();
        fd.append('application_id', applicationId);
        fd.append('document_type', documentType);
        fd.append('file', file);

        authFetch(API_BASE + '/documents/upload', {
            method: 'POST',
            /* credentials:include removed — use JWT */
            body: fd
        })
            .then(function (r) {
                if (!r.ok) {
                    console.warn('[Upload] HTTP ' + r.status + ' for ' + documentType);
                    resolve({ success: false, httpStatus: r.status });
                    return;
                }
                return r.json();
            })
            .then(function (res) {
                if (!res) return;
                if (res.success) {
                    console.log('[Upload] ✅ ' + documentType + ' saved → ' + (res.file_name || ''));
                } else {
                    console.warn('[Upload] ⚠ ' + documentType + ' rejected:', res.message);
                }
                resolve(res);
            })
            .catch(function (err) {
                console.warn('[Upload] ❌ Network error for ' + documentType + ':', err.message);
                resolve({ success: false, error: err.message });
            });
    });
}

/* ══════════════════════════════════════════════
   SUBMIT FORM
══════════════════════════════════════════════ */
function submitForm() {

    /* ── Collect field values ── */
    const branch = document.getElementById('sBranch').value;
    const convYear = document.getElementById('convYear').value;
    const prn = document.getElementById('prnNumber').value.trim();
    const cgpa = document.getElementById('cgpa').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const decl = document.getElementById('declCheck').checked;

    /* ── Validate ── */
    const errors = [];
    if (!branch) errors.push('Please select your department / branch.');
    if (!convYear) errors.push('Please select your convocation / pass year.');
    if (!prn) errors.push('Please enter your PRN number.');
    if (!cgpa) errors.push('Please enter your CGPA.');
    if (!uploadedFiles['marksheet']) errors.push('Please upload your Consolidated Marksheet.');
    if (purpose.length < 10) errors.push('Please provide a reason (min. 10 characters).');
    if (!decl) errors.push('Please accept the declaration before submitting.');

    /* Update readiness dots */
    setDot('marksheet', !!uploadedFiles['marksheet']);
    setDot('purpose', purpose.length >= 10);
    setDot('decl', decl);

    if (errors.length > 0) {
        const extra = errors.length > 1
            ? '  (+' + (errors.length - 1) + ' more issue' + (errors.length > 2 ? 's' : '') + ')'
            : '';
        showAlert(errors[0] + extra);
        return;
    }
    hideAlert();

    /* ── Loading state ── */
    const submitBtn = document.querySelector('.btn-primary');
    const origLabel = submitBtn.textContent;
    submitBtn.textContent = '⏳ Submitting…';
    submitBtn.disabled = true;

    /* ════════════════════════════════════════════
       STEP 1 — Create application record (JSON)
       Endpoint: POST /api/application/create
       Returns:  { success, application_id, application_number }
    ════════════════════════════════════════════ */
    authFetch(API_BASE + '/application/create', {
        method: 'POST',
        /* credentials:include removed — use JWT */
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            certificate_type: 'degree',
            purpose: purpose,
            branch: branch,
            current_year: 'Graduated',
            academic_year: convYear,
            prn_number: prn,
            cgpa: cgpa
        })
    })
        .then(function (r) {
            if (!r.ok) throw new Error('Server error ' + r.status);
            return r.json();
        })
        .then(function (res) {
            if (!res.success) {
                throw new Error(res.message || 'Submission failed. Please try again.');
            }

            const appNumber = res.application_number || ('APP-' + Date.now());
            const appId = res.application_id || res.id;

            if (!appId) throw new Error('Application ID missing from server response.');

            console.log('[Degree] ✅ Application created | Number:', appNumber, '| ID:', appId);

            /* ════════════════════════════════════════
               STEP 2 — Upload documents
               document_type: "consolidated_marksheet"
            ════════════════════════════════════════ */
            const uploads = [];

            if (uploadedFiles['marksheet']) {
                uploads.push(uploadDocument(uploadedFiles['marksheet'], 'consolidated_marksheet', appId));
            }

            return Promise.all(uploads).then(function (results) {
                const failed = results.filter(function (r) { return r && !r.success; });
                if (failed.length > 0) {
                    console.warn('[Degree] ' + failed.length + ' document(s) failed to upload.');
                }
                return appNumber;
            });
        })
        .then(function (appNumber) {

            /* ════════════════════════════════════════
               STEP 3 — Show success
            ════════════════════════════════════════ */
            submitBtn.textContent = origLabel;
            submitBtn.disabled = false;

            /* Save to localStorage so home.html track widget shows this app */
            try {
                const apps = JSON.parse(localStorage.getItem('applications') || '[]');
                apps.unshift({
                    id: appNumber,
                    docType: 'degree',
                    docTitle: 'Degree Certificate',
                    purpose: purpose,
                    date: new Date().toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    }),
                    status: 'Pending',
                    processingTime: '5 Working Days'
                });
                localStorage.setItem('applications', JSON.stringify(apps));
            } catch (e) { /* non-critical */ }

            /* Show success modal */
            const modalAppId = document.getElementById('modalAppId');
            if (modalAppId) modalAppId.textContent = appNumber;
            document.getElementById('successModal').classList.add('open');
        })
        .catch(function (err) {
            submitBtn.textContent = origLabel;
            submitBtn.disabled = false;
            showAlert('❌ ' + (err.message || 'Network error. Please check your connection and try again.'));
            console.error('[Degree] Submit error:', err);
        });
}

/* ══════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════ */
function logout() { if(confirm("Logout?")) doLogout(); }
    }
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */
function showAlert(msg) {
    const al = document.getElementById('formAlert');
    const msgEl = document.getElementById('formAlertMsg');
    if (!al) { alert(msg); return; }
    if (msgEl) msgEl.textContent = msg;
    al.classList.add('show');
    al.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideAlert() {
    const al = document.getElementById('formAlert');
    if (al) al.classList.remove('show');
}
