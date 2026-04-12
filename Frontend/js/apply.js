/* ================================================
   apply.js — Generic Document Application Logic
   Handles: character, tc, noc, transcript
   JDCOEM Digital Document Services Portal
   Connected to Backend API
   ================================================ */

const API_BASE = "http://localhost:5000/api";

function getAuthHeaders() {
  return { 'Authorization': 'Bearer ' + localStorage.getItem('user_token') };
}
// ══════════════════════════════════════════════════════════════════
// 1️⃣  DOCUMENT TYPE TEMPLATES
// ══════════════════════════════════════════════════════════════════
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
        <label class="form-label">Upload Supporting Letter / Request Letter</label>
        <input type="file" class="form-input form-file" name="supportingLetter" accept=".pdf">
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
        <input type="file" class="form-input form-file" name="marksheets" accept=".pdf" multiple>
        <span class="form-help">All semester marksheets (PDF, Max 5MB each). Multiple files allowed.</span>
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

// ══════════════════════════════════════════════════════════════════
// 2️⃣  LOAD STUDENT DATA
// ══════════════════════════════════════════════════════════════════
function loadStudentData() {
  var raw = localStorage.getItem('user');
  if (!raw) { window.location.href = 'login.html'; return; }

  var u = JSON.parse(raw);

  // Fill from localStorage immediately
  fillStudentFields(u);

  // Fetch fresh data from backend
  fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success && !res.data && !res._id) { // Node might structure it differently
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      if (res.data || res.email) {
        let uData = res.data || res;
        localStorage.setItem('user', JSON.stringify(uData));
        fillStudentFields(uData);
      }
    })
    .catch(function () { });

  // Load sidebar badge
  fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res.success && res.data) {
        var badges = document.querySelectorAll('.nav-badge');
        if (badges[0]) badges[0].textContent = res.data.length;
      }
    })
    .catch(function () { });
}

