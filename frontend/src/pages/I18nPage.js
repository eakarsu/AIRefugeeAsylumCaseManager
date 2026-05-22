// Apply pass 7: i18n bundle console.
// Lists locales, lets staff edit/upsert string bundles by namespace.

import React, { useEffect, useState } from 'react';
import { i18nApi } from '../services/api';

export default function I18nPage() {
  const [locales, setLocales] = useState({ supported: [], seeded: [], default: 'en' });
  const [locale, setLocale]   = useState('en');
  const [namespace, setNs]    = useState('common');
  const [bundle, setBundle]   = useState({});
  const [fallback, setFb]     = useState({});
  const [form, setForm]       = useState({ key: '', value: '' });
  const [err, setErr]         = useState(null);
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    i18nApi.locales().then(setLocales).catch((e) => setErr(e.message));
  }, []);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await i18nApi.bundle(locale, namespace);
      setBundle(r.bundle || {}); setFb(r.fallback || {});
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [locale, namespace]);

  const upsert = async () => {
    if (!form.key) return;
    setBusy(true); setErr(null);
    try {
      await i18nApi.upsert(locale, namespace, form.key, form.value);
      setForm({ key: '', value: '' });
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async (k) => {
    setBusy(true); setErr(null);
    try { await i18nApi.remove(locale, namespace, k); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const keys = Array.from(new Set([...Object.keys(bundle), ...Object.keys(fallback)])).sort();

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>i18n String Bundles</h2>
          <p>Server-side bundles keyed by (locale, namespace, key). Frontend falls back to English per-key.</p>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Locale</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {(locales.supported || []).map((l) => <option key={l} value={l}>{l}{locales.seeded?.includes(l) ? ' ✓' : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Namespace</label>
            <input value={namespace} onChange={(e) => setNs(e.target.value)} placeholder="common" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Add / Update String</h3>
        <div className="form-grid">
          <div className="form-group"><label>Key</label><input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. nav.dossiers" /></div>
          <div className="form-group full-width"><label>Value</label><textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        </div>
        <button className="btn ai" onClick={upsert} disabled={busy || !form.key} style={{ marginTop: 12 }}>Save</button>
      </div>

      {err && <div className="ai-error" style={{ marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead><tr><th>Key</th><th>Value ({locale})</th><th>Fallback (en)</th><th></th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{bundle[k] ?? <em>—</em>}</td>
                <td>{fallback[k] ?? <em>—</em>}</td>
                <td>{bundle[k] != null && <button className="btn secondary" onClick={() => remove(k)} disabled={busy}>Delete</button>}</td>
              </tr>
            ))}
            {!keys.length && <tr><td colSpan={4} className="empty-state">No strings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
