/* ============================================================
   CLINIC OPD PWA — APP.JS
   Vanilla ES6. No frameworks, no external libraries.
   ============================================================ */

'use strict';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
// TODO: Replace this with YOUR deployed Google Apps Script Web App URL.
// See README.md section "Connect HTML with Apps Script" for instructions.
const API_URL = 'https://script.google.com/macros/s/AKfycbyuhfkHMBufCURJbkXpx2Xkx_T2ztxa96GjNXRzFXxHvA8mLgWTVKU-1iY43x3c-cWaBQ/exec';

const SESSION_KEY = 'clinic_logged_in';
const DRAFT_KEY = 'clinic_form_draft'; // autosave draft while offline

// ----------------------------------------------------------------------------
// DOM REFERENCES
// ----------------------------------------------------------------------------
const els = {
  // Login
  screenLogin: document.getElementById('screen-login'),
  loginForm: document.getElementById('login-form'),
  loginPassword: document.getElementById('login-password'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),
  togglePassword: document.getElementById('toggle-password'),

  // App shell
  appShell: document.getElementById('app-shell'),
  appBarHeading: document.getElementById('app-bar-heading'),
  logoutBtn: document.getElementById('logout-btn'),
  appContent: document.getElementById('app-content'),

  // Views
  viewDashboard: document.getElementById('view-dashboard'),
  viewRegister: document.getElementById('view-register'),
  viewSearch: document.getElementById('view-search'),
  navBtns: document.querySelectorAll('.nav-btn'),

  // Dashboard
  dashTodayCount: document.getElementById('dash-today-count'),
  dashLastOP: document.getElementById('dash-last-op'),
  dashLatestPatient: document.getElementById('dash-latest-patient'),
  dashNewPatientBtn: document.getElementById('dash-new-patient-btn'),

  // Form
  patientForm: document.getElementById('patient-form'),
  opPreview: document.getElementById('op-preview'),
  fDate: document.getElementById('f-date'),
  fName: document.getElementById('f-name'),
  fAddress: document.getElementById('f-address'),
  fAge: document.getElementById('f-age'),
  fSex: document.getElementById('f-sex'),
  fComplaint: document.getElementById('f-complaint'),
  fInvestigation: document.getElementById('f-investigation'),
  fPrescription: document.getElementById('f-prescription'),
  fReview: document.getElementById('f-review'),
  clearBtn: document.getElementById('clear-btn'),
  submitBtn: document.getElementById('submit-btn'),

  // Search
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),

  // History modal
  historyModal: document.getElementById('history-modal'),
  historyModalTitle: document.getElementById('history-modal-title'),
  historyModalBody: document.getElementById('history-modal-body'),
  historyCloseBtn: document.getElementById('history-close-btn'),

  // Feedback
  toast: document.getElementById('toast'),
  offlineBanner: document.getElementById('offline-banner'),
  retryBtn: document.getElementById('retry-btn'),
  successOverlay: document.getElementById('success-overlay'),
  successOpText: document.getElementById('success-op-text'),
  loadingOverlay: document.getElementById('loading-overlay'),
};

// ----------------------------------------------------------------------------
// API HELPER
// ----------------------------------------------------------------------------

/**
 * Calls the Google Apps Script Web App.
 * Uses POST with text/plain content-type to avoid CORS preflight issues
 * (Apps Script Web Apps don't support the OPTIONS preflight request).
 */
async function callApi(action, payload = {}) {
  if (!navigator.onLine) {
    throw new Error('OFFLINE');
  }
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) {
      throw new Error('Server error (' + response.status + ')');
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message === 'OFFLINE') {
      throw new Error('OFFLINE');
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// TOAST / FEEDBACK
// ----------------------------------------------------------------------------

let toastTimer = null;
function showToast(message, type = '') {
  els.toast.textContent = message;
  els.toast.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3200);
}

function showLoading(show) {
  els.loadingOverlay.classList.toggle('hidden', !show);
}

function setBtnLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = loading;
  if (spinner) spinner.classList.toggle('hidden', !loading);
  if (text) text.style.opacity = loading ? '0.55' : '1';
}

// Ripple effect for buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.ripple');
  if (!btn) return;
  btn.classList.remove('rippling');
  // Force reflow to restart animation
  void btn.offsetWidth;
  btn.classList.add('rippling');
});

// ----------------------------------------------------------------------------
// OFFLINE HANDLING
// ----------------------------------------------------------------------------

function updateOnlineStatus() {
  const offline = !navigator.onLine;
  els.offlineBanner.classList.toggle('hidden', !offline);
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
els.retryBtn.addEventListener('click', () => {
  updateOnlineStatus();
  if (navigator.onLine) {
    showToast('Back online.', 'success');
    if (els.viewDashboard.classList.contains('active')) loadDashboard();
  } else {
    showToast('Still no internet connection.', 'error');
  }
});

// ----------------------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------------------

els.togglePassword.addEventListener('click', () => {
  const isPassword = els.loginPassword.type === 'password';
  els.loginPassword.type = isPassword ? 'text' : 'password';
});

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.classList.add('hidden');
  const password = els.loginPassword.value.trim();

  if (!password) {
    showLoginError('Please enter the password.');
    return;
  }

  setBtnLoading(els.loginBtn, true);
  try {
    await callApi('login', { password });
    sessionStorage.setItem(SESSION_KEY, '1');
    enterApp();
  } catch (err) {
    if (err.message === 'OFFLINE') {
      showLoginError('No internet connection. Please connect and try again.');
    } else {
      showLoginError(err.message || 'Login failed. Please try again.');
    }
  } finally {
    setBtnLoading(els.loginBtn, false);
  }
});

function showLoginError(msg) {
  els.loginError.textContent = msg;
  els.loginError.classList.remove('hidden');
}

els.logoutBtn.addEventListener('click', () => {
  if (confirm('Log out of the clinic app?')) {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }
});

function enterApp() {
  els.screenLogin.classList.remove('active');
  els.appShell.classList.remove('hidden');
  loadDashboard();
  prepareNewForm();
}

// ----------------------------------------------------------------------------
// NAVIGATION (bottom nav + dashboard shortcut)
// ----------------------------------------------------------------------------

const viewMap = {
  dashboard: { el: els.viewDashboard, title: 'Dashboard' },
  register: { el: els.viewRegister, title: 'New Patient' },
  search: { el: els.viewSearch, title: 'Search Records' },
};

function switchView(viewName) {
  Object.entries(viewMap).forEach(([key, { el }]) => {
    el.classList.toggle('active', key === viewName);
  });
  els.navBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  els.appBarHeading.textContent = viewMap[viewName].title;
  els.appContent.scrollTop = 0;

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'register') prepareNewForm();
}

els.navBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
els.dashNewPatientBtn.addEventListener('click', () => switchView('register'));

// ----------------------------------------------------------------------------
// DASHBOARD
// ----------------------------------------------------------------------------

async function loadDashboard() {
  if (!navigator.onLine) {
    updateOnlineStatus();
    return;
  }
  try {
    const data = await callApi('getDashboard');
    els.dashTodayCount.textContent = data.todayCount;
    els.dashLastOP.textContent = data.lastOPNumber || '-';
    renderLatestPatient(data.latestPatient);
  } catch (err) {
    if (err.message !== 'OFFLINE') {
      console.error('Dashboard load error:', err);
    }
  }
}

