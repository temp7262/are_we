/* ================================================
   alldoc.js — Apply for Document Page Logic
   JDCOEM Digital Document Services Portal
   ================================================ */

// API_BASE provided by config.js

/* ── DOCUMENT TYPE FORM TEMPLATES ──────────────── */
const documentTemplates = {

    tc: `
        <div class="card dynamic-section active">
            <div class="card-header">
                <h2 class="card-title">Transfer Certificate Details</h2>
            </div>
            <div class="form-field">
                <label class="form-label required">Reason for Leaving</label>
                <textarea class="form-textarea" name="reason" required
                    placeholder="Please explain your reason for leaving the college in detail..."></textarea>
                <span class="form-error">Reason is required</span>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label required">Last Attended Semester</label>
                    <select class="form-select" name="lastSemester" required>
                        <option value="">-- Select Semester --</option>
                        <option value="1">Semester I</option>
                        <option value="2">Semester II</option>
                        <option value="3">Semester III</option>
                        <option value="4">Semester IV</option>
                        <option value="5">Semester V</option>
                        <option value="6">Semester VI</option>
                        <option value="7">Semester VII</option>
                        <option value="8">Semester VIII</option>
                    </select>
                    <span class="form-error">Last semester is required</span>
                </div>
                <div class="form-field">
                    <label class="form-label required">Last Attendance Date</label>
                    <input type="date" class="form-input" name="lastDate" required>
                    <span class="form-error">Last attendance date is required</span>
                </div>
            </div>
            <div class="form-field">
                <label class="form-label required">Upload Clearance Proof</label>
                <input type="file" class="form-input form-file" name="clearance" accept=".pdf" required>
                <span class="form-help">Library No-Dues &amp; Fee Clearance Certificate (PDF only, Max 5MB)</span>
                <span class="form-error">Clearance proof is required</span>
            </div>
        </div>`,

    noc: `
        <div class="card dynamic-section active">
            <div class="card-header">
                <h2 class="card-title">No Objection Certificate Details</h2>
            </div>
            <div class="form-field">
                <label class="form-label required">Purpose of NOC</label>
                <select class="form-select" name="purpose" required>
                    <option value="">-- Select Purpose --</option>
                    <option value="internship">Internship</option>
                    <option value="project">Project Work / Industrial Training</option>
                    <option value="passport">Passport Application</option>
                    <option value="exam">External Exam / Certification</option>
                    <option value="competition">Competition / Event Participation</option>
                    <option value="other">Other (Please Specify)</option>
                </select>
                <span class="form-error">Purpose is required</span>
            </div>
            <div class="form-field">
                <label class="form-label required">Organization / Institution Name</label>
                <input type="text" class="form-input" name="organization" required
                    placeholder="Enter full organization name">
                <span class="form-error">Organization name is required</span>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label required">Validity Period (From)</label>
                    <input type="date" class="form-input" name="validityFrom" required>
                    <span class="form-error">Start date is required</span>
                </div>
                <div class="form-field">
                    <label class="form-label required">Validity Period (To)</label>
                    <input type="date" class="form-input" name="validityTo" required>
                    <span class="form-error">End date is required</span>
                </div>
            </div>
            <div class="form-field">
                <label class="form-label">Upload Supporting Letter / Request Letter</label>
                <input type="file" class="form-input form-file" name="supportingLetter" accept=".pdf">
                <span class="form-help">Request letter from organization (if applicable) — PDF format, Max 5MB</span>
            </div>
        </div>`,

    transcript: `
        <div class="card dynamic-section active">
            <div class="card-header">
                <h2 class="card-title">Official Transcript Details</h2>
            </div>
            <div class="form-field">
                <label class="form-label required">Programme</label>
                <input type="text" class="form-input" name="programme"
                    value="B.Tech (Bachelor of Technology)" readonly>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label required">Semester Range (From)</label>
                    <select class="form-select" name="semesterFrom" required>
                        <option value="">-- Select --</option>
                        <option value="1">Semester I</option>
                        <option value="2">Semester II</option>
                        <option value="3">Semester III</option>
                        <option value="4">Semester IV</option>
                        <option value="5">Semester V</option>
                        <option value="6">Semester VI</option>
                        <option value="7">Semester VII</option>
                        <option value="8">Semester VIII</option>
                    </select>
                    <span class="form-error">Start semester is required</span>
                </div>
                <div class="form-field">
                    <label class="form-label required">Semester Range (To)</label>
                    <select class="form-select" name="semesterTo" required>
                        <option value="">-- Select --</option>
                        <option value="1">Semester I</option>
                        <option value="2">Semester II</option>
                        <option value="3">Semester III</option>
                        <option value="4">Semester IV</option>
                        <option value="5">Semester V</option>
                        <option value="6">Semester VI</option>
                        <option value="7">Semester VII</option>
                        <option value="8">Semester VIII</option>
                    </select>
                    <span class="form-error">End semester is required</span>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label required">Number of Copies</label>
                    <input type="number" class="form-input" name="copies" min="1" max="5" value="1" required>
                    <span class="form-help">Maximum 5 copies allowed</span>
                    <span class="form-error">Number of copies is required</span>
                </div>
                <div class="form-field">
                    <label class="form-label required">Purpose</label>
                    <select class="form-select" name="purpose" required>
                        <option value="">-- Select Purpose --</option>
                        <option value="higher-studies">Higher Studies / University Application</option>
                        <option value="employment">Employment / Job Application</option>
                        <option value="visa">Visa / Immigration</option>
                        <option value="scholarship">Scholarship Application</option>
                        <option value="other">Other</option>
                    </select>
                    <span class="form-error">Purpose is required</span>
                </div>
            </div>
            <div class="form-field">
                <label class="form-label">Upload Previous Mark Sheets (Optional)</label>
                <input type="file" class="form-input form-file" name="marksheets" accept=".pdf" multiple>
                <span class="form-help">All semester marksheets (PDF format, Max 5MB each). Multiple files allowed.</span>
            </div>
        </div>`,

    character: `
        <div class="card dynamic-section active">
            <div class="card-header">
                <h2 class="card-title">Character Certificate Details</h2>
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label required">Period of Study (From)</label>
                    <input type="month" class="form-input" name="periodFrom" required>
                    <span class="form-error">Start date is required</span>
                </div>
                <div class="form-field">
                    <label class="form-label required">Period of Study (To)</label>
                    <input type="month" class="form-input" name="periodTo" required>
                    <span class="form-error">End date is required</span>
                </div>
            </div>
            <div class="form-field">
                <label class="form-label required">Purpose of Certificate</label>
                <select class="form-select" name="purpose" required>
                    <option value="">-- Select Purpose --</option>
                    <option value="employment">Employment / Job Application</option>
                    <option value="higher-studies">Higher Studies / University Admission</option>
                    <option value="visa">Visa / Immigration Application</option>
                    <option value="scholarship">Scholarship Application</option>
                    <option value="government">Government Service Application</option>
                    <option value="other">Other (Please Specify)</option>
                </select>
                <span class="form-error">Purpose is required</span>
            </div>
            <div class="form-field">
                <label class="form-label">Additional Information (Optional)</label>
                <textarea class="form-textarea" name="additionalInfo"
                    placeholder="Any specific requirements or additional information..."></textarea>
            </div>
        </div>`
};

