/* ============================================================
   JDCOEM – Student Document Services Portal
   noc.js  |  Apply for Document page scripts
   Connected to Backend API (Node.js/JWT)
   ============================================================ */

// Smart API detection (works on Vercel, ngrok, localhost)
var API_BASE = (window.location.port === '3000')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { 'Authorization': 'Bearer ' + token };
}

/* ══════════════════════════════════════════════════════════════════
   1. LOAD STUDENT DATA FROM LOCALSTORAGE
   ══════════════════════════════════════════════════════════════════ */
(function loadStudentData() {
  const raw = localStorage.getItem('user');
  if (!raw) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }
  const user = JSON.parse(raw);
  document.getElementById('studentName').value = user.name || user.fullName || 'Student Name';
  document.getElementById('rollNumber').value = user.rollNo || '2022BTCS001';
  document.getElementById('btId').value = user.btid || user.btId || 'BT2022001';
  document.getElementById('department').value = user.department || user.branch || 'Computer Science and Engineering';
  document.getElementById('programme').value = 'B.Tech (Bachelor of Technology)';
  document.getElementById('yearSem').value = user.year || 'Third Year, Semester VI';
  document.getElementById('email').value = user.email || 'student@jdcoem.ac.in';
  document.getElementById('mobile').value = user.phone || user.mobile || '+91 98765 43210';
})();

/* ══════════════════════════════════════════════════════════════════
   2. DOCUMENT TYPE TEMPLATES
   ══════════════════════════════════════════════════════════════════ */
const documentTemplates = {

  tc: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">🚪</span> Transfer Certificate Details</h2>
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
            <option value="1">Semester I</option><option value="2">Semester II</option>
            <option value="3">Semester III</option><option value="4">Semester IV</option>
            <option value="5">Semester V</option><option value="6">Semester VI</option>
            <option value="7">Semester VII</option><option value="8">Semester VIII</option>
          </select>
          <span class="form-error">Last semester is required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Last Attendance Date</label>
          <input type="date" class="form-input" name="lastDate" required>
          <span class="form-error">Date is required</span>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label required">Upload Clearance Proof</label>
        <input type="file" class="form-input form-file" name="proofDocs" accept=".pdf" required>
        <span class="form-help">Library No-Dues & Fee Clearance Certificate (PDF only, Max 5MB)</span>
        <span class="form-error">Clearance proof is required</span>
      </div>
    </div>
  `,

  noc: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">✅</span> No Objection Certificate Details</h2>
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
        <label class="form-label">Upload Supporting / Request Letter</label>
        <input type="file" class="form-input form-file" name="proofDocs" accept=".pdf">
        <span class="form-help">Request letter from organization (if applicable) – PDF format, Max 5MB</span>
      </div>
    </div>
  `,

  transcript: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">📋</span> Official Transcript Details</h2>
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
            <option value="1">Semester I</option><option value="2">Semester II</option>
            <option value="3">Semester III</option><option value="4">Semester IV</option>
            <option value="5">Semester V</option><option value="6">Semester VI</option>
            <option value="7">Semester VII</option><option value="8">Semester VIII</option>
          </select>
          <span class="form-error">Start semester is required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Semester Range (To)</label>
          <select class="form-select" name="semesterTo" required>
            <option value="">-- Select --</option>
            <option value="1">Semester I</option><option value="2">Semester II</option>
            <option value="3">Semester III</option><option value="4">Semester IV</option>
            <option value="5">Semester V</option><option value="6">Semester VI</option>
            <option value="7">Semester VII</option><option value="8">Semester VIII</option>
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
        <input type="file" class="form-input form-file" name="proofDocs" accept=".pdf" multiple>
        <span class="form-help">All semester marksheets (PDF format, Max 5MB each).</span>
      </div>
    </div>
  `,

  character: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">⭐</span> Character Certificate Details</h2>
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
    </div>
  `
};

/* ══════════════════════════════════════════════════════════════════
   3. HANDLE DOCUMENT TYPE CHANGE
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('docType').addEventListener('change', function () {
  const docType = this.value;
  const container = document.getElementById('dynamicFieldsContainer');
  const uploadSection = document.getElementById('uploadSection');
  const declarationSection = document.getElementById('declarationSection');

  container.innerHTML = '';

  if (docType && documentTemplates[docType]) {
    container.innerHTML = documentTemplates[docType];
    uploadSection.style.display = 'block';
    declarationSection.style.display = 'block';
  } else {
    uploadSection.style.display = 'none';
    declarationSection.style.display = 'none';
  }
});

/* ══════════════════════════════════════════════════════════════════
   4. FORM VALIDATION
   ══════════════════════════════════════════════════════════════════ */
function validateForm() {
  let isValid = true;
  const form = document.getElementById('applicationForm');

  const docTypeEl = document.getElementById('docType');
  if (!docTypeEl.value) {
    docTypeEl.closest('.form-field').classList.add('error');
    isValid = false;
  } else {
    docTypeEl.closest('.form-field').classList.remove('error');
  }

  form.querySelectorAll('[required]').forEach(field => {
    const empty = !field.value || (field.type === 'checkbox' && !field.checked);
    if (empty) {
      field.closest('.form-field')?.classList.add('error');
      isValid = false;
    } else {
      field.closest('.form-field')?.classList.remove('error');
    }
  });

  form.querySelectorAll('input[type="file"]').forEach(input => {
    Array.from(input.files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 5 MB.`);
        isValid = false;
      }
    });
  });

  return isValid;
}

/* ══════════════════════════════════════════════════════════════════
   5. FORM SUBMISSION — Node.js Atomic Upload
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('applicationForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!validateForm()) {
    alert('⚠️ Please fill all required fields correctly');
    const firstError = document.querySelector('.form-field.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const origLabel = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) { submitBtn.innerHTML = '⏳ Submitting...'; submitBtn.disabled = true; }

  try {
    const docTypeSelect = document.getElementById('docType');
    const certType = docTypeSelect.value;
    
    // Create FormData for atomic upload
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
      phone: document.getElementById('mobile').value,
      ...dataObj
    };

    formData.append('applicationType', certType);
    formData.append('purpose', dataObj.purpose || dataObj.reason || 'Document Request');
    formData.append('extraData', JSON.stringify(extraData));

    // Refactored Node.js atomic submission
    const res = await fetch(API_BASE + '/applications', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Submission failed');

    // Show success modal with generated Application ID
    document.getElementById('appIdDisplay').textContent = result.data.applicationId;
    document.getElementById('successModal').classList.add('open');

  } catch (err) {
    alert('❌ Submission failed: ' + err.message);
  } finally {
    if (submitBtn) { submitBtn.innerHTML = origLabel; submitBtn.disabled = false; }
  }
});

/* ══════════════════════════════════════════════════════════════════
   6. RESET FORM
   ══════════════════════════════════════════════════════════════════ */
function resetForm() {
  if (confirm('⚠️ Are you sure you want to reset the form? All entered data will be lost.')) {
    document.getElementById('applicationForm').reset();
    document.getElementById('dynamicFieldsContainer').innerHTML = '';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('declarationSection').style.display = 'none';
    document.querySelectorAll('.form-field').forEach(f => f.classList.remove('error'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ══════════════════════════════════════════════════════════════════
   7. CLOSE MODAL ON OUTSIDE CLICK
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('successModal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('open');
    window.location.href = 'dashboard.html';
  }
});