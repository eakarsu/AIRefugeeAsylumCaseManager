// Apply pass 7: PII encryption-at-rest console.
// Sealed-envelope read/write against /api/pii/:table/:resource_id.

import React, { useState } from 'react';
import { piiSeal, piiUnseal, piiWipe, piiHealth } from '../services/api';

export default function PIIVaultPage() {
  const [table, setTable] = useState('clients');
  const [resourceId, setResourceId] = useState('');
  const [json, setJson] = useState('');
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const wrap = async (fn) => {
    setBusy(true); setErr(null); setOut(null);
    try { setOut(await fn()); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doSeal = () => wrap(async () => {
    let pii;
    try { pii = JSON.parse(json || '{}'); } catch (e) { throw new Error(`PII JSON parse failed: ${e.message}`); }
    return piiSeal(table, resourceId, pii);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>PII Vault (Encryption at Rest)</h2>
          <p>AES-256-GCM sealed envelope on `pii_encrypted` column. Never logs plaintext.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn secondary" onClick={() => wrap(piiHealth)} disabled={busy}>Key Health</button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Resource Type</label>
            <select value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="clients">clients</option>
              <option value="cases">cases</option>
            </select>
          </div>
          <div className="form-group">
            <label>Resource ID</label>
            <input value={resourceId} onChange={(e) => setResourceId(e.target.value)}
                   placeholder="e.g. CLI-2026-0001 or CAS-2026-0002" />
          </div>
          <div className="form-group full-width">
            <label>PII Payload (JSON object) — only used for Seal</label>
            <textarea value={json} onChange={(e) => setJson(e.target.value)}
                      placeholder='{"ssn":"123-45-6789","a_number":"A123456789","phone":"+1..."}' />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn ai"        onClick={doSeal}                                   disabled={busy || !resourceId}>Seal</button>
          <button className="btn secondary" onClick={() => wrap(() => piiUnseal(table, resourceId))} disabled={busy || !resourceId}>Unseal</button>
          <button className="btn secondary" onClick={() => wrap(() => piiWipe(table, resourceId))}   disabled={busy || !resourceId}>Wipe</button>
        </div>
      </div>

      {err && <div className="ai-error" style={{ marginTop: 12 }}>{err}</div>}
      {out && (
        <div className="card" style={{ marginTop: 12 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(out, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
