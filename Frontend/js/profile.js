/* ============================================================
   profile.js — Student Profile Page
   ALL sections fully editable (pre-registration flow)
   Personal · Academic · College · Password · Auto-fetch
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';

var editStates = {
    personal: false,
    academic: false,
    college: false
};

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('user_token')
    };
}

/* ══════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    const raw = localStorage.getItem('user');
    if (raw) {
        try { renderUser(JSON.parse(raw)); } catch (e) { }
    } else {
        window.location.href = 'login.html';
        return;
    }

    fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderUser(res.data);
                showProfileCompletionBanner(res.data);
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(() => { });

    loadProfileStats();
});

/* ══════════════════════════════════════════
   PROFILE COMPLETION BANNER
   Shows a warning if key fields are missing
══════════════════════════════════════════ */
function showProfileCompletionBanner(u) {
    const banner = document.getElementById('profile-completion-banner');
    if (!banner) return;
    const missing = [];
    if (!u.name) missing.push('Full Name');
    if (!u.dob) missing.push('Date of Birth');
    if (!u.gender) missing.push('Gender');
    if (!u.email) missing.push('Email');
    if (!u.mobile) missing.push('Mobile Number');
    if (!u.branch) missing.push('Branch');
    if (!u.year) missing.push('Current Year');
    if (!u.semester) missing.push('Semester');
    if (!u.prn) missing.push('PRN');
    if (missing.length > 0) {
        banner.style.display = 'block';
        const msgEl = document.getElementById('completion-msg');
        if (msgEl) msgEl.textContent =
            'Complete your profile to apply for documents: ' + missing.join(', ');
    } else {
        banner.style.display = 'none';
    }
}

/* ══════════════════════════════════════════
   RENDER USER DATA
══════════════════════════════════════════ */
function renderUser(u) {
    if (!u) return;
    const name = u.name || 'Student';
    const btid = u.btid || u.studentId || '—';
    const ini = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    set('hdrInitials', ini);
    set('hdrName', name);
    set('phInitials', ini);
    set('phName', name);
    set('phBtid', btid);
    set('phSub', (u.branch || 'JDCOEM') + ' · Nagpur');

    if (u.photo_url) {
        const avatar = document.getElementById('phAvatar');
        if (avatar) {
            let img = avatar.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
                avatar.insertBefore(img, avatar.firstChild);
            }
            img.src = u.photo_url;
            const iniEl = document.getElementById('phInitials');
            if (iniEl) iniEl.style.display = 'none';
        }
    }

    // ── PERSONAL display + inputs ──
    set('disp-fullname', u.name);
    set('disp-dob', u.dob ? formatDate(u.dob) : '—');
    set('disp-gender', u.gender);
    set('disp-email', u.email);
    set('disp-mobile', u.mobile || 'Not set');
    set('disp-address', u.address || 'Not set');

    setVal('inp-fullname', u.name || '');
    setVal('inp-dob', u.dob ? rawDate(u.dob) : '');
    setVal('inp-gender', u.gender || '');
    setVal('inp-email', u.email || '');
    setVal('inp-mobile', u.mobile || '');
    setVal('inp-address', u.address || '');

    // ── ACADEMIC display + inputs ──
    set('disp-branch', u.branch);
    set('disp-programme', u.programme || u.course || '—');
    set('disp-year', u.year);
    set('disp-semester', u.semester);
    set('disp-adm-year', u.admission_year || u.admYear || '—');
    set('disp-section', u.section || u.batch || '—');
    set('disp-btid2', btid);
    set('disp-prn', u.prn || '—');

    setVal('inp-branch', u.branch || '');
    setVal('inp-programme', u.programme || u.course || '');
    setVal('inp-year', u.year || '');
    setVal('inp-semester', u.semester || '');
    setVal('inp-adm-year', u.admission_year || u.admYear || '');
    setVal('inp-section', u.section || u.batch || '');
    setVal('inp-btid2', btid !== '—' ? btid : '');
    setVal('inp-prn', u.prn || '');

    // ── COLLEGE display + inputs ──
    set('disp-college-name', u.college_name || 'JD College of Engineering and Management');
    set('disp-college-status', u.college_status || 'Autonomous Institute');
    set('disp-college-univ', u.university || 'RTMNU');
    set('disp-college-city', u.city || 'Nagpur');

    setVal('inp-college-name', u.college_name || 'JD College of Engineering and Management');
    setVal('inp-college-status', u.college_status || 'Autonomous Institute');
    setVal('inp-college-univ', u.university || 'RTMNU');
    setVal('inp-college-city', u.city || 'Nagpur');
}