/* ── INIT ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', function () {

    // Auth guard + pre-fill student fields
    const raw = localStorage.getItem('user');
    if (!raw) { alert('Please login first'); window.location.href = 'login.html'; return; }

    const u = JSON.parse(raw);
    const name = u.name || u.fullName || 'Student Name';

    // Read-only student detail fields
    setValue('studentName', name);
    setValue('rollNumber', u.rollNo || '2022BTCS001');
    setValue('btId', u.btid || u.btId || 'BT2022001');
    setValue('department', u.department || u.branch || 'Computer Science and Engineering');
    setValue('programme', 'B.Tech (Bachelor of Technology)');
    setValue('yearSem', u.year || 'Third Year, Semester VI');
    setValue('email', u.email || 'student@jdcoem.ac.in');
    setValue('mobile', u.phone || u.mobile || '+91 98765 43210');

    // Doc type change handler
    document.getElementById('docType').addEventListener('change', handleDocTypeChange);

    // Form submit handler
    document.getElementById('applicationForm').addEventListener('submit', handleSubmit);

    // Close modal on outside click
    document.getElementById('successModal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('open');
            window.location.href = 'dashboard.html';
        }
    });
});

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

/* ── DOC TYPE CHANGE ────────────────────────────── */
function handleDocTypeChange() {
    const docType = this.value;
    const container = document.getElementById('dynamicFieldsContainer');
    const upload = document.getElementById('uploadSection');
    const decl = document.getElementById('declarationSection');

    container.innerHTML = '';

    if (docType && documentTemplates[docType]) {
        container.innerHTML = documentTemplates[docType];
        upload.style.display = 'block';
        decl.style.display = 'block';
    } else {
        upload.style.display = 'none';
        decl.style.display = 'none';
    }
}

