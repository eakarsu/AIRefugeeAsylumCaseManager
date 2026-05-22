// Apply pass 7: Trauma-informed UX flags console.
// Sets `trauma_sensitive` + `trauma_flags` on clients / cases.

import React, { useEffect, useState } from 'react';
import { traumaFlagsApi } from '../services/api';

export default function TraumaFlagsPage() {
  const [knownFlags, setKnownFlags] = useState([]);
  const [table, setTable]           = useState('clients');
  const [resourceId, setResourceId] = useState('');
  const [sensitive, setSensitive]   = useState(false);
  const [selected, setSelected]     = useState([]);
  const [last, setLast]             = useState(null);
  const [err, setErr]               = useState(null);
  const [busy, setBusy]             = useState(false);

  useEffect(() => {
    traumaFlagsApi.known().then((d) => setKnownFlags(d.known_flags || [])).catch(() => setKnownFlags([]));
  }, []);

  const load = async () => {
    setBusy(true); setErr(null); setLast(null);
    try {
      const r = await traumaFlagsApi.get(table, resourceId);
      setSensitive(!!r.trauma_sensitive);
      setSelected(r.trauma_flags || []);
      setLast(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await traumaFlagsApi.set(table, resourceId, {
        trauma_sensitive: sensitive,
        trauma_flags: selected,
      });
      setLast(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const toggle = (f) => {
    setSelected((s) => s.includes(f) ? s.filter((x) => x !== f) : [...s, f]);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Trauma-Informed UX Flags</h2>
          <p>Schema-backed flags (clients.trauma_sensitive / clients.trauma_flags + same on cases). Drives content warnings and pacing controls in the UI.</p>
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
            <input value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="e.g. CLI-2026-0001" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn secondary" onClick={load} disabled={busy || !resourceId}>Load</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
          <span>trauma_sensitive (enables content-warning banners + autosave pause)</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {knownFlags.map((f) => (
            <label key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', border: '1px solid #ccc', borderRadius: 14,
              background: selected.includes(f) ? '#eef6ff' : 'transparent',
            }}>
              <input type="checkbox" checked={selected.includes(f)} onChange={() => toggle(f)} />
              <span>{f}</span>
            </label>
          ))}
        </div>
        <button className="btn ai" onClick={save} disabled={busy || !resourceId} style={{ marginTop: 12 }}>Save Flags</button>
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
