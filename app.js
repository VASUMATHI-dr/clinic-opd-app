/* ============================================================
   CLINIC OPD PWA — APP.JS v2
   Google Sheets API backend. English UI. No frameworks.
   ============================================================ */

'use strict';

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbzPvvthKOoYQyZnwBG7-Zdh-tUNT9P9XQFNs557tYXbyjjcFR8jh8DWdK7jga6mP8rz_g/exec';
const SESSION_KEY = 'clinic_logged_in';

// State for "Return Visit" mode
let selectedPatient = null;
let currentHistoryName = null;

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
  viewPatients: document.getElementById('view-patients'),
  viewRegister: document.getElementById('view-register'),
  viewSearch: document.getElementById('view-search'),
  navBtns: document.querySelectorAll('.nav-btn'),

  // Dashboard
  dashTodayCount: document.getElementById('dash-today-count'),
  dashLastOP: document.getElementById('dash-last-op'),
  dashLatestPatient: document.getElementById('dash-latest-patient'),
  dashNewPatientBtn: document.getElementById('dash-new-patient-btn'),

  // Patients list
  patientsFilter: document.getElementById('patients-filter'),
  patientsListContainer: document.getElementById('patients-list-container'),
  patientsCountBadge: document.getElementById('patients-count-badge'),

  // Register mode
  modeNew: document.getElementById('mode-new'),
  modeVisit: document.getElementById('mode-visit'),
  patientFormWrap: document.getElementById('patient-form'),
  visitFormWrap: document.getElementById('visit-form-wrap'),

  // New patient form
  patientForm: document.getElementById('patient-form'),
  opPreview: document.getElementById('op-preview'),
  fDate: document.getElementById('f-date'),
  fName: document.getElementById('f-name'),
  fAge: document.getElementById('f-age'),
  fSex: document.getElementById('f-sex'),
  fPhone: document.getElementById('f-phone'),
  fAddress: document.getElementById('f-address'),
  fComplaint: document.getElementById('f-complaint'),
  fInvestigation: document.getElementById('f-investigation'),
  fPrescription: document.getElementById('f-prescription'),
  fReview: document.getElementById('f-review'),
  clearBtn: document.getElementById('clear-btn'),
  submitBtn: document.getElementById('submit-btn'),

  // Visit form
  visitSearch: document.getElementById('visit-search'),
  visitSearchResults: document.getElementById('visit-search-results'),
  selectedPatientCard: document.getElementById('selected-patient-card'),
  visitForm: document.getElementById('visit-form'),
  visitOpPreview: document.getElementById('visit-op-preview'),
  vDate: document.getElementById('v-date'),
  vComplaint: document.getElementById('v-complaint'),
  vInvestigation: document.getElementById('v-investigation'),
  vPrescription: document.getElementById('v-prescription'),
  vReview: document.getElementById('v-review'),
  lastVisitBox: document.getElementById('last-visit-box'),
  visitClearBtn: document.getElementById('visit-clear-btn'),
  visitSubmitBtn: document.getElementById('visit-submit-btn'),

  // Search
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),

  // History modal
  historyModal: document.getElementById('history-modal'),
  historyModalTitle: document.getElementById('history-modal-title'),
  historyModalSub: document.getElementById('history-modal-sub'),
  historyAvatar: document.getElementById('history-avatar'),
  historyModalBody: document.getElementById('history-modal-body'),
  historyCloseBtn: document.getElementById('history-close-btn'),
  historyEditBtn: document.getElementById('history-edit-btn'),

  // Edit modal
  editModal: document.getElementById('edit-modal'),
  editCloseBtn: document.getElementById('edit-close-btn'),
  editCancelBtn: document.getElementById('edit-cancel-btn'),
  editForm: document.getElementById('edit-form'),
  editOpNumber: document.getElementById('edit-op-number'),
  editName: document.getElementById('edit-name'),
  editAge: document.getElementById('edit-age'),
  editSex: document.getElementById('edit-sex'),
  editPhone: document.getElementById('edit-phone'),
  editAddress: document.getElementById('edit-address'),
  editSaveBtn: document.getElementById('edit-save-btn'),

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
async function callApi(action, payload = {}) {
  if (!navigator.onLine) throw new Error('OFFLINE');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) throw new Error('Server error (' + response.status + ')');
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Request failed.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message === 'OFFLINE') throw new Error('OFFLINE');
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
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
}

function setBtnLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = loading;
  if (spinner) spinner.classList.toggle('hidden', !loading);
  if (text) text.style.opacity = loading ? '0.55' : '1';
}

// Ripple
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.ripple');
  if (!btn) return;
  btn.classList.remove('rippling');
  void btn.offsetWidth;
  btn.classList.add('rippling');
});

// ----------------------------------------------------------------------------
// OFFLINE
// ----------------------------------------------------------------------------
function updateOnlineStatus() {
  els.offlineBanner.classList.toggle('hidden', navigator.onLine);
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
els.retryBtn.addEventListener('click', () => {
  updateOnlineStatus();
  if (navigator.onLine) {
    showToast('Back online!', 'success');
    if (els.viewDashboard.classList.contains('active')) loadDashboard();
  } else {
    showToast('Still no internet connection.', 'error');
  }
});

// ----------------------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------------------
els.togglePassword.addEventListener('click', () => {
  const isPwd = els.loginPassword.type === 'password';
  els.loginPassword.type = isPwd ? 'text' : 'password';
});

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.classList.add('hidden');
  const password = els.loginPassword.value.trim();
  if (!password) { showLoginError('Please enter the password.'); return; }
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

// Screen state machine
function showLoginScreen() {
  els.appShell.classList.add('hidden');
  els.screenLogin.classList.remove('hidden');
  els.screenLogin.classList.add('active');
  window.scrollTo(0, 0);
}
function showAppShell() {
  els.screenLogin.classList.remove('active');
  els.screenLogin.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  window.scrollTo(0, 0);
  els.appContent.scrollTop = 0;
}
function enterApp() {
  showAppShell();
  loadDashboard();
  prepareNewForm();
}

// ----------------------------------------------------------------------------
// NAVIGATION
// ----------------------------------------------------------------------------
const viewMap = {
  dashboard: { el: els.viewDashboard, title: 'Dashboard' },
  patients: { el: els.viewPatients, title: 'Patients List' },
  register: { el: els.viewRegister, title: 'Register / Visit' },
  search: { el: els.viewSearch, title: 'Search Records' },
};

function switchView(viewName) {
  Object.entries(viewMap).forEach(([key, { el }]) => el.classList.toggle('active', key === viewName));
  els.navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
  els.appBarHeading.textContent = viewMap[viewName].title;
  els.appContent.scrollTop = 0;

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'register') prepareNewForm();
  if (viewName === 'patients') loadPatientsList();
}

els.navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
els.dashNewPatientBtn.addEventListener('click', () => switchView('register'));

// ----------------------------------------------------------------------------
// DASHBOARD
// ----------------------------------------------------------------------------
async function loadDashboard() {
  if (!navigator.onLine) { updateOnlineStatus(); return; }
  try {
    const data = await callApi('getDashboard');
    els.dashTodayCount.textContent = data.todayCount;
    els.dashLastOP.textContent = data.lastOPNumber || '-';
    renderLatestPatient(data.latestPatient);
  } catch (err) {
    if (err.message !== 'OFFLINE') console.error('Dashboard error:', err);
  }
}

