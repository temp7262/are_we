/* ============================================================
   JDCOEM – Student Document Services Portal
   migration.js  |  Apply for Document page scripts
   Connected to Backend API (Node.js/JWT)
   ============================================================ */

const API_BASE = "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem('user_token');
  return { 'Authorization': 'Bearer ' + token };
}

/* ══════════════════════════════════════════════════════════════════
   1. DOCUMENT TEMPLATES
   ══════════════════════════════════════════════════════════════════ */
const documentTemplates = {

  bonafide: `
    <div class="card dynamic-section active">
      <h2 class="card-title"><span class="card-icon">📜</span> Bonafide Certificate Details</h2>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label required">Purpose</label>
          <select class="form-select" name="purpose" required>
            <option value="">-- Select Purpose --</option>
            <option value="bank">Bank Loan</option>
            <option value="scholarship">Scholarship</option>
            <option value="passport">Passport Application</option>
            <option value="internship">Internship</option>
            <option value="other">Other</option>
          </select>
          <span class="form-error">Purpose is required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Academic Year</label>
          <select class="form-select" name="academicYear" required>
            <option value="">-- Select Year --</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
          </select>
          <span class="form-error">Academic year is required</span>
        </div>
      </div>
    </div>
  `,

  idcard: `
    <div class="card dynamic-section active">
      <h2 class="card-title"><span class="card-icon">🪪</span> Identity Card Details</h2>
      <div class="form-field">
        <label class="form-label required">Reason for Request</label>
        <select class="form-select" name="reason" id="idReason" required onchange="toggleFIRField()">
          <option value="">-- Select Reason --</option>
          <option value="new">New ID Card</option>
          <option value="lost">Lost ID Card</option>
          <option value="damaged">Damaged ID Card</option>
        </select>
        <span class="form-error">Reason is required</span>
      </div>
      <div class="form-field">
        <label class="form-label required">Upload Recent Photograph</label>
        <input type="file" class="form-input form-file" name="proofDocs" accept=".jpg,.jpeg,.png" required>
        <span class="form-help">Passport size photo (Max 2MB)</span>
        <span class="form-error">Photo is required</span>
      </div>
      <div class="form-field" id="firField" style="display:none;">
        <label class="form-label required">Upload FIR Copy</label>
        <input type="file" class="form-input form-file" name="proofDocs" accept=".pdf,.jpg,.jpeg,.png">
        <span class="form-help">Required for lost ID card (Max 5MB)</span>
      </div>
    </div>
  `,

  hallticket: `
    <div class="card dynamic-section active">
      <h2 class="card-title"><span class="card-icon">🎟️</span> Hall / Exam Ticket Details</h2>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label required">Exam Type</label>
          <select class="form-select" name="examType" required>
            <option value="">-- Select Exam --</option>
            <option value="internal">Internal Exam</option>
            <option value="university">University Exam</option>
            <option value="supplementary">Supplementary Exam</option>
          </select>
          <span class="form-error">Exam type is required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Semester</label>
          <select class="form-select" name="semester" required>
            <option value="">-- Select Semester --</option>
            <option value="1">Semester I</option><option value="2">Semester II</option>
            <option value="3">Semester III</option><option value="4">Semester IV</option>
            <option value="5">Semester V</option><option value="6">Semester VI</option>
            <option value="7">Semester VII</option><option value="8">Semester VIII</option>
          </select>
          <span class="form-error">Semester is required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Academic Year</label>
          <select class="form-select" name="academicYear" required>
            <option value="">-- Select Year --</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
          </select>
          <span class="form-error">Academic year is required</span>
        </div>
      </div>
    </div>
  `,

  tc: `
    <div class="card dynamic-section active">
      <h2 class="card-title"><span class="card-icon">🚪</span> Transfer Certificate Details</h2>
      <div class="form-field">
        <label class="form-label required">Reason for Leaving</label>
        <textarea class="form-textarea" name="reason" required
          placeholder="Please explain your reason for leaving..."></textarea>
      </div>
      <div class="form-field">
        <label class="form-label required">Upload Clearance Proof</label>
        <input type="file" class="form-input form-file" name="proofDocs" accept=".pdf" required>
        <span class="form-help">Library No-Dues & Fee Clearance (PDF, Max 5MB)</span>
      </div>
    </div>
  `
};

