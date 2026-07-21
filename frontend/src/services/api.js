const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3085/api';

export { API_BASE };

const TOKEN_KEY = 'racm_token';
const USER_KEY  = 'racm_user';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch (_) {}
}
export function logout() {
  setToken(null);
  setStoredUser(null);
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

// Role helpers (admin > attorney > viewer)
export function getRole() {
  return (getStoredUser()?.role || 'viewer').toLowerCase();
}
export function canWrite() {
  return ['admin', 'attorney'].includes(getRole());
}
export function isAdmin() {
  return getRole() === 'admin';
}
// Back-compat alias
export const isCommander = isAdmin;

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch (e) {
    throw new Error(`Network error: ${e.message}`);
  }

  if (res.status === 401) {
    if (!url.startsWith('/auth/login')) {
      logout();
      throw new Error('Session expired');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Generic CRUD factory
function crud(base) {
  return {
    list:   ()       => request(`/${base}`),
    get:    (id)     => request(`/${base}/${id}`),
    create: (data)   => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)  => request(`/${base}/${id}`, { method: 'PUT',  body: JSON.stringify(d) }),
    remove: (id)     => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

// 18 CRUD APIs — refugee/asylum domain
export const clientsApi              = crud('clients');
export const casesApi                = crud('cases');
export const hearingsApi             = crud('hearings');
export const dossiersApi             = crud('dossiers');
export const countryOfOriginInfoApi  = crud('country-of-origin-info');
export const immigrationFormsApi     = crud('immigration-forms');
export const evidenceDocsApi         = crud('evidence-docs');
export const expertWitnessesApi      = crud('expert-witnesses');
export const interpretersApi         = crud('interpreters');
export const attorneysApi            = crud('attorneys');
export const paralegalsApi           = crud('paralegals');
export const partnerOrgsApi          = crud('partner-orgs');
export const asylumGrantsApi         = crud('asylum-grants');
export const deportationOrdersApi    = crud('deportation-orders');
export const familyMembersApi        = crud('family-members');
export const sponsorsApi             = crud('sponsors');
export const courtCalendarsApi       = crud('court-calendars');
export const auditLogApi             = crud('audit-log');

// Dashboard
export const getDashboardStats = () => request('/dashboard');

// Custom analytics views (Case Analytics)
export const getCaseTimeline    = (limit = 25) => request(`/custom-views/case-timeline?limit=${limit}`);
export const getHearingCalendar = (year, month) => {
  const qs = new URLSearchParams({
    ...(year  ? { year:  String(year)  } : {}),
    ...(month ? { month: String(month) } : {}),
  }).toString();
  return request(`/custom-views/hearing-calendar${qs ? `?${qs}` : ''}`);
};
export const getOriginHeatmap = () => request('/custom-views/origin-heatmap');
export const getGrantFunnel   = () => request('/custom-views/grant-funnel');

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');

// AI endpoints — 16 refugee/asylum verbs
export const aiCoiCiteMemo              = (body) => request('/ai/coi-cite-memo',              { method: 'POST', body: JSON.stringify(body || {}) });
export const aiHearingPrepBrief         = (body) => request('/ai/hearing-prep-brief',         { method: 'POST', body: JSON.stringify(body || {}) });
export const aiEvidenceGapAnalyze       = (body) => request('/ai/evidence-gap-analyze',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiAsylumNarrativeDraft     = (body) => request('/ai/asylum-narrative-draft',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiExecutiveBrief           = (body) => request('/ai/executive-brief',            { method: 'POST', body: JSON.stringify(body || {}) });
export const aiInterpreterMatch         = (body) => request('/ai/interpreter-match',          { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCountryConditionsSummary = (body) => request('/ai/country-conditions-summary', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDeportationReliefOptions = (body) => request('/ai/deportation-relief-options', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSponsorPetitionDraft     = (body) => request('/ai/sponsor-petition-draft',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiFamilyReunificationPlan  = (body) => request('/ai/family-reunification-plan',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiHardshipEvidenceSuggest  = (body) => request('/ai/hardship-evidence-suggest',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiAttorneyHandoffSummary   = (body) => request('/ai/attorney-handoff-summary',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRegulatoryUpdateBrief    = (body) => request('/ai/regulatory-update-brief',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPartnerOrgReferral       = (body) => request('/ai/partner-org-referral',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDonorImpactReport        = (body) => request('/ai/donor-impact-report',        { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCourtCalendarConflicts   = (body) => request('/ai/court-calendar-conflicts',   { method: 'POST', body: JSON.stringify(body || {}) });

// ─── Gov Benefits CRUD APIs ───────────────────────────────────────────────────
function benefitsCrud(name) {
  const base = `/benefits/${name}`;
  return {
    list:   (params = {}) => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))).toString();
      return request(`${base}${qs ? `?${qs}` : ''}`);
    },
    get:    (id)     => request(`${base}/${id}`),
    create: (data)   => request(base, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)  => request(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id)     => request(`${base}/${id}`, { method: 'DELETE' }),
    count:  (params = {}) => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))).toString();
      return request(`${base}/meta/count${qs ? `?${qs}` : ''}`);
    },
    search: (q)      => request(`${base}/meta/search?q=${encodeURIComponent(q || '')}`),
    exportCsv: ()    => `${API_BASE}${base}/meta/export-csv`,
    importCsv: (csv) => request(`${base}/meta/import-csv`, { method: 'POST', body: JSON.stringify({ csv }) }),
    statsSummary: () => request(`${base}/meta/stats-summary`),
    ai: (verb, body) => request(`${base}/ai/${verb}`, { method: 'POST', body: JSON.stringify(body || {}) }),
  };
}

export const medicaidEligibilityApi   = benefitsCrud('medicaid-eligibility');
export const snapEligibilityApi       = benefitsCrud('snap-eligibility');
export const ssiSsdiEligibilityApi    = benefitsCrud('ssi-ssdi-eligibility');
export const tanfCalcApi              = benefitsCrud('tanf-calc');
export const incomeVerificationApi    = benefitsCrud('income-verification');
export const assetTestsApi            = benefitsCrud('asset-tests');
export const householdCompositionApi  = benefitsCrud('household-composition');
export const noticeGenerationApi      = benefitsCrud('notice-generation');
export const appealsWorkflowApi       = benefitsCrud('appeals-workflow');

// AI history
export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({
    ...(feature ? { feature } : {}),
    limit: String(limit),
  }).toString();
  return request(`/ai/history?${qs}`);
};

// AI sample fills
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

// Notifications
export const getNotifications         = () => request('/notifications');
export const getUnreadNotifications   = () => request('/notifications/unread');
export const markNotificationRead     = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

// ────────────────────────────────────────────────────────────────
// Apply pass 7 (full backlog implementation) — additional clients
// ────────────────────────────────────────────────────────────────

// New AI verbs
export const aiCoiBrieferBundle    = (body) => request('/ai/coi-briefer-bundle',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDeclarationRedliner = (body) => request('/ai/declaration-redliner',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiTranslationHelper   = (body) => request('/ai/translation-helper',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiHearingQaSimulator  = (body) => request('/ai/hearing-qa-simulator',  { method: 'POST', body: JSON.stringify(body || {}) });

// PII encryption-at-rest
export const piiSeal   = (table, id, pii) => request(`/pii/${table}/${id}`, { method: 'POST', body: JSON.stringify({ pii }) });
export const piiUnseal = (table, id)       => request(`/pii/${table}/${id}`);
export const piiWipe   = (table, id)       => request(`/pii/${table}/${id}`, { method: 'DELETE' });
export const piiHealth = ()                => request('/pii/health');

// Document redactions
export const redactionsApi = {
  list:   (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request(`/redactions${qs ? `?${qs}` : ''}`);
  },
  create: (d)      => request('/redactions',              { method: 'POST', body: JSON.stringify(d) }),
  apply:  (id)     => request(`/redactions/${id}/apply`,  { method: 'POST' }),
  revert: (id)     => request(`/redactions/${id}/revert`, { method: 'POST' }),
  remove: (id)     => request(`/redactions/${id}`,        { method: 'DELETE' }),
};

// Court dates (deterministic)
export const courtDatesApi = {
  list:      (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request(`/court-dates${qs ? `?${qs}` : ''}`);
  },
  create:    (d)      => request('/court-dates',          { method: 'POST', body: JSON.stringify(d) }),
  update:    (id, d)  => request(`/court-dates/${id}`,    { method: 'PUT',  body: JSON.stringify(d) }),
  remove:    (id)     => request(`/court-dates/${id}`,    { method: 'DELETE' }),
  conflicts: (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    return request(`/court-dates/conflicts${qs ? `?${qs}` : ''}`);
  },
  icsUrl:    (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    return `${API_BASE}/court-dates/ics${qs ? `?${qs}` : ''}`;
  },
};

// i18n
export const i18nApi = {
  locales:    ()                                     => request('/i18n/locales'),
  bundle:     (locale, namespace = 'common')         => request(`/i18n/bundle/${locale}?namespace=${encodeURIComponent(namespace)}`),
  upsert:     (locale, namespace, string_key, value) => request('/i18n/strings', { method: 'PUT', body: JSON.stringify({ locale, namespace, string_key, value }) }),
  remove:     (locale, namespace, string_key)        => {
    const qs = new URLSearchParams({ locale, namespace, string_key }).toString();
    return request(`/i18n/strings?${qs}`, { method: 'DELETE' });
  },
};

// Trauma-informed UX flags
export const traumaFlagsApi = {
  known:  ()                  => request('/trauma-flags/known'),
  get:    (table, id)         => request(`/trauma-flags/${table}/${id}`),
  set:    (table, id, body)   => request(`/trauma-flags/${table}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// External feeds (EOIR / USCIS / DHS) — 503 stubs until creds provisioned
export const externalFeedsApi = {
  discovery:        ()      => request('/external-feeds/'),
  eoirCase:         (a)     => request(`/external-feeds/eoir/case/${encodeURIComponent(a)}`),
  uscisCase:        (r)     => request(`/external-feeds/uscis/case/${encodeURIComponent(r)}`),
  dhsAFile:         (a)     => request(`/external-feeds/dhs/a-file/${encodeURIComponent(a)}`),
};

// Webhooks
export const webhooksApi = {
  list:    ()         => request('/webhooks'),
  create:  (d)        => request('/webhooks',          { method: 'POST', body: JSON.stringify(d) }),
  update:  (id, d)    => request(`/webhooks/${id}`,    { method: 'PUT',  body: JSON.stringify(d) }),
  remove:  (id)       => request(`/webhooks/${id}`,    { method: 'DELETE' }),
  test:    (event, payload) => request('/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ event, payload }),
  }),
  deliveries: (id)    => request(`/webhooks/${id}/deliveries`),
};