function renderLatestPatient(patient) {
  if (!patient) {
    els.dashLatestPatient.innerHTML = 'No patients registered today yet.';
    els.dashLatestPatient.className = 'latest-patient-empty';
    return;
  }
  els.dashLatestPatient.className = '';
  els.dashLatestPatient.innerHTML = `
    <div class="patient-mini-card">
      <div class="patient-avatar">${getInitials(patient.name)}</div>
      <div class="patient-mini-info">
        <h4>${escapeHtml(patient.name)}</h4>
        <p>${escapeHtml(String(patient.age))} yrs &bull; ${escapeHtml(patient.sex)}</p>
        <span class="op-chip">${escapeHtml(patient.opNumber)}</span>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// PATIENTS LIST VIEW
// ----------------------------------------------------------------------------
let allPatientsCache = [];

async function loadPatientsList() {
  if (!navigator.onLine) {
    showToast('Internet connection required to load patients.', 'error');
    return;
  }
  els.patientsListContainer.innerHTML = `<div class="empty-state"><div class="spinner spinner-large"></div><p>Loading…</p></div>`;
  try {
    const data = await callApi('getAllPatients');
    allPatientsCache = data.patients || [];
    renderPatientsList(allPatientsCache);
  } catch (err) {
    // Fallback: broad search
    try {
      const data2 = await callApi('searchRecords', { query: ' ' });
      allPatientsCache = deduplicatePatients(data2.results || []);
      renderPatientsList(allPatientsCache);
    } catch {
      els.patientsListContainer.innerHTML = `<div class="empty-state"><p>Could not load patient list. Please try again.</p></div>`;
    }
  }
}

function deduplicatePatients(records) {
  const map = new Map();
  records.forEach(r => {
    const key = r.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { ...r, visitCount: 1 });
    } else {
      map.get(key).visitCount++;
    }
  });
  return Array.from(map.values());
}

function renderPatientsList(patients) {
  els.patientsCountBadge.textContent = `${patients.length} Patient${patients.length !== 1 ? 's' : ''}`;

  if (!patients || patients.length === 0) {
    els.patientsListContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>No patients registered yet.</p>
      </div>
    `;
    return;
  }

  const rows = patients.map((p) => {
    const sexClass = p.sex === 'Male' ? 'male' : p.sex === 'Female' ? 'female' : 'other';
    const visitCount = p.visitCount || 1;
    const formattedDate = formatDate(p.date);

    return `
      <tr data-name="${escapeHtml(p.name)}" class="patient-row" title="Tap to view full history">
        <td>
          <div class="td-name">
            <div class="td-avatar">${getInitials(p.name)}</div>
            <div class="td-name-info">
              <strong>${escapeHtml(p.name)}</strong>
              <small>${escapeHtml(String(p.age))} yrs</small>
            </div>
          </div>
        </td>
        <td><span class="sex-badge ${sexClass}">${escapeHtml(p.sex)}</span></td>
        <td>${escapeHtml(formattedDate)}</td>
        <td><span class="visit-count-badge">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${visitCount}
        </span></td>
        <td class="chevron-cell">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </td>
      </tr>
    `;
  }).join('');

  els.patientsListContainer.innerHTML = `
    <div class="patients-table-wrap">
      <table class="patients-table">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Sex</th>
            <th>Last Visit</th>
            <th>Visits</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="patients-tbody">
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('.patient-row').forEach(row => {
    row.addEventListener('click', () => openPatientHistory(row.dataset.name));
  });
}

// Filter
let filterDebounce = null;
els.patientsFilter.addEventListener('input', () => {
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(() => {
    const q = els.patientsFilter.value.trim().toLowerCase();
    if (!q) { renderPatientsList(allPatientsCache); return; }
    const filtered = allPatientsCache.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.opNumber || '').toLowerCase().includes(q)
    );
    renderPatientsList(filtered);
  }, 250);
});

// ----------------------------------------------------------------------------
// REGISTRATION FORM — NEW PATIENT
// ----------------------------------------------------------------------------
function prepareNewForm() {
  if (!els.fDate.value) els.fDate.value = todayISODate();
  refreshOPPreview();
  setRegisterMode('new');
}

async function refreshOPPreview() {
  els.opPreview.textContent = 'Loading…';
  if (!navigator.onLine) { els.opPreview.textContent = 'Available when online'; return; }
  try {
    const data = await callApi('getNextOPNumber');
    els.opPreview.textContent = data.opNumber;
  } catch {
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

function validateNewPatientForm() {
  let valid = true;
  let firstInvalid = null;
  requiredFields.forEach(({ el }) => {
    const isEmpty = el.value.trim() === '';
    el.classList.toggle('invalid', isEmpty);
    if (isEmpty && !firstInvalid) firstInvalid = el;
    if (isEmpty) valid = false;
  });
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

requiredFields.forEach(({ el }) => {
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
  if (!navigator.onLine) { showToast('No internet connection. Cannot save right now.', 'error'); return; }
  if (!validateNewPatientForm()) return;

  const payload = {
    date: els.fDate.value,
    name: els.fName.value.trim(),
    address: els.fAddress.value.trim(),
    age: els.fAge.value.trim(),
    sex: els.fSex.value,
    phone: els.fPhone.value.trim(),
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
    requiredFields.forEach(({ el }) => el.classList.remove('invalid'));
    prepareNewForm();
  } catch (err) {
    showToast(err.message === 'OFFLINE' ? 'No internet connection.' : (err.message || 'Could not save record.'), 'error');
  } finally {
    setBtnLoading(els.submitBtn, false);
  }
});

// ----------------------------------------------------------------------------
// REGISTER MODE TOGGLE
// ----------------------------------------------------------------------------
function setRegisterMode(mode) {
  const isNew = mode === 'new';
  els.modeNew.classList.toggle('active', isNew);
  els.modeVisit.classList.toggle('active', !isNew);
  els.patientForm.classList.toggle('hidden', !isNew);
  els.visitFormWrap.classList.toggle('hidden', isNew);
  if (!isNew) {
    refreshVisitOPPreview();
    if (!els.vDate.value) els.vDate.value = todayISODate();
  }
}

els.modeNew.addEventListener('click', () => setRegisterMode('new'));
els.modeVisit.addEventListener('click', () => setRegisterMode('visit'));

// ----------------------------------------------------------------------------
// RETURN VISIT — Patient Search Autocomplete
// ----------------------------------------------------------------------------
let visitSearchDebounce = null;
els.visitSearch.addEventListener('input', () => {
  clearTimeout(visitSearchDebounce);
  const q = els.visitSearch.value.trim();
  if (!q) { hideAutoComplete(); return; }
  visitSearchDebounce = setTimeout(() => searchForVisit(q), 350);
});

async function searchForVisit(query) {
  if (!navigator.onLine) { showToast('Internet required to search patients.', 'error'); return; }
  try {
    const data = await callApi('searchRecords', { query });
    showAutoComplete(data.results || []);
  } catch { /* silent */ }
}

function showAutoComplete(results) {
  if (!results.length) { hideAutoComplete(); return; }
  const seen = new Set();
  const unique = results.filter(r => {
    const k = r.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  els.visitSearchResults.innerHTML = unique.slice(0, 6).map(r => `
    <div class="autocomplete-item" data-name="${escapeHtml(r.name)}">
      <div class="autocomplete-avatar">${getInitials(r.name)}</div>
      <div class="autocomplete-item-info">
        <strong>${escapeHtml(r.name)}</strong>
        <small>${escapeHtml(String(r.age))} yrs &bull; ${escapeHtml(r.sex)} &bull; ${escapeHtml(r.opNumber)}</small>
      </div>
    </div>
  `).join('');

  els.visitSearchResults.classList.remove('hidden');

  els.visitSearchResults.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.name;
      const patient = unique.find(r => r.name === name);
      selectPatientForVisit(patient);
    });
  });
}

function hideAutoComplete() {
  els.visitSearchResults.innerHTML = '';
  els.visitSearchResults.classList.add('hidden');
}

async function selectPatientForVisit(patient) {
  selectedPatient = patient;
  hideAutoComplete();

  els.selectedPatientCard.classList.remove('hidden');
  els.selectedPatientCard.innerHTML = `
    <div class="patient-avatar" style="width:36px;height:36px;font-size:13px;">${getInitials(patient.name)}</div>
    <div class="spb-info">
      <strong>${escapeHtml(patient.name)}</strong>
      <small>${escapeHtml(String(patient.age))} yrs &bull; ${escapeHtml(patient.sex)}</small>
    </div>
    <button class="spb-change" id="spb-change-btn" type="button">Change</button>
  `;
  document.getElementById('spb-change-btn').addEventListener('click', clearPatientSelection);

  els.visitForm.classList.remove('hidden');
  els.visitSearch.value = patient.name;

  await loadLastVisitReference(patient.name);
  refreshVisitOPPreview();
}

function clearPatientSelection() {
  selectedPatient = null;
  els.selectedPatientCard.classList.add('hidden');
  els.selectedPatientCard.innerHTML = '';
  els.visitForm.classList.add('hidden');
  els.visitSearch.value = '';
  els.lastVisitBox.innerHTML = '';
}

async function loadLastVisitReference(name) {
  try {
    const data = await callApi('getPatientHistory', { name });
    const history = data.history || [];
    if (!history.length) { els.lastVisitBox.innerHTML = ''; return; }
    const last = history[0];
    els.lastVisitBox.innerHTML = `
      <div class="lvb-title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Last Visit: ${escapeHtml(formatDate(last.date))} &mdash; ${escapeHtml(last.opNumber)}
      </div>
      ${last.complaint ? `<div class="lvb-row"><span class="lvb-label">Complaint</span><span class="lvb-val">${escapeHtml(last.complaint)}</span></div>` : ''}
      ${last.prescription ? `<div class="lvb-row"><span class="lvb-label">Prescription</span><span class="lvb-val">${escapeHtml(last.prescription)}</span></div>` : ''}
      ${last.investigation ? `<div class="lvb-row"><span class="lvb-label">Investigation</span><span class="lvb-val">${escapeHtml(last.investigation)}</span></div>` : ''}
      ${last.review ? `<div class="lvb-row"><span class="lvb-label">Review</span><span class="lvb-val">${escapeHtml(last.review)}</span></div>` : ''}
    `;
  } catch {
    els.lastVisitBox.innerHTML = '';
  }
}

async function refreshVisitOPPreview() {
  if (!els.visitOpPreview) return;
  els.visitOpPreview.textContent = 'Loading…';
  if (!navigator.onLine) { els.visitOpPreview.textContent = 'Available when online'; return; }
  try {
    const data = await callApi('getNextOPNumber');
    els.visitOpPreview.textContent = data.opNumber;
  } catch {
    els.visitOpPreview.textContent = 'Auto-generated on save';
  }
}

els.visitClearBtn.addEventListener('click', () => {
  if (confirm('Clear the visit form?')) {
    clearPatientSelection();
    els.vComplaint.value = '';
    els.vInvestigation.value = '';
    els.vPrescription.value = '';
    els.vReview.value = '';
  }
});

els.visitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedPatient) { showToast('Please select a patient first.', 'error'); return; }
  if (!navigator.onLine) { showToast('No internet connection. Cannot save right now.', 'error'); return; }

  const complaint = els.vComplaint.value.trim();
  if (!complaint) { els.vComplaint.classList.add('invalid'); showToast('Please enter the chief complaint.', 'error'); return; }

  const payload = {
    date: els.vDate.value || todayISODate(),
    name: selectedPatient.name,
    address: selectedPatient.address || '',
    age: String(selectedPatient.age),
    sex: selectedPatient.sex,
    phone: selectedPatient.phone || '',
    complaint: complaint,
    investigation: els.vInvestigation.value.trim(),
    prescription: els.vPrescription.value.trim(),
    review: els.vReview.value.trim(),
  };

  setBtnLoading(els.visitSubmitBtn, true);
  try {
    const result = await callApi('saveRecord', payload);
    showSuccessOverlay(result.opNumber);
    clearPatientSelection();
    els.vComplaint.value = '';
    els.vInvestigation.value = '';
    els.vPrescription.value = '';
    els.vReview.value = '';
    els.vDate.value = '';
  } catch (err) {
    showToast(err.message === 'OFFLINE' ? 'No internet connection.' : (err.message || 'Could not save visit.'), 'error');
  } finally {
    setBtnLoading(els.visitSubmitBtn, false);
  }
});

// ----------------------------------------------------------------------------
// SEARCH VIEW
// ----------------------------------------------------------------------------
let searchDebounce = null;
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const query = els.searchInput.value.trim();
  if (!query) { renderSearchEmpty(); return; }
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
  if (!navigator.onLine) { showToast('No internet connection. Search unavailable.', 'error'); return; }
  els.searchResults.innerHTML = `<div class="empty-state"><div class="spinner spinner-large"></div></div>`;
  try {
    const data = await callApi('searchRecords', { query });
    renderSearchResults(data.results);
  } catch (err) {
    els.searchResults.innerHTML = `<div class="empty-state"><p>${err.message === 'OFFLINE' ? 'No internet connection.' : 'Search failed. Please try again.'}</p></div>`;
  }
}

function renderSearchResults(results) {
  if (!results || results.length === 0) {
    els.searchResults.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg><p>No matching patient records found.</p></div>`;
    return;
  }
  const seen = new Set();
  const unique = results.filter(r => {
    const k = r.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  els.searchResults.innerHTML = unique.map(r => `
    <div class="result-card" data-name="${escapeHtml(r.name)}">
      <div class="patient-avatar">${getInitials(r.name)}</div>
      <div class="patient-mini-info" style="flex:1;">
        <h4>${escapeHtml(r.name)}</h4>
        <p>${escapeHtml(String(r.age))} yrs &bull; ${escapeHtml(r.sex)} &bull; ${escapeHtml(formatDate(r.date))}</p>
        <span class="op-chip">${escapeHtml(r.opNumber)}</span>
      </div>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  `).join('');

  els.searchResults.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => openPatientHistory(card.dataset.name));
  });
}