/* ══════════════════════════════════════════════════════════════════
   2. LOAD STUDENT DATA
   ══════════════════════════════════════════════════════════════════ */
(function loadStudentData() {
  const raw = localStorage.getItem('user');
  if (!raw) { window.location.href = 'login.html'; return; }
  const user = JSON.parse(raw);
  document.getElementById('studentName').value = user.name || user.fullName || 'Student Name';
  document.getElementById('rollNumber').value = user.rollNo || '2022BTCS001';
  document.getElementById('btId').value = user.btid || user.btId || 'BT2022001';
  document.getElementById('department').value = user.department || user.branch || '';
  document.getElementById('yearSem').value = user.year || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('mobile').value = user.phone || user.mobile || '';
})();

/* ══════════════════════════════════════════════════════════════════
   3. EVENT LISTENERS
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('docType').addEventListener('change', function () {
  const docType = this.value;
  const container = document.getElementById('dynamicFieldsContainer');
  const uploadSection = document.getElementById('uploadSection');
  const declarationSection = document.getElementById('declarationSection');

  container.innerHTML = documentTemplates[docType] || '';
  const show = !!documentTemplates[docType];
  uploadSection.style.display = show ? 'block' : 'none';
  declarationSection.style.display = show ? 'block' : 'none';
});

function toggleFIRField() {
  const reason = document.getElementById('idReason');
  const firField = document.getElementById('firField');
  if (reason && firField) {
    firField.style.display = (reason.value === 'lost') ? 'block' : 'none';
    const inp = firField.querySelector('input');
    if (inp) inp.required = (reason.value === 'lost');
  }
}

/* ══════════════════════════════════════════════════════════════════
   4. VALIDATION
   ══════════════════════════════════════════════════════════════════ */
function validateForm() {
  let isValid = true;
  const form = document.getElementById('applicationForm');
  form.querySelectorAll('[required]').forEach(field => {
    const parent = field.closest('.form-field');
    const empty = !field.value || (field.type === 'checkbox' && !field.checked);
    if (empty) { if (parent) parent.classList.add('error'); isValid = false; }
    else { if (parent) parent.classList.remove('error'); }
  });
  return isValid;
}

/* ══════════════════════════════════════════════════════════════════
   5. SUBMISSION — Node API
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('applicationForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!validateForm()) { alert('Please fill all required fields Correcty.'); return; }

  const submitBtn = document.getElementById('submitBtn');
  const origLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ Submitting...';
  submitBtn.disabled = true;

  try {
    const docType = document.getElementById('docType').value;
    const formData = new FormData(this);
    const dataObj = Object.fromEntries(formData);
    
    // extraData mapping
    const extraData = {
      name: document.getElementById('studentName').value,
      rollNo: document.getElementById('rollNumber').value,
      btid: document.getElementById('btId').value,
      branch: document.getElementById('department').value,
      academic_year: document.getElementById('yearSem').value,
      email: document.getElementById('email').value,
      ...dataObj
    };

    formData.append('applicationType', docType);
    formData.append('purpose', dataObj.purpose || dataObj.reason || 'Document Request');
    formData.append('extraData', JSON.stringify(extraData));

    const res = await fetch(API_BASE + '/applications', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Submission failed');

    document.getElementById('appIdDisplay').textContent = result.data.applicationId;
    document.getElementById('successModal').classList.add('open');

  } catch (err) {
    alert('❌ Submission failed: ' + err.message);
  } finally {
    submitBtn.innerHTML = origLabel;
    submitBtn.disabled = false;
  }
});

function resetForm() {
  if (confirm('Are you sure you want to reset?')) {
    document.getElementById('applicationForm').reset();
    document.getElementById('dynamicFieldsContainer').innerHTML = '';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('declarationSection').style.display = 'none';
  }
}