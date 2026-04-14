/* ================================================
   documents.js — Available Documents Page
   JDCOEM Digital Document Services Portal
   Connected to Backend API
   ================================================ */

// Smart API detection (works on Vercel, ngrok, localhost)
var API_BASE = (window.location.port === '3000')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('user_token')
    };
}

/* ── DOCUMENT PAGE ROUTING MAP ── */
var DOC_PAGES = {
  admission: 'admission.html',
  idcard: 'idcard.html',
  bonafide: 'bonafide.html',
  feereceipt: 'feereceipt.html',
  hallticket: 'hallticket.html',
  marksheet: 'marksheet.html',
  provisional: 'provisional.html',
  degree: 'degree.html',
  leaving: 'leaving.html',
  migration: 'migration.html',
  character: 'character.html',
  noc: 'noc.html',
  transcript: 'transcript.html',
};

/* ── NAVIGATE TO APPLICATION FORM ── */
function applyFor(type) {
  localStorage.setItem('selectedDocument', type);
  window.location.href = DOC_PAGES[type] || 'apply-document.html';
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', function () {

  /* ── 1. Auth guard — check localStorage first ── */
  var raw = localStorage.getItem('user');
  if (!raw) { window.location.href = 'login.html'; return; }

  var u = JSON.parse(raw);
  var name = u.name || u.btid || 'Student';
  var initials = name.split(' ').filter(Boolean).map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

  /* ── 2. Fill header immediately from localStorage (no flicker) ── */
  document.getElementById('userInitials').textContent = initials;
  document.getElementById('userName').textContent = name;

  /* ── 3. Verify session ── */
  fetch(API_BASE + '/auth/me', { headers: getAuthHeaders() })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success && !res.data) {
        /* Session expired — clear and redirect */
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      /* Update localStorage with fresh data from server */
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
        var freshName = res.data.name || res.data.btid || 'Student';
        var freshInitials = freshName.split(' ').filter(Boolean).map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
        document.getElementById('userInitials').textContent = freshInitials;
        document.getElementById('userName').textContent = freshName;
      }
    })
    .catch(function () {
      /* Network error — keep showing localStorage data, don't redirect */
    });

  /* ── 4. Load real application count ── */
  fetch(API_BASE + '/applications/my', { headers: getAuthHeaders() })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res.success && res.data) {
        var badge = document.querySelector('.nav-badge');
        if (badge) badge.textContent = res.data.length;
      }
    })
    .catch(function () { }); /* silent fail */

  /* ── 5. Staggered card entrance animation ── */
  document.querySelectorAll('.doc-card').forEach(function (card, i) {
    card.style.animationDelay = (i * 0.05) + 's';
  });
});

/* ── ACTIVE FILTER STATE ── */
var activeFilter = 'all';

/* ── SET CATEGORY FILTER ── */
function setFilter(btn, filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(function (b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  filterCards();
}

/* ── FILTER / SEARCH CARDS ── */
function filterCards() {
  var query = document.getElementById('searchInput').value.toLowerCase().trim();
  var cards = document.querySelectorAll('.doc-card');

  var visible = 0;
  var academicVisible = 0;
  var conductVisible = 0;

  cards.forEach(function (card) {
    var cat = card.dataset.cat;
    var fee = card.dataset.fee;
    var keywords = card.dataset.keywords || '';
    var title = card.querySelector('.card-title').textContent.toLowerCase();
    var desc = card.querySelector('.card-desc').textContent.toLowerCase();

    var matchSearch = !query
      || title.includes(query)
      || desc.includes(query)
      || keywords.includes(query);

    var matchFilter = activeFilter === 'all'
      || (activeFilter === 'academic' && cat === 'academic')
      || (activeFilter === 'conduct' && cat === 'conduct')
      || (activeFilter === 'free' && fee === 'free');

    var show = matchSearch && matchFilter;
    card.style.display = show ? '' : 'none';

    if (show) {
      visible++;
      if (cat === 'academic') academicVisible++;
      if (cat === 'conduct') conductVisible++;
    }
  });

  /* Update counts */
  document.getElementById('visibleCount').textContent = visible;
  document.getElementById('count-academic').textContent = academicVisible + ' document' + (academicVisible !== 1 ? 's' : '');
  document.getElementById('count-conduct').textContent = conductVisible + ' document' + (conductVisible !== 1 ? 's' : '');

  /* Show/hide category sections based on results */
  document.getElementById('cat-academic').style.display = academicVisible > 0 ? '' : 'none';
  document.getElementById('cat-conduct').style.display = conductVisible > 0 ? '' : 'none';

  /* Toggle empty state */
  document.getElementById('emptyState').classList.toggle('show', visible === 0);
}

/* ── LOGOUT (connected to backend) ── */
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch(API_BASE + '/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    }).finally(function () {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
}