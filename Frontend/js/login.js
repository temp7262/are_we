/* ============================================================
   login.js  |  JDCOEM Student Portal
   Flow: Login/Register → OTP sent → Verify OTP → home.html
   ============================================================ */

// Use smart API detection — if config.js already loaded API_BASE, reuse it;
// otherwise detect based on current host (works on Vercel, ngrok, localhost)
if (typeof API_BASE === 'undefined') {
    var API_BASE = (window.location.port === '3000')
        ? 'http://localhost:5000/api'
        : window.location.origin + '/api';
}
/* ── OTP PANEL INJECTED DYNAMICALLY ── */
(function injectOtpPanel() {
    const panel = document.createElement('div');
    panel.id = 'panel-otp';
    panel.className = 'form-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="alert alert-error"   id="otp-error"></div>
        <div class="alert alert-success" id="otp-success"></div>
        <div class="form-note">
            <strong>📧 OTP Sent!</strong>
            A 6-digit OTP has been sent to your college email.
            Please enter it below to verify your identity.
        </div>
        <div class="otp-email-display" id="otpEmailDisplay"
             style="text-align:center; font-weight:600; color:var(--saffron);
                    margin:8px 0 16px; font-size:15px;"></div>
        <div id="form-otp">
            <div class="form-row">
                <label for="otp-input">Enter OTP <span class="req">*</span></label>
                <div class="input-wrap">
                    <span class="input-icon">🔑</span>
                    <input type="text" id="otp-input" name="otp"
                           placeholder="Enter 6-digit OTP"
                           maxlength="6" autocomplete="one-time-code"
                           style="letter-spacing:12px; font-size:24px; text-align:center; width:100%; max-width:280px; margin: 0 auto; display:block; padding:12px;">
                </div>
            </div>
            <button type="button" class="submit-btn" id="otp-btn" onclick="handleVerifyOtp(null)">Verify OTP</button>
        </div>
        <div style="text-align:center; margin-top:14px; font-size:13px; color:var(--gray-500);">
            Didn't receive the OTP?
            <a href="javascript:void(0)" onclick="resendOtp()"
               style="color:var(--saffron); font-weight:600;">Resend OTP</a>
        </div>
        <div style="text-align:center; margin-top:10px; font-size:13px;">
            <a href="javascript:void(0)" onclick="backToLogin()"
               style="color:var(--gray-500);">← Back to Login</a>
        </div>
    `;

    const authCard = document.querySelector('.auth-card');
    if (authCard) authCard.appendChild(panel);
})();

/* ── STATE ── */
var _pendingEmail = '';   // email waiting for OTP verification
var _pendingPassword = '';   // password kept in memory for silent re-login cred save
var _pendingPayload = {}; // payload to send upon successful OTP
var _isRegistering = false;

/* ── TAB SWITCHER ── */
function switchTab(tab) {
    const btnLogin = document.getElementById('tab-login');
    const btnRegister = document.getElementById('tab-register');
    const panelLogin = document.getElementById('panel-login');
    const panelReg = document.getElementById('panel-register');
    const panelOtp = document.getElementById('panel-otp');

    if (panelOtp) panelOtp.style.display = 'none';

    if (tab === 'login') {
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        panelLogin.style.display = 'block';
        panelReg.style.display = 'none';
    } else {
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        panelReg.style.display = 'block';
        panelLogin.style.display = 'none';
    }

    document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
}

/* ── SHOW OTP PANEL ── */
function showOtpPanel(email) {
    _pendingEmail = email;

    document.getElementById('panel-login').style.display = 'none';
    document.getElementById('panel-register').style.display = 'none';
    document.getElementById('panel-otp').style.display = 'block';

    const tabSwitcher = document.querySelector('.tab-switcher');
    if (tabSwitcher) tabSwitcher.style.display = 'none';

    const emailDisplay = document.getElementById('otpEmailDisplay');
    if (emailDisplay) emailDisplay.textContent = email;

    setTimeout(() => {
        const inp = document.getElementById('otp-input');
        if (inp) inp.focus();
    }, 100);
}

/* ── BACK TO LOGIN ── */
function backToLogin() {
    _pendingEmail = '';
    _pendingPassword = '';
    _pendingPayload = {};
    document.getElementById('panel-otp').style.display = 'none';
    document.getElementById('panel-login').style.display = 'block';
    const tabSwitcher = document.querySelector('.tab-switcher');
    if (tabSwitcher) tabSwitcher.style.display = '';
    document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
}

/* ── ALERT HELPER ── */
function showAlert(id, msg) {
    document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
    const el = document.getElementById(id);
    if (!el) return;
    if (msg) el.textContent = msg;
    el.classList.add('show');
}

/* ── LOGIN ── */
async function handleLogin(event) {
    if (event) event.preventDefault();

    const email = document.getElementById('login-btid').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
        showAlert('login-error', 'Please enter your email and password.');
        return;
    }

    /* ── FIX: Block admin emails from student portal entirely.
       Admin accounts must use the Admin Portal (admin-portal/index.html).
       Checking client-side first for instant feedback — the backend
       also enforces this via OTP requirement, but this is cleaner UX. ── */
    var ADMIN_EMAILS = [
        'saar@jdcoem.ac.in',
        'skhod@jdcoem.ac.in',
        'sagar@jdcoem.ac.in',
        'clerk@jdcoem.ac.in',
        'hod@jdcoem.ac.in',
        'itclerk@jdcoem.ac.in',
        'ithod@jdcoem.ac.in',
        'civilclerk@jdcoem.ac.in',
        'civilhod@jdcoem.ac.in',
        'mechclerk@jdcoem.ac.in',
        'mechhod@jdcoem.ac.in',
        'entcclerk@jdcoem.ac.in',
        'entchod@jdcoem.ac.in',
        'chemclerk@jdcoem.ac.in',
        'chemhod@jdcoem.ac.in',
        'mbaclerk@jdcoem.ac.in',
        'mbahod@jdcoem.ac.in',
        'mcaclerk@jdcoem.ac.in',
        'mcahod@jdcoem.ac.in',
        'eclerk@jdcoem.ac.in',
        'ehod@jdcoem.ac.in',
        'ai-clerk@jdcoem.ac.in',
        'ai-hod@jdcoem.ac.in',
        'cyber-clerk@jdcoem.ac.in',
        'cyber-hod@jdcoem.ac.in'
    ];
    if (ADMIN_EMAILS.indexOf(email.toLowerCase().trim()) > -1) {
        showAlert('login-error', '⛔ Admin accounts cannot access the Student Portal. Please use the Admin Portal.');
        _pendingPassword = '';
        return;
    }


    /* SAVE: keep password in memory so we can store it after OTP success */
    _pendingPassword = password;
    _isRegistering = false;
    _pendingPayload = {}; // Not used for login

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        localStorage.removeItem('user_token');

        const response = await fetch(`${API_BASE}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        console.log('Login OTP result:', result);

        if (result.success === true) {
            showOtpPanel(email);
        } else {
            showAlert('login-error', result.message || 'Invalid credentials or OTP error.');
            _pendingPassword = '';
        }

    } catch (error) {
        console.error('Login error:', error);
        showAlert('login-error', 'Cannot connect to server. Please check the backend.');
        _pendingPassword = '';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/* ── REGISTER ── */
async function handleRegister(event) {
    if (event) event.preventDefault();

    const fname = document.getElementById('reg-fname').value.trim();
    const lname = document.getElementById('reg-lname').value.trim();
    const btid = document.getElementById('reg-btid').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const branch = document.getElementById('reg-branch').value;
    const year = document.getElementById('reg-year').value;
    const mobile = document.getElementById('reg-mobile').value.trim();
    const pass = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const terms = document.getElementById('terms-check').checked;
    const btn = document.getElementById('reg-btn');

    if (!fname || !lname || !btid || !email || !branch || !year || !mobile || !pass || !confirm) {
        showAlert('reg-error', 'Please fill in all required fields.');
        return;
    }
    if (!email.endsWith('@jdcoem.ac.in')) {
        showAlert('reg-error', 'Only @jdcoem.ac.in email addresses are accepted.');
        return;
    }
    if (pass !== confirm) {
        showAlert('reg-error', 'Passwords do not match. Please try again.');
        return;
    }
    if (!terms) {
        showAlert('reg-error', 'You must accept the Terms of Use and Privacy Policy.');
        return;
    }

    /* SAVE config for silent re-login after OTP */
    _pendingPassword = pass;
    _isRegistering = true;
    _pendingPayload = {
        name: fname + ' ' + lname,
        email,
        password: pass,
        role: "student"
    };

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        console.log('Register OTP result:', data);

        if (data.success === true) {
            showOtpPanel(email);
        } else {
            showAlert('reg-error', data.message || 'Failed to request registration OTP. Try again.');
            _pendingPassword = '';
        }

    } catch (error) {
        console.error('Register error:', error);
        showAlert('reg-error', 'Cannot connect to backend server.');
        _pendingPassword = '';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/* ── VERIFY OTP ── */
async function handleVerifyOtp(event) {
    if (event) event.preventDefault();

    const otp = document.getElementById('otp-input').value.trim();
    const btn = document.getElementById('otp-btn');

    if (!otp || otp.length !== 6) {
        showAlert('otp-error', 'Please enter exactly 6 digits.');
        return;
    }
    if (!_pendingEmail) {
        showAlert('otp-error', 'Session expired. Please login again.');
        backToLogin();
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        let endpoint = _isRegistering ? '/auth/register' : '/auth/login/student';
        let bodyPayload = _isRegistering ? 
            { ..._pendingPayload, otp } : 
            { email: _pendingEmail, password: _pendingPassword, otp };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        const result = await response.json();
        console.log('OTP Verify result:', result);

            if (result.success === true) {
                // Save Node JWT Token
                localStorage.setItem('user_token', result.data.token);
                localStorage.setItem('role', result.data.role || 'student');

                // NEW: Fetch full user profile for home.html
                try {
                    const profResp = await fetch(`${API_BASE}/auth/me`, {
                        headers: { 'Authorization': 'Bearer ' + result.data.token }
                    });
                    const profData = await profResp.json();
                    if (profData.success) {
                        localStorage.setItem('user', JSON.stringify(profData.data));
                    }
                } catch (pe) { console.error('Profile fetch failed', pe); }

                showAlert('otp-success', 'Verified! Redirecting to Dashboard…');

                setTimeout(() => {
                    window.location.href = 'home.html?v=' + Date.now();
                }, 1000);
            } else {
                showAlert('otp-error', result.message || 'Invalid or expired OTP. Please try again.');
            }

    } catch (error) {
        console.error('OTP error:', error);
        showAlert('otp-error', 'Cannot connect to server. Please try again.');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/* ── RESEND OTP ── */
async function resendOtp() {
    if (!_pendingEmail) return;

    try {
        await fetch(`${API_BASE}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: _pendingEmail })
        });
        showAlert('otp-success', 'OTP resent to ' + _pendingEmail);
    } catch (e) {
        showAlert('otp-error', 'Failed to resend OTP. Please try again.');
    }
}

/* ── HELPER: Password Toggle ── */
function togglePassword(id, btn) {
    const input = document.getElementById(id);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
    } else {
        input.type = 'password';
        btn.textContent = 'Show';
    }
}

function togglePasswordCheckbox(id, checkbox) {
    const input = document.getElementById(id);
    if (input) input.type = checkbox.checked ? 'text' : 'password';
}

/* ── HELPER: Password Strength ── */
function checkStrength(val) {
    const fill = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (!fill || !label) return;

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#e74c3c', '#f39c12', '#3498db', '#27ae60'];
    const widths = ['0%', '25%', '50%', '75%', '100%'];

    fill.style.width = widths[score];
    fill.style.background = colors[score];
    label.textContent = 'Strength: ' + (levels[score] || '–');
}

/* ── HELPER: Forgot Password ── */
function showForgotAlert() {
    alert('Please contact the Academic Section at Block A, Room 101, or email support@jdcoem.ac.in');
}