function fillStudentFields(u) {
  var name = u.name || u.full_name || u.btid || 'Student';
  var initials = name.split(' ').filter(Boolean).map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

  // Header
  var hi = document.getElementById('userInitials');
  var hn = document.getElementById('userName');
  if (hi) hi.textContent = initials;
  if (hn) hn.textContent = name;

  // Form fields
  var set = function (id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
  set('studentName', u.name || u.full_name || '');
  set('rollNumber', u.roll_number || u.btid || '');
  set('btId', u.btid || u.student_id || '');
  set('department', u.branch || u.department || '');
  set('programme', 'B.Tech (Bachelor of Technology)');
  set('yearSem', u.year || u.current_year || '');
  set('email', u.email || '');
  set('mobile', u.phone || u.mobile || '');
}

// ══════════════════════════════════════════════════════════════════
// 3️⃣  AUTO-SELECT DOC TYPE FROM localStorage (from documents.html)
// ══════════════════════════════════════════════════════════════════
function autoSelectDocType() {
  // Map from documents.html DOC_PAGES keys to apply.html option values
  var typeMap = {
    character: 'character',
    noc: 'noc',
    transcript: 'transcript',
    leaving: 'tc',
    migration: 'tc'
  };

  var selected = localStorage.getItem('selectedDocument');
  if (selected && typeMap[selected]) {
    var docTypeEl = document.getElementById('docType');
    if (docTypeEl) {
      docTypeEl.value = typeMap[selected];
      handleDocTypeChange(); // auto-load the fields
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// 4️⃣  HANDLE DOCUMENT TYPE CHANGE
// ══════════════════════════════════════════════════════════════════
function handleDocTypeChange() {
  var docType = document.getElementById('docType').value;
  var container = document.getElementById('dynamicFieldsContainer');
  var uploadSection = document.getElementById('uploadSection');
  var declarationSec = document.getElementById('declarationSection');

  container.innerHTML = '';

  if (docType && documentTemplates[docType]) {
    container.innerHTML = documentTemplates[docType];
    uploadSection.style.display = 'block';
    declarationSec.style.display = 'block';
  } else {
    uploadSection.style.display = 'none';
    declarationSec.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════════
// 5️⃣  FORM VALIDATION
// ══════════════════════════════════════════════════════════════════
function validateForm() {
  var isValid = true;
  var form = document.getElementById('applicationForm');

  var docTypeEl = document.getElementById('docType');
  if (!docTypeEl.value) {
    docTypeEl.closest('.form-field').classList.add('error');
    isValid = false;
  } else {
    docTypeEl.closest('.form-field').classList.remove('error');
  }

  var requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(function (field) {
    var isEmpty = !field.value || (field.type === 'checkbox' && !field.checked);
    var wrapper = field.closest('.form-field');
    if (isEmpty) {
      if (wrapper) wrapper.classList.add('error');
      isValid = false;
    } else {
      if (wrapper) wrapper.classList.remove('error');
    }
  });

  var MAX_FILE_SIZE = 5 * 1024 * 1024;
  var fileInputs = form.querySelectorAll('input[type="file"]');
  fileInputs.forEach(function (input) {
    Array.from(input.files).forEach(function (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('File "' + file.name + '" exceeds the 5 MB limit.');
        isValid = false;
      }
    });
  });

  return isValid;
}

// ══════════════════════════════════════════════════════════════════
// 6️⃣  FORM SUBMISSION — CONNECTED TO BACKEND
// ══════════════════════════════════════════════════════════════════
function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    var firstError = document.querySelector('.form-field.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  var docTypeEl = document.getElementById('docType');
  var docType = docTypeEl.value;
  var docTypeName = docTypeEl.options[docTypeEl.selectedIndex].text;

  // Collect purpose from dynamic fields
  var purposeEl = document.querySelector('[name="purpose"]');
  var purpose = purposeEl ? purposeEl.value : docTypeName;

  // Collect all dynamic field values for extra_data
  var extraData = { document_type_name: docTypeName };
  var dynamicFields = document.querySelectorAll('#dynamicFieldsContainer [name]');
  dynamicFields.forEach(function (field) {
    if (field.type !== 'file') extraData[field.name] = field.value;
  });

  var submitBtn = document.getElementById('submitBtn');
  var origText = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ Submitting…';
  submitBtn.disabled = true;

  // ── Construct Atomic Multer Payload ──
  var fileData = new FormData();
  fileData.append('applicationType', docType);
  fileData.append('purpose', purpose);
  fileData.append('extraData', JSON.stringify(extraData));

  // Loop through all inputs and mount files specifically to 'proofDocs' 
  // so Multer processes them correctly in bulk.
  var fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(function (input) {
    Array.from(input.files).forEach(function (file) {
      fileData.append('proofDocs', file);
    });
  });

  // ── Single-Step Node.js Submit (Data + Files mapped instantly) ──
  fetch(API_BASE + '/applications', {
    method: 'POST',
    headers: getAuthHeaders(), // Does NOT include Content-Type so browser sets boundary dynamically!
    body: fileData
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) {
        throw new Error(res.message || 'Submission failed. Please try again.');
      }

      var appNumber = res.data ? res.data.applicationId : ('APP-' + Date.now());

      submitBtn.innerHTML = origText;
      submitBtn.disabled = false;

      // Save to localStorage for track status visual projection
      var apps = JSON.parse(localStorage.getItem('applications') || '[]');
      apps.unshift({
        id: appNumber,
        docType: docType,
        docTitle: docTypeName,
        purpose: purpose,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Pending'
      });
      localStorage.setItem('applications', JSON.stringify(apps));

      // Show success modal
      document.getElementById('appIdDisplay').textContent = appNumber;
      document.getElementById('successModal').classList.add('open');
    })
    .catch(function (err) {
      submitBtn.innerHTML = origText;
      submitBtn.disabled = false;
      alert('❌ ' + (err.message || 'Network error. Please try again.'));
      console.error('Apply submit error:', err);
    });
}

// ══════════════════════════════════════════════════════════════════
// 7️⃣  RESET FORM
// ══════════════════════════════════════════════════════════════════
function resetForm() {
  if (!confirm('⚠️ Are you sure you want to reset the form? All entered data will be lost.')) return;
  document.getElementById('applicationForm').reset();
  document.getElementById('dynamicFieldsContainer').innerHTML = '';
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('declarationSection').style.display = 'none';
  document.querySelectorAll('.form-field').forEach(function (f) { f.classList.remove('error'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════════
// 8️⃣  LOGOUT
// ══════════════════════════════════════════════════════════════════
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

// ══════════════════════════════════════════════════════════════════
// 9️⃣  INIT
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  loadStudentData();
  autoSelectDocType(); // auto-select doc type if coming from documents.html
  document.getElementById('docType').addEventListener('change', handleDocTypeChange);
  document.getElementById('applicationForm').addEventListener('submit', handleFormSubmit);

  // Close modal on outside click
  document.getElementById('successModal').addEventListener('click', function (e) {
    if (e.target === document.getElementById('successModal')) {
      document.getElementById('successModal').classList.remove('open');
      window.location.href = 'dashboard.html';
    }
  });
});