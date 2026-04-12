/**
 * config.js — Student Portal Shared Config
 * Include this BEFORE your page's own JS script in every HTML file.
 *
 * Usage in HTML:
 *   <script src="../js/config.js"></script>
 *   <script src="../js/dashboard.js"></script>
 */

// Smart API detection for both local dev and ngrok/deployment
const API_BASE = (window.location.port === '3000') 
  ? 'http://localhost:5000/api' 
  : window.location.origin + '/api';

/** Get the Authorization header object for authenticated requests */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/**
 * authFetch(url, options)
 * Drop-in replacement for fetch() that automatically:
 *  - Attaches the JWT Authorization header
 *  - Removes credentials: 'include' (PHP cookie mode)
 */
function authFetch(url, options) {
  options = options || {};
  // Merge auth header with any existing headers
  options.headers = Object.assign({}, options.headers || {}, getAuthHeaders());
  // Remove PHP cookie mode
  delete options.credentials;
  return fetch(url, options);
}

/** Logout: client-side only (JWT is stateless) */
function doLogout(redirectUrl) {
  localStorage.clear();
  window.location.href = redirectUrl || 'login.html';
}