/* ══════════════════════════════════════════
   TOGGLE EDIT — personal / academic / college
══════════════════════════════════════════ */
const PERSONAL_FIELDS = ['fullname', 'dob', 'gender', 'email', 'mobile', 'address'];
const ACADEMIC_FIELDS = ['branch', 'programme', 'year', 'semester', 'adm-year', 'section', 'btid2', 'prn'];
const COLLEGE_FIELDS = ['college-name', 'college-status', 'college-univ', 'college-city'];

function toggleEdit(section) {
    const fields = section === 'personal' ? PERSONAL_FIELDS
        : section === 'academic' ? ACADEMIC_FIELDS
            : COLLEGE_FIELDS;

    const isEditing = !editStates[section];
    editStates[section] = isEditing;

    fields.forEach(field => {
        const disp = document.getElementById('disp-' + field);
        const inp = document.getElementById('inp-' + field);
        if (disp) disp.classList.toggle('hidden', isEditing);
        if (inp) inp.classList.toggle('hidden', !isEditing);
    });

    const saveBar = document.getElementById('save-' + section);
    if (saveBar) saveBar.classList.toggle('hidden', !isEditing);

    const editBtn = document.getElementById('edit' + cap(section) + 'Btn');
    if (editBtn) editBtn.textContent = isEditing ? 'Cancel' : 'Edit';

    if (section === 'personal') {
        const notice = document.getElementById('college-maintained-notice');
        if (notice) notice.style.display = isEditing ? 'none' : '';
    }

    if (isEditing) {
        const firstInput = document.getElementById('inp-' + fields[0]);
        if (firstInput) firstInput.focus();
    }
}

function cancelEdit(section) {
    editStates[section] = true;
    toggleEdit(section);
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    renderUser(u);
}

/* ══════════════════════════════════════════
   SAVE — PERSONAL
══════════════════════════════════════════ */
function savePersonal() {
    const fullname = getVal('inp-fullname');
    const dob = getVal('inp-dob');
    const gender = getVal('inp-gender');
    const email = getVal('inp-email');
    const mobile = getVal('inp-mobile');
    const address = getVal('inp-address');

    if (!fullname) { showToast('Full name cannot be empty.'); return; }
    if (mobile && !/^\d{10}$/.test(mobile)) {
        showToast('Mobile number must be exactly 10 digits.'); return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Enter a valid email address.'); return;
    }

    postUpdate('/auth/profile/update',
        { name: fullname, dob, gender, email, mobile, address },
        'personal', 'Personal information saved ✓');
}

/* ══════════════════════════════════════════
   SAVE — ACADEMIC
══════════════════════════════════════════ */
function saveAcademic() {
    const branch = getVal('inp-branch');
    const programme = getVal('inp-programme');
    const year = getVal('inp-year');
    const semester = getVal('inp-semester');
    const admYear = getVal('inp-adm-year');
    const section = getVal('inp-section');
    const btid = getVal('inp-btid2');
    const prn = getVal('inp-prn');

    if (!branch) { showToast('Branch cannot be empty.'); return; }
    if (!year) { showToast('Current Year cannot be empty.'); return; }
    if (!semester) { showToast('Semester cannot be empty.'); return; }

    postUpdate('/auth/profile/update',
        {
            branch, programme, year, semester,
            admission_year: admYear, section, btid, prn
        },
        'academic', 'Academic information saved ✓');
}

/* ══════════════════════════════════════════
   SAVE — COLLEGE
══════════════════════════════════════════ */
function saveCollege() {
    postUpdate('/auth/profile/update', {
        college_name: getVal('inp-college-name'),
        college_status: getVal('inp-college-status'),
        university: getVal('inp-college-univ'),
        city: getVal('inp-college-city')
    }, 'college', 'College information saved ✓');
}

