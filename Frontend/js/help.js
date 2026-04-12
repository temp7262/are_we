// ── INIT ──
window.addEventListener('DOMContentLoaded', function () {
  var raw = localStorage.getItem('user');
  if (!raw) { window.location.href = 'login.html'; return; }

  var u    = JSON.parse(raw);
  var name = u.name || u.btid || 'Student';
  var ini  = name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

  document.getElementById('uAv').textContent   = ini;
  document.getElementById('uName').textContent = name;

  // Pre-fill ticket form with saved user data
  if (u.name)  document.getElementById('inp-name').value  = u.name;
  if (u.btid)  document.getElementById('inp-btid').value  = u.btid;
  if (u.email) document.getElementById('inp-email').value = u.email;

  // Dynamic office open/closed status (Mon–Sat, 10:00–16:00)
  var now  = new Date();
  var day  = now.getDay();   // 0 = Sunday
  var hr   = now.getHours();
  var open = day >= 1 && day <= 6 && hr >= 10 && hr < 16;
  var osEl = document.querySelector('.office-status');

  if (osEl && !open) {
    var dot = osEl.querySelector('.os-dot');
    var txt = osEl.querySelector('.os-text');
    dot.style.background  = '#e67e00';
    dot.style.animation   = 'none';
    txt.style.color       = '#e67e00';
    txt.textContent       = 'Office Currently Closed';
    osEl.style.background = '#fffbf0';
    osEl.style.borderColor = '#fcd34d';
  }

  // Attach live validation listeners
  ['f-name', 'f-btid', 'f-email', 'f-cat', 'f-desc'].forEach(function (id) {
    var fieldId = 'inp-' + id.replace('f-', '');
    var inp = document.getElementById(fieldId);
    if (inp) inp.addEventListener('input', function () { clearErr(id); });
  });
});

// ── FAQ TOGGLE ──
function toggleFaq(qEl) {
  var item   = qEl.closest('.faq-item');
  var ans    = item.querySelector('.faq-a');
  var isOpen = qEl.classList.contains('open');

  // Close all open items first
  document.querySelectorAll('.faq-q.open').forEach(function (q) {
    q.classList.remove('open');
    q.closest('.faq-item').querySelector('.faq-a').classList.remove('open');
  });

  // Toggle clicked item
  if (!isOpen) {
    qEl.classList.add('open');
    ans.classList.add('open');
  }
}

// ── TICKET FORM ──
function updateCharCount() {
  var val = document.getElementById('inp-desc').value;
  document.getElementById('charCount').textContent = val.length;
}

function clearErr(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('err');
}

function setErr(id, show) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('err', show);
}

function submitTicket() {
  var name  = document.getElementById('inp-name').value.trim();
  var btid  = document.getElementById('inp-btid').value.trim();
  var email = document.getElementById('inp-email').value.trim();
  var cat   = document.getElementById('inp-cat').value;
  var desc  = document.getElementById('inp-desc').value.trim();
  var valid = true;

  function check(id, condition) {
    if (condition) { setErr(id, true); valid = false; }
    else setErr(id, false);
  }

  check('f-name',  !name);
  check('f-btid',  !btid);
  check('f-email', !email || !email.includes('@'));
  check('f-cat',   !cat);
  check('f-desc',  desc.length < 20);

  if (!valid) { showToast('⚠ Please fill in all required fields.'); return; }

  // Generate unique ticket ID
  var tid = 'TKT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
  document.getElementById('ticketId').textContent = tid;

  // Persist ticket to localStorage
  var tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
  tickets.push({
    id:     tid,
    name:   name,
    btid:   btid,
    email:  email,
    cat:    cat,
    desc:   desc,
    date:   new Date().toLocaleDateString('en-IN'),
    status: 'Open'
  });
  localStorage.setItem('tickets', JSON.stringify(tickets));

  // Show success state
  document.getElementById('ticketFormBody').style.display = 'none';
  document.getElementById('ticketSuccess').classList.add('show');
  showToast('✅ Ticket ' + tid + ' submitted!');
}

function resetForm() {
  ['inp-name', 'inp-btid', 'inp-email', 'inp-cat', 'inp-appid', 'inp-desc'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-name', 'f-btid', 'f-email', 'f-cat', 'f-desc'].forEach(function (id) {
    clearErr(id);
  });
  document.getElementById('charCount').textContent = '0';
}

function newTicket() {
  document.getElementById('ticketSuccess').classList.remove('show');
  document.getElementById('ticketFormBody').style.display = '';
  resetForm();

  // Re-fill form from saved user
  var u = JSON.parse(localStorage.getItem('user') || '{}');
  if (u.name)  document.getElementById('inp-name').value  = u.name;
  if (u.btid)  document.getElementById('inp-btid').value  = u.btid;
  if (u.email) document.getElementById('inp-email').value = u.email;
}

// ── SCROLL HELPER ──
function smoothScroll(selector) {
  var el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── TOAST ──
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(function () { t.classList.remove('show'); }, 3200);
}

// ── LOGOUT ──
function logout() { if(confirm("Logout?")) doLogout(); }
}
