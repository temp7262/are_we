/* ============================================================
   JDCOEM – Student Document Services Portal
   transcript.js  |  Apply for Document page scripts
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
   2. HANDLE DOCUMENT TYPE CHANGE (Simplified for Transcript Only Page)
   ══════════════════════════════════════════════════════════════════ */
// This script is specifically for transcript.html, so it sets up transcript fields by default
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('dynamicFieldsContainer');
  if (container) {
    container.innerHTML = `
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
          <span class="form-help">All semester marksheets (PDF format, Max 5MB each). Multiple files allowed.</span>
        </div>
      </div>
    `;
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('declarationSection').style.display = 'block';
  }
});

/* ══════════════════════════════════════════════════════════════════
   3. FORM VALIDATION
   ══════════════════════════════════════════════════════════════════ */
function validateForm() {
  let isValid = true;
  const form = document.getElementById('applicationForm');

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
   4. FORM SUBMISSION — Node.js Atomic Upload
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
    const formData = new FormData(this);
    const dataObj = Object.fromEntries(formData);
    
    // Mapping unique fields to extraData
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

    formData.append('applicationType', 'Transcript');
    formData.append('purpose', dataObj.purpose || 'Official Transcript Application');
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
   5. RESET FORM
   ══════════════════════════════════════════════════════════════════ */
function resetForm() {
  if (confirm('⚠️ Are you sure you want to reset the form? All entered data will be lost.')) {
    document.getElementById('applicationForm').reset();
    document.querySelectorAll('.form-field').forEach(f => f.classList.remove('error'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ══════════════════════════════════════════════════════════════════
   6. CLOSE MODAL ON OUTSIDE CLICK
   ══════════════════════════════════════════════════════════════════ */
document.getElementById('successModal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('open');
    window.location.href = 'dashboard.html';
  }
});