/* ══════════════════════════════════════════
   SHARED POST HELPER
══════════════════════════════════════════ */
function postUpdate(endpoint, payload, section, successMsg) {
    const btn = document.querySelector('#save-' + section + ' .btn-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                renderUser(res.data);
                showProfileCompletionBanner(res.data);
                showToast(successMsg);
                editStates[section] = true;
                toggleEdit(section);
            } else {
                showToast(res.message || 'Failed to save. Please try again.');
            }
        })
        .catch(() => showToast('Server error. Please check your connection.'))
        .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
        });
}

/* ══════════════════════════════════════════
   AUTO-FETCH FOR DOCUMENT APPLICATION FORMS
   ─────────────────────────────────────────
   In any apply.js / form page, just call:
     autoFillApplicationForm();
   Or use getProfileData() to get the object.
══════════════════════════════════════════ */
function getProfileData() {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        return {
            name: u.name || '',
            dob: u.dob || '',
            dobFormatted: u.dob ? formatDate(u.dob) : '',
            gender: u.gender || '',
            email: u.email || '',
            mobile: u.mobile || '',
            address: u.address || '',
            photo_url: u.photo_url || '',
            studentId: u.btid || u.studentId || '',
            prn: u.prn || '',
            branch: u.branch || '',
            programme: u.programme || u.course || '',
            year: u.year || '',
            semester: u.semester || '',
            section: u.section || u.batch || '',
            admissionYear: u.admission_year || u.admYear || '',
            college: u.college_name || 'JD College of Engineering and Management',
            collegeShort: 'JDCOEM',
            university: u.university || 'RTMNU',
            city: u.city || 'Nagpur',
            collegeStatus: u.college_status || 'Autonomous Institute'
        };
    } catch (e) { return {}; }
}

const PROFILE_FIELD_MAP = {
    name: ['applicantName', 'fullName', 'studentName', 'inp-name', 'student_name'],
    email: ['applicantEmail', 'email', 'studentEmail'],
    mobile: ['applicantMobile', 'mobile', 'phone', 'mobileNumber'],
    address: ['applicantAddress', 'address', 'permanentAddress'],
    dob: ['applicantDob', 'dob', 'dateOfBirth'],
    dobFormatted: ['dobDisplay', 'dobText'],
    gender: ['applicantGender', 'gender'],
    studentId: ['studentId', 'btid', 'rollNo'],
    prn: ['prn', 'prnNumber'],
    branch: ['branch', 'department'],
    programme: ['programme', 'course'],
    year: ['year', 'currentYear'],
    semester: ['semester', 'currentSem'],
    section: ['section', 'batch'],
    admissionYear: ['admYear', 'admissionYear'],
    college: ['collegeName', 'institution'],
    university: ['university', 'affiliatedUniversity'],
};

function autoFillApplicationForm() {
    const p = getProfileData();
    Object.entries(PROFILE_FIELD_MAP).forEach(([key, ids]) => {
        const val = p[key];
        if (!val) return;
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (!el.value) el.value = val;
            } else if (el.tagName === 'SELECT') {
                if (!el.value) el.value = val;
            } else {
                if (!el.textContent.trim()) el.textContent = val;
            }
        });
    });
}

/* ══════════════════════════════════════════
   APPLICATION STATS
══════════════════════════════════════════ */
function loadProfileStats() {
    fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(res => {
            if (res.success && Array.isArray(res.data)) {
                const apps = res.data;
                set('totalApps', apps.length);
                set('pendingApps', apps.filter(a =>
                    ['pending', 'clerk_approved', 'hod_approved'].includes(a.status)).length);
                set('approvedApps', apps.filter(a => a.status === 'principal_approved').length);
                set('rejectedApps', apps.filter(a => a.status === 'rejected').length);
                const chip = document.getElementById('sideAppBadge');
                if (chip) {
                    chip.textContent = apps.length > 0 ? apps.length : '';
                    chip.style.display = apps.length > 0 ? 'inline-block' : 'none';
                }
            }
        })
        .catch(() => { });
}