/* ── VALIDATION ─────────────────────────────────── */
function validateForm() {
    let isValid = true;
    const form = document.getElementById('applicationForm');

    // Doc type required
    const docType = document.getElementById('docType');
    const dtField = docType.closest('.form-field');
    if (!docType.value) {
        dtField.classList.add('error'); isValid = false;
    } else {
        dtField.classList.remove('error');
    }

    // All required fields
    form.querySelectorAll('[required]').forEach(field => {
        const wrap = field.closest('.form-field');
        const empty = !field.value || (field.type === 'checkbox' && !field.checked);
        if (empty) {
            if (wrap) wrap.classList.add('error'); isValid = false;
        } else {
            if (wrap) wrap.classList.remove('error');
        }
    });

    // File size check (5 MB max)
    form.querySelectorAll('input[type="file"]').forEach(input => {
        Array.from(input.files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds the 5 MB limit. Please upload a smaller file.`);
                isValid = false;
            }
        });
    });

    return isValid;
}

/* ── FORM SUBMIT ────────────────────────────────── */
function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        alert('Please fill all required fields correctly');
        const firstError = document.querySelector('.form-field.error');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const docTypeEl = document.getElementById('docType');
    const docTypeName = docTypeEl.options[docTypeEl.selectedIndex].text;
    const appId = 'JDAPP' + new Date().getFullYear() + String(Math.floor(1000 + Math.random() * 9000));

    const data = {
        applicationId: appId,
        timestamp: new Date().toISOString(),
        status: 'Pending',
        documentType: docTypeEl.value,
        documentTypeName: docTypeName,
        student: {
            name: document.getElementById('studentName').value,
            rollNumber: document.getElementById('rollNumber').value,
            btId: document.getElementById('btId').value,
            department: document.getElementById('department').value,
            email: document.getElementById('email').value,
            mobile: document.getElementById('mobile').value,
        },
        formData: Object.fromEntries(new FormData(this)),
    };

    // Persist to localStorage (mock backend)
    const apps = JSON.parse(localStorage.getItem('applications') || '[]');
    apps.push(data);
    localStorage.setItem('applications', JSON.stringify(apps));

    document.getElementById('appIdDisplay').textContent = appId;
    document.getElementById('successModal').classList.add('open');
}

/* ── RESET ──────────────────────────────────────── */
function resetForm() {
    if (!confirm('Are you sure you want to reset the form? All entered data will be lost.')) return;
    document.getElementById('applicationForm').reset();
    document.getElementById('dynamicFieldsContainer').innerHTML = '';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('declarationSection').style.display = 'none';
    document.querySelectorAll('.form-field').forEach(f => f.classList.remove('error'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── LOGOUT ─────────────────────────────────────── */
function logout() { if(confirm("Logout?")) doLogout(); }
}