function renderLatestPatient(patient) {
  if (!patient) {
    els.dashLatestPatient.innerHTML = 'No patients registered yet today.';
    els.dashLatestPatient.className = 'latest-patient-empty';
    return;
  }
  els.dashLatestPatient.className = '';
  els.dashLatestPatient.innerHTML = `
    <div class="patient-mini-card">
      <div class="patient-avatar">${getInitials(patient.name)}</div>
      <div class="patient-mini-info">
        <h4>${escapeHtml(patient.name)}</h4>
        <p>${escapeHtml(patient.age)} yrs • ${escapeHtml(patient.sex)}</p>
        <span class="op-chip">${escapeHtml(patient.opNumber)}</span>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// REGISTRATION FORM
// ----------------------------------------------------------------------------

function prepareNewForm() {
  // Default date = today
  if (!els.fDate.value) {
    els.fDate.value = new Date().toISOString().slice(0, 10);
  }
  refreshOPPreview();
}

async function refreshOPPreview() {
  els.opPreview.textContent = 'Loading…';
  if (!navigator.onLine) {
    els.opPreview.textContent = 'Available when online';
    return;
  }
  try {
    const data = await callApi('getNextOPNumber');
    els.opPreview.textContent = data.opNumber;
  } catch (err) {
    els.opPreview.textContent = 'Auto-generated on save';
  }
}

const requiredFields = [
  { el: els.fDate, name: 'Date' },
  { el: els.fName, name: 'Patient Name' },
  { el: els.fAddress, name: 'Address' },
  { el: els.fAge, name: 'Age' },
  { el: els.fSex, name: 'Sex' },
  { el: els.fComplaint, name: 'Chief Complaint' },
];

function validateForm() {
  let valid = true;
  let firstInvalid = null;

  requiredFields.forEach(({ el }) => {
    const value = el.value.trim();
    const isEmpty = value === '';
    el.classList.toggle('invalid', isEmpty);
    if (isEmpty) {
      valid = false;
      if (!firstInvalid) firstInvalid = el;
    }
  });

  // Age must be numeric (already enforced by type=number, double check)
  const age = els.fAge.value.trim();
  if (age && (isNaN(Number(age)) || Number(age) < 0)) {
    els.fAge.classList.add('invalid');
    valid = false;
    if (!firstInvalid) firstInvalid = els.fAge;
  }

  if (!valid && firstInvalid) {
    firstInvalid.focus();
    showToast('Please fill all required fields correctly.', 'error');
  }

  return valid;
}

// Clear invalid state as user types
[els.fDate, els.fName, els.fAddress, els.fAge, els.fSex, els.fComplaint].forEach((el) => {
  el.addEventListener('input', () => el.classList.remove('invalid'));
  el.addEventListener('change', () => el.classList.remove('invalid'));
});

els.clearBtn.addEventListener('click', () => {
  if (confirm('Clear all fields in this form?')) {
    els.patientForm.reset();
    requiredFields.forEach(({ el }) => el.classList.remove('invalid'));
    prepareNewForm();
  }
});

els.patientForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!navigator.onLine) {
    showToast('No internet connection. Cannot save right now.', 'error');
    updateOnlineStatus();
    return;
  }

  if (!validateForm()) return;

  const payload = {
    date: els.fDate.value,
    name: els.fName.value.trim(),
    address: els.fAddress.value.trim(),
    age: els.fAge.value.trim(),
    sex: els.fSex.value,
    complaint: els.fComplaint.value.trim(),
    investigation: els.fInvestigation.value.trim(),
    prescription: els.fPrescription.value.trim(),
    review: els.fReview.value.trim(),
  };

  setBtnLoading(els.submitBtn, true);
  try {
    const result = await callApi('saveRecord', payload);
    showSuccessOverlay(result.opNumber);
    els.patientForm.reset();
    prepareNewForm();
  } catch (err) {
    if (err.message === 'OFFLINE') {
      showToast('No internet connection. Please retry once online.', 'error');
    } else {
      showToast(err.message || 'Could not save record. Please try again.', 'error');
    }
  } finally {
    setBtnLoading(els.submitBtn, false);
  }
});

function showSuccessOverlay(opNumber) {
  els.successOpText.textContent = 'OP Number: ' + opNumber;
  els.successOverlay.classList.remove('hidden');
  // Restart the check-mark animation
  const circle = els.successOverlay.querySelector('.success-circle');
  const tick = els.successOverlay.querySelector('.success-tick');
  [circle, tick].forEach((elm) => {
    elm.style.animation = 'none';
    void elm.offsetWidth;
    elm.style.animation = '';
  });

  setTimeout(() => {
    els.successOverlay.classList.add('hidden');
    switchView('dashboard');
  }, 1600);
}

// ----------------------------------------------------------------------------
// SEARCH
// ----------------------------------------------------------------------------

let searchDebounce = null;
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const query = els.searchInput.value.trim();
  if (!query) {
    renderSearchEmpty();
    return;
  }
  searchDebounce = setTimeout(() => performSearch(query), 400);
});

function renderSearchEmpty() {
  els.searchResults.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>Search for a patient by name or OP number to view their records.</p>
    </div>
  `;
}