/* ══════════════════════════════════════════
   CHANGE PASSWORD MODAL
══════════════════════════════════════════ */
function openModal(id) {
    const m = document.getElementById('modal-' + id);
    if (m) m.style.display = 'flex';
}
function closeModal(id) {
    const m = document.getElementById('modal-' + id);
    if (m) m.style.display = 'none';
    ['cur-pass', 'new-pass', 'conf-pass'].forEach(fid => {
        const f = document.getElementById(fid);
        if (f) f.value = '';
    });
    const alert = document.getElementById('pw-alert');
    if (alert) { alert.style.display = 'none'; alert.textContent = ''; }
    const fill = document.getElementById('pw-fill');
    if (fill) { fill.style.width = '0%'; fill.style.background = '#e5e7eb'; }
    set('pw-label', '—');
}

function changePassword() {
    const cur = document.getElementById('cur-pass').value;
    const nw = document.getElementById('new-pass').value;
    const conf = document.getElementById('conf-pass').value;
    const alertEl = document.getElementById('pw-alert');

    function showAlert(msg, isError = true) {
        alertEl.textContent = msg;
        alertEl.style.display = 'block';
        alertEl.style.background = isError ? '#fee2e2' : '#d1fae5';
        alertEl.style.color = isError ? '#991b1b' : '#14532d';
        alertEl.style.border = isError ? '1px solid #fca5a5' : '1px solid #6ee7b7';
        alertEl.style.padding = '10px 14px';
        alertEl.style.borderRadius = '8px';
        alertEl.style.fontSize = '13px';
    }

    if (!cur || !nw || !conf) { showAlert('All fields are required.'); return; }
    if (nw.length < 8) { showAlert('New password must be at least 8 characters.'); return; }
    if (nw !== conf) { showAlert('New passwords do not match.'); return; }

    const btn = document.querySelector('.btn-modal-primary');
    btn.disabled = true; btn.textContent = 'Updating…';
    alertEl.style.display = 'none';

    fetch(API_BASE + '/auth/password/change', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: cur, newPassword: nw })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showAlert('Password changed successfully! Please log in again.', false);
                setTimeout(() => { localStorage.clear(); window.location.href = 'login.html'; }, 2000);
            } else {
                showAlert(res.message || 'Failed to change password.');
            }
        })
        .catch(() => showAlert('Server error. Please try again.'))
        .finally(() => { btn.disabled = false; btn.textContent = 'Update Password'; });
}

function checkPwStrength(val) {
    const fill = document.getElementById('pw-fill');
    const label = document.getElementById('pw-label');
    if (!fill || !label) return;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = [
        { pct: '20%', color: '#ef4444', text: 'Very Weak' },
        { pct: '40%', color: '#f97316', text: 'Weak' },
        { pct: '60%', color: '#eab308', text: 'Fair' },
        { pct: '80%', color: '#22c55e', text: 'Strong' },
        { pct: '100%', color: '#15803d', text: 'Very Strong' }
    ];
    const l = levels[Math.min(score, 4)];
    fill.style.width = l.pct; fill.style.background = l.color;
    label.textContent = l.text; label.style.color = l.color;
}

function togglePw(id) {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ══════════════════════════════════════════
   KYC / AVATAR UPLOAD
══════════════════════════════════════════ */
function triggerUpload(type) {
    const el = document.getElementById(type + '-upload');
    if (el) el.click();
}
function handleKycUpload(input, type) {
    if (!input.files || !input.files[0]) return;
    showToast('Uploading ' + type + '…');
    setTimeout(() => showToast('Document uploaded successfully'), 1200);
}
function previewAvatar(input) {
    if (!input.files || !input.files[0]) return;
    const fd = new FormData();
    fd.append('photo', input.files[0]);
    fetch(API_BASE + '/auth/profile/photo', {
        method: 'POST', body: fd,
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('user_token') }
    })
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) localStorage.setItem('user', JSON.stringify(res.data));
            showToast('Photo saved');
            setTimeout(() => location.reload(), 800);
        })
        .catch(() => showToast('Photo upload failed'));
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val != null ? val : '—';
}
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val != null ? val : '';
}
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function rawDate(d) {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; } catch (e) { return ''; }
}
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
}
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear(); window.location.href = 'login.html';
    }
}
function confirmLogoutAll() {
    if (confirm('This will log you out from all devices. Continue?')) {
        localStorage.clear(); window.location.href = 'login.html';
    }
}
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay'))
        closeModal(e.target.id.replace('modal-', ''));
});