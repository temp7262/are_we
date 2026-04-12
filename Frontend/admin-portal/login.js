/* ============================================================
   JDCOEM Admin Portal — login.js
   Location: public/admin-portal/login.js
   ============================================================ */



var ROLE_REDIRECT = {
  clerk: 'clerk.html',
  hod: 'hod.html',
  principal: 'principal.html',
  admin: 'clerk.html'
};

/* Permanent email → role map.
   This is the single source of truth — overrides whatever the DB returns. */
var EMAIL_ROLE = {
  'saar@jdcoem.ac.in': 'clerk',
  'skhod@jdcoem.ac.in': 'hod',
  'sagar@jdcoem.ac.in': 'principal'
};

/* ── PAGE LOAD ──────────────────────────────────────────────
   ALWAYS wipe localStorage on the login page.
   Stale admin_user was the reason principal.html kept loading
   without a login — the old version auto-redirected from here.
   Fix: login page never redirects. User MUST type credentials.
   Also remove old shared keys (pre role-specific fix) so stale
   data from the old format never interferes. */
window.addEventListener('DOMContentLoaded', function () {
  /* Remove old shared keys from before the role-specific fix */
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_creds');

  var emailEl = document.getElementById('emailIn');
  if (emailEl) emailEl.focus();
});

/* Enter key triggers login from any input on the page */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') doLogin();
});

/* ── CLEAR FORM ERRORS ── */
function clearErr() {
  var el = document.getElementById('formErr');
  if (el) el.classList.remove('show');
  var emailEl = document.getElementById('emailIn');
  var pwEl = document.getElementById('pwIn');
  if (emailEl) emailEl.classList.remove('err');
  if (pwEl) pwEl.classList.remove('err');
}

/* ── MAIN LOGIN ─────────────────────────────────────────────
   Flow:
   1. Validate inputs
   2. POST /auth/logout  → destroy any existing PHP session
      (prevents student session leaking into admin API calls)
   3. POST /auth/login   → fresh login
   4. Email→role map guarantees correct role regardless of DB value
   5. Save to ROLE-SPECIFIC localStorage key → redirect to correct dashboard
      Using role-specific keys (admin_user_clerk, admin_user_hod, etc.)
      prevents different roles open in the same browser from
      overwriting each other's session data — which was the root
      cause of the 4-minute redirect bug.                               */
function doLogin() {
  var emailEl = document.getElementById('emailIn');
  var pwEl = document.getElementById('pwIn');
  var btn = document.getElementById('signInBtn');

  var email = emailEl ? emailEl.value.trim() : '';
  var pw = pwEl ? pwEl.value : '';

  if (!email) {
    showError('Please enter your email address.');
    if (emailEl) { emailEl.classList.add('err'); emailEl.focus(); }
    return;
  }
  if (!pw) {
    showError('Please enter your password.');
    if (pwEl) { pwEl.classList.add('err'); pwEl.focus(); }
    return;
  }

  clearErr();
  setBtn(btn, true, 'Signing in…');

  /* Fresh admin login via Node API */
  fetch(API_BASE + '/auth/login/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: pw })
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      console.log('[Admin Login] Response:', JSON.stringify(res));

      if (res.success && res.data) {
        var user = res.data.user || {};
        var token = res.data.token;
        var role = (res.data.role || '').toLowerCase().trim();

        /* Email map always overrides DB role — guaranteed correct redirect */
        var mappedRole = EMAIL_ROLE[email.toLowerCase().trim()];
        if (mappedRole) role = mappedRole;

        if (!ROLE_REDIRECT[role]) {
          showError('Access denied. This account does not have admin access.');
          setBtn(btn, false, 'Sign In to Admin Portal');
          return;
        }

        /* Store the JWT and user data role-specifically */
        localStorage.setItem('admin_token_' + role, token);
        localStorage.setItem('admin_user_' + role, JSON.stringify({
          name: email.split('@')[0],
          email: email,
          role: role
        }));

        console.log('[Admin Login] Role:', role, '→ Redirecting to:', ROLE_REDIRECT[role]);
        setBtn(btn, true, 'Redirecting…');

        setTimeout(function () {
          window.location.replace(ROLE_REDIRECT[role]);
        }, 250);
        return;
      }

      showError(res.message || 'Incorrect email or password. Please try again.');
      if (pwEl) pwEl.value = '';
      setBtn(btn, false, 'Sign In to Admin Portal');
    })
    .catch(function (err) {
      console.error('[Admin Login] Network error:', err);
      showError('Network error. Check that the Node.js server is running.');
      setBtn(btn, false, 'Sign In to Admin Portal');
    });
}

/* ── HELPERS ── */
function showError(msg) {
  var errEl = document.getElementById('formErr');
  var errTxt = document.getElementById('formErrTxt');
  if (errTxt) errTxt.textContent = msg;
  if (errEl) errEl.classList.add('show');
}

function setBtn(btn, disabled, text) {
  if (!btn) return;
  btn.disabled = disabled;
  btn.textContent = text;
}

function togglePw() {
  var inp = document.getElementById('pwIn');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}