async function performSearch(query) {
  if (!navigator.onLine) {
    showToast('No internet connection. Search unavailable offline.', 'error');
    return;
  }
  els.searchResults.innerHTML = `<div class="empty-state"><div class="spinner spinner-large"></div></div>`;
  try {
    const data = await callApi('searchRecords', { query });
    renderSearchResults(data.results);
  } catch (err) {
    els.searchResults.innerHTML = `
      <div class="empty-state">
        <p>${err.message === 'OFFLINE' ? 'No internet connection.' : 'Search failed. Please try again.'}</p>
      </div>
    `;
  }
}

function renderSearchResults(results) {
  if (!results || results.length === 0) {
    els.searchResults.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <p>No matching patient records found.</p>
      </div>
    `;
    return;
  }

  // Deduplicate by name for the result list (search shows unique patients,
  // tapping opens full history of all their visits)
  const seen = new Set();
  const uniquePatients = [];
  results.forEach((r) => {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniquePatients.push(r);
    }
  });

  els.searchResults.innerHTML = uniquePatients.map((r) => `
    <div class="result-card" data-name="${escapeHtml(r.name)}">
      <div class="patient-avatar">${getInitials(r.name)}</div>
      <div class="patient-mini-info">
        <h4>${escapeHtml(r.name)}</h4>
        <p>${escapeHtml(r.age)} yrs • ${escapeHtml(r.sex)} • ${escapeHtml(r.date)}</p>
        <span class="op-chip">${escapeHtml(r.opNumber)}</span>
      </div>
    </div>
  `).join('');

  els.searchResults.querySelectorAll('.result-card').forEach((card) => {
    card.addEventListener('click', () => openPatientHistory(card.dataset.name));
  });
}

// ----------------------------------------------------------------------------
// PATIENT HISTORY MODAL
// ----------------------------------------------------------------------------

async function openPatientHistory(name) {
  els.historyModalTitle.textContent = name;
  els.historyModalBody.innerHTML = `<div class="empty-state"><div class="spinner spinner-large"></div></div>`;
  els.historyModal.classList.remove('hidden');

  try {
    const data = await callApi('getPatientHistory', { name });
    renderHistory(data.history);
  } catch (err) {
    els.historyModalBody.innerHTML = `
      <div class="empty-state">
        <p>${err.message === 'OFFLINE' ? 'No internet connection.' : 'Could not load history.'}</p>
      </div>
    `;
  }
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    els.historyModalBody.innerHTML = `<div class="empty-state"><p>No visit records found.</p></div>`;
    return;
  }

  els.historyModalBody.innerHTML = history.map((v) => `
    <div class="visit-card">
      <div class="visit-card-header">
        <span class="visit-date">${escapeHtml(v.date)}</span>
        <span class="visit-op">${escapeHtml(v.opNumber)}</span>
      </div>
      <div class="visit-row"><span class="label">Chief Complaint</span><span class="value">${escapeHtml(v.complaint || '—')}</span></div>
      ${v.investigation ? `<div class="visit-row"><span class="label">Investigation</span><span class="value">${escapeHtml(v.investigation)}</span></div>` : ''}
      <div class="visit-row"><span class="label">Prescription</span><span class="value">${escapeHtml(v.prescription || '—')}</span></div>
      ${v.review ? `<div class="visit-row"><span class="label">Review</span><span class="value">${escapeHtml(v.review)}</span></div>` : ''}
    </div>
  `).join('');
}

els.historyCloseBtn.addEventListener('click', closeHistoryModal);
els.historyModal.addEventListener('click', (e) => {
  if (e.target === els.historyModal) closeHistoryModal();
});
function closeHistoryModal() {
  els.historyModal.classList.add('hidden');
}

// ----------------------------------------------------------------------------
// UTILITIES
// ----------------------------------------------------------------------------

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]).join('');
  return initials.toUpperCase();
}

// ----------------------------------------------------------------------------
// SERVICE WORKER REGISTRATION
// ----------------------------------------------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// ----------------------------------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------------------------------

updateOnlineStatus();

if (sessionStorage.getItem(SESSION_KEY) === '1') {
  enterApp();
}
