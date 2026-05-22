// Apply pass 7: External feeds (EOIR / USCIS / DHS) probe console.
// Wired with 503 stubs until production credentials are provisioned.

import React, { useEffect, useState } from 'react';
import { externalFeedsApi } from '../services/api';

export default function ExternalFeedsPage() {
  const [disco, setDisco] = useState(null);
  const [err, setErr]     = useState(null);
  const [busy, setBusy]   = useState(false);
  const [form, setForm]   = useState({ a_number: '', receipt_number: '' });
  const [last, setLast]   = useState(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try { setDisco(await externalFeedsApi.discovery()); } catch (e) {
      // a 503 (NEEDS-CREDS) is the expected baseline state
      try { setDisco(JSON.parse(e.message)); } catch (_) { setErr(e.message); }
    } finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  const probe = async (op) => {
    setBusy(true); setErr(null); setLast(null);
    try {
      let r;
      if (op === 'eoir')  r = await externalFeedsApi.eoirCase(form.a_number);
      if (op === 'uscis') r = await externalFeedsApi.uscisCase(form.receipt_number);
      if (op === 'dhs')   r = await externalFeedsApi.dhsAFile(form.a_number);
      setLast(r);
    } catch (e) {
      // 503 surface — render as informational
      setLast({ http_503_expected: true, error: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>External Government Feeds</h2>
          <p>EOIR / USCIS / DHS integrations are wired as 503 stubs until production credentials are provisioned.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn secondary" onClick={refresh} disabled={busy}>Re-probe</button>
        </div>
      </div>

      {disco && (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(disco, null, 2)}</pre>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="form-grid">
          <div className="form-group">
            <label>A-Number (EOIR / DHS)</label>
            <input value={form.a_number} onChange={(e) => setForm({ ...form, a_number: e.target.value })} placeholder="A123456789" />
          </div>
          <div className="form-group">
            <label>Receipt Number (USCIS)</label>
            <input value={form.receipt_number} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} placeholder="MSC2190123456" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn secondary" onClick={() => probe('eoir')}  disabled={busy || !form.a_number}>Probe EOIR</button>
          <button className="btn secondary" onClick={() => probe('uscis')} disabled={busy || !form.receipt_number}>Probe USCIS</button>
          <button className="btn secondary" onClick={() => probe('dhs')}   disabled={busy || !form.a_number}>Probe DHS</button>
        </div>
      </div>

      {err && <div className="ai-error" style={{ marginTop: 12 }}>{err}</div>}
      {last && (
        <div className="card" style={{ marginTop: 12 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(last, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
