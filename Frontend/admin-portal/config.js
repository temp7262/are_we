/**
 * config.js — Admin Portal Shared Config
 * Include this BEFORE the admin page's own JS script in every admin HTML file.
 *
 * Usage in HTML:
 *   <script src="config.js"></script>
 *   <script src="clerk.js"></script>
 */

// Smart API detection for both local dev and ngrok/deployment
const API_BASE = (window.location.port === '3000') 
  ? 'http://localhost:5000/api' 
  : window.location.origin + '/api';
// Alias used by clerk.js / hod.js / principal.js which declare `var API = ...`
var API = API_BASE;

/** Get the Authorization header for the current admin role */
function getAuthHeaders(role) {
  // Try role-specific token first, fall back to generic admin_token
  const tokenKey = role ? ('admin_token_' + role) : 'admin_token';
  const token = localStorage.getItem(tokenKey) || localStorage.getItem('admin_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/**
 * authFetch(url, options, role)
 * Drop-in replacement for fetch() in admin JS files.
 */
function authFetch(url, options, role) {
  options = options || {};
  options.headers = Object.assign({}, options.headers || {}, getAuthHeaders(role));
  delete options.credentials;
  return fetch(url, options);
}

/** Admin logout: remove role-specific keys + redirect */
function doLogout(role, redirectUrl) {
  if (role) {
    localStorage.removeItem('admin_user_' + role);
    localStorage.removeItem('admin_creds_' + role);
    localStorage.removeItem('admin_token_' + role);
  }
  localStorage.removeItem('admin_token');
  window.location.replace(redirectUrl || 'index.html');
}