// ----------------------------------------------------------------------------
// PATIENT HISTORY MODAL
// ----------------------------------------------------------------------------
async function openPatientHistory(name) {
  currentHistoryName = name;
  els.historyModalTitle.textContent = name;
  els.historyModalSub.textContent = '';
  els.historyAvatar.textContent = getInitials(name);
  els.historyModalBody.innerHTML = `<div class="empty-state"><div class="spinner spinner-large"></div></div>`;
  els.historyModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    const data = await callApi('getPatientHistory', { name });
    renderHistory(data.history);
    const count = (data.history || []).length;
    els.historyModalSub.textContent = `${count} visit record${count !== 1 ? 's' : ''}`;
  } catch (err) {
    els.historyModalBody.innerHTML = `<div class="empty-state"><p>${err.message === 'OFFLINE' ? 'No internet connection.' : 'Could not load history.'}</p></div>`;
  }
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    els.historyModalBody.innerHTML = `<div class="empty-state"><p>No visit records found.</p></div>`;
    return;
  }

  const p = history[0];

  const patientInfoHtml = `
    <div class="patient-info-strip">
      <div style="font-size:13px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Patient Details</div>
      <div class="patient-info-grid">
        <div class="info-item"><span class="info-label">Age</span><span class="info-val">${escapeHtml(String(p.age))} yrs</span></div>
        <div class="info-item"><span class="info-label">Sex</span><span class="info-val">${escapeHtml(p.sex)}</span></div>
        ${p.phone ? `<div class="info-item"><span class="info-label">Phone</span><span class="info-val">${escapeHtml(p.phone)}</span></div>` : ''}
        <div class="info-item info-item-full"><span class="info-label">Address</span><span class="info-val">${escapeHtml(p.address || '—')}</span></div>
      </div>
    </div>
  `;

  const visitCards = history.map((v, idx) => {
    const colorClass = `visit-number-${Math.min(idx + 1, 4)}`;
    const visitNum = history.length - idx;
    return `
      <div class="visit-card ${colorClass}">
        <div class="visit-card-header">
          <span class="visit-date">${escapeHtml(formatDate(v.date))}</span>
          <span class="visit-num-badge">Visit #${visitNum}</span>
          <span class="visit-op">${escapeHtml(v.opNumber)}</span>
        </div>
        <div class="visit-body">
          <div class="visit-row">
            <span class="label">Chief Complaint</span>
            <span class="value">${escapeHtml(v.complaint || '—')}</span>
          </div>
          ${v.investigation ? `<div class="visit-row"><span class="label">Investigation</span><span class="value">${escapeHtml(v.investigation)}</span></div>` : ''}
          <div class="visit-row">
            <span class="label">Prescription (Rx)</span>
            <span class="value">${escapeHtml(v.prescription || '—')}</span>
          </div>
          ${v.review ? `<div class="visit-row"><span class="label">Review</span><span class="value">${escapeHtml(v.review)}</span></div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const addVisitBtn = `
    <button class="history-add-visit-btn" id="history-goto-visit">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Add New Visit for this Patient
    </button>
  `;

  els.historyModalBody.innerHTML = patientInfoHtml + visitCards + addVisitBtn;

  document.getElementById('history-goto-visit').addEventListener('click', () => {
    closeHistoryModal();
    switchView('register');
    setRegisterMode('visit');
    els.visitSearch.value = p.name;
    selectPatientForVisit(p);
  });

  els.historyEditBtn.onclick = () => openEditModal(p);
}

// Close history modal
els.historyCloseBtn.addEventListener('click', closeHistoryModal);
els.historyModal.addEventListener('click', (e) => { if (e.target === els.historyModal) closeHistoryModal(); });
function closeHistoryModal() {
  els.historyModal.classList.add('hidden');
  document.body.style.overflow = '';
  currentHistoryName = null;
}

// ----------------------------------------------------------------------------
// EDIT PATIENT MODAL
// ----------------------------------------------------------------------------
function openEditModal(patient) {
  els.editOpNumber.value = patient.opNumber || '';
  els.editName.value = patient.name || '';
  els.editAge.value = patient.age || '';
  els.editSex.value = patient.sex || '';
  els.editPhone.value = patient.phone || '';
  els.editAddress.value = patient.address || '';
  els.editModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

els.editCloseBtn.addEventListener('click', closeEditModal);
els.editCancelBtn.addEventListener('click', closeEditModal);
els.editModal.addEventListener('click', (e) => { if (e.target === els.editModal) closeEditModal(); });

function closeEditModal() {
  els.editModal.classList.add('hidden');
  document.body.style.overflow = '';
}

els.editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = els.editName.value.trim();
  const age = els.editAge.value.trim();
  const sex = els.editSex.value;
  const addr = els.editAddress.value.trim();

  if (!name || !age || !sex || !addr) {
    showToast('Please fill all required fields.', 'error');
    return;
  }

  setBtnLoading(els.editSaveBtn, true);
  try {
    if (navigator.onLine) {
      await callApi('editRecord', {
        opNumber: els.editOpNumber.value,
        name, age, sex,
        phone: els.editPhone.value.trim(),
        address: addr,
      });
    }
    showToast('Patient details updated successfully.', 'success');

    // Update local cache
    const key = (els.editOpNumber.value
      ? allPatientsCache.find(p => p.opNumber === els.editOpNumber.value)?.name
      : name
    )?.toLowerCase();
    if (key) {
      allPatientsCache = allPatientsCache.map(p =>
        p.name.toLowerCase() === key
          ? { ...p, name, age, sex, phone: els.editPhone.value.trim(), address: addr }
          : p
      );
    }

    closeEditModal();
    if (currentHistoryName) openPatientHistory(name);
  } catch (err) {
    showToast(err.message === 'OFFLINE' ? 'No internet. Changes saved locally only.' : (err.message || 'Could not update record.'), 'warn');
    closeEditModal();
  } finally {
    setBtnLoading(els.editSaveBtn, false);
  }
});

// ----------------------------------------------------------------------------
// SUCCESS OVERLAY
// ----------------------------------------------------------------------------
function showSuccessOverlay(opNumber) {
  els.successOpText.textContent = 'OP Number: ' + opNumber;
  els.successOverlay.classList.remove('hidden');
  const circle = els.successOverlay.querySelector('.success-circle');
  const tick = els.successOverlay.querySelector('.success-tick');
  [circle, tick].forEach(elm => { elm.style.animation = 'none'; void elm.offsetWidth; elm.style.animation = ''; });
  setTimeout(() => {
    els.successOverlay.classList.add('hidden');
    switchView('dashboard');
  }, 1800);
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
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(dateStr); }
}

// ----------------------------------------------------------------------------
// SERVICE WORKER
// ----------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
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
