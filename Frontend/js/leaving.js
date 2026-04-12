// ══════════════════════════════════════════════════════════════════
// 0️⃣ CONFIG
// ══════════════════════════════════════════════════════════════════
// API_BASE provided by config.js

// ══════════════════════════════════════════════════════════════════
// 1️⃣ LOAD STUDENT DATA FROM LOCALSTORAGE
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 2️⃣ DOCUMENT TYPE TEMPLATES
// ══════════════════════════════════════════════════════════════════
const documentTemplates = {
  tc: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">🚪</span> Transfer Certificate Details</h2>
      </div>
      <div class="form-field">
        <label class="form-label required">Reason for Leaving</label>
        <textarea class="form-textarea" name="reason" required placeholder="Please explain your reason for leaving..."></textarea>
        <span class="form-error">Reason is required</span>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label required">Last Attended Semester</label>
          <select class="form-select" name="lastSemester" required>
            <option value="">-- Select --</option>
            <option value="1">Sem I</option><option value="2">Sem II</option>
            <option value="3">Sem III</option><option value="4">Sem IV</option>
            <option value="5">Sem V</option><option value="6">Sem VI</option>
          </select>
          <span class="form-error">Required</span>
        </div>
        <div class="form-field">
          <label class="form-label required">Last Date</label>
          <input type="date" class="form-input" name="lastDate" required>
          <span class="form-error">Required</span>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label required">Upload Clearance Proof</label>
        <input type="file" class="form-input form-file" name="clearance" accept=".pdf" required>
        <span class="form-help">Library No-Dues & Fee Clearance (PDF, 5MB)</span>
      </div>
    </div>
  `,

  noc: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">✅</span> NOC Details</h2>
      </div>
      <div class="form-field">
        <label class="form-label required">Purpose</label>
        <select class="form-select" name="purpose" required>
          <option value="">-- Select Purpose --</option>
          <option value="internship">Internship</option>
          <option value="passport">Passport</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-field">
        <label class="form-label required">Organization</label>
        <input type="text" class="form-input" name="organization" required placeholder="Organization Name">
      </div>
      <div class="form-field">
        <label class="form-label">Upload Request Letter</label>
        <input type="file" class="form-input form-file" name="supportingLetter" accept=".pdf">
      </div>
    </div>
  `,

  transcript: `
    <div class="card dynamic-section active">
      <div class="card-header">
        <h2 class="card-title"><span class="card-icon">📋</span> Transcript Details</h2>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label required">Sem From</label>
          <input type="number" class="form-input" name="semesterFrom" min="1" max="8" required>
        </div>
        <div class="form-field">
          <label class="form-label required">Sem To</label>
          <input type="number" class="form-input" name="semesterTo" min="1" max="8" required>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Upload Marksheets</label>
        <input type="file" class="form-input form-file" name="marksheets" multiple accept=".pdf">
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
          <label class="form-label required">Period From</label>
          <input type="month" class="form-input" name="periodFrom" required>
        </div>
        <div class="form-field">
          <label class="form-label required">Period To</label>
          <input type="month" class="form-input" name="periodTo" required>
        </div>
      </div>
    </div>
  `
};

// ══════════════════════════════════════════════════════════════════
// 3️⃣ HANDLE DOCUMENT TYPE CHANGE
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 4️⃣ FORM VALIDATION
// ══════════════════════════════════════════════════════════════════
function validateForm() {
  let isValid = true;
  const form = document.getElementById('applicationForm');

  const docType = document.getElementById('docType');
  if (!docType.value) {
    docType.closest('.form-field').classList.add('error');
    isValid = false;
  } else {
    docType.closest('.form-field').classList.remove('error');
  }

  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(field => {
    if (!field.value || (field.type === 'checkbox' && !field.checked)) {
      field.closest('.form-field')?.classList.add('error');
      isValid = false;
    } else {
      field.closest('.form-field')?.classList.remove('error');
    }
  });

  const fileInputs = form.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    if (input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds 5MB limit.`);
          isValid = false;
        }
      });
    }
  });

  return isValid;
}

// ══════════════════════════════════════════════════════════════════
// 5️⃣ UPLOAD HELPER
// ══════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════
// 6️⃣ FORM SUBMISSION
// ══════════════════════════════════════════════════════════════════
document.getElementById('applicationForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!validateForm()) {
    alert('⚠️ Please fill all required fields correctly');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const origLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ Submitting...';
  submitBtn.disabled = true;

  try {
    const docTypeSelect = document.getElementById('docType');
    const certType = docTypeSelect.value;
    const formData = new FormData(this);
    const dataObj = Object.fromEntries(formData);

    // STEP 1: Create Application
    const res = await authFetch(API_BASE + '/application/create', {
      method: 'POST',
      /* credentials:include removed — use JWT */
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certificate_type: certType,
        admType: certType,
        purpose: dataObj.reason || dataObj.purpose || 'Document Request',
        branch: document.getElementById('department').value,
        year: document.getElementById('yearSem').value,
        ...dataObj
      })
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Failed to create application');

    const appId = result.application_id;
    const appNum = result.application_number;

    // STEP 2: Upload Files (Dynamically find all file inputs)
    const uploads = [];
    const fileInputs = this.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      if (input.files.length > 0) {
        Array.from(input.files).forEach(file => {
          uploads.push(uploadDocument(file, input.name || 'document', appId));
        });
      }
    });

    await Promise.all(uploads);

    // STEP 3: Success
    document.getElementById('appIdDisplay').textContent = appNum;
    document.getElementById('successModal').classList.add('open');

  } catch (err) {
    alert('❌ Error: ' + err.message);
  } finally {
    submitBtn.innerHTML = origLabel;
    submitBtn.disabled = false;
  }
});

// ══════════════════════════════════════════════════════════════════
// 7️⃣ RESET FORM
// ══════════════════════════════════════════════════════════════════
function resetForm() {
  if (confirm('⚠️ Are you sure you want to reset the form?')) {
    document.getElementById('applicationForm').reset();
    document.getElementById('dynamicFieldsContainer').innerHTML = '';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('declarationSection').style.display = 'none';
    document.querySelectorAll('.form-field').forEach(field => field.classList.remove('error'));
  }
}

// ══════════════════════════════════════════════════════════════════
// 8️⃣ CLOSE MODAL ON OUTSIDE CLICK
// ══════════════════════════════════════════════════════════════════
document.getElementById('successModal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('open');
    window.location.href = 'dashboard.html';
  }
});
