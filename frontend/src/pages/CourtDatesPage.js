// Apply pass 7: Court-date scheduler.
// Deterministic conflict detection (no LLM) + ICS export.

import React, { useEffect, useState } from 'react';
import { courtDatesApi } from '../services/api';

export default function CourtDatesPage() {
  const [rows, setRows]         = useState([]);
  const [conflicts, setConf]    = useState(null);
  const [filter, setFilter]     = useState({ attorney_id: '', from: '', to: '' });
  const [form, setForm]         = useState({
    case_id: '', attorney_id: '', court: '', starts_at: '', ends_at: '',
    kind: 'master_calendar', location: '', notes: '',
  });
  const [err, setErr]           = useState(null);
  const [busy, setBusy]         = useState(false);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const q = {};
      if (filter.attorney_id) q.attorney_id = filter.attorney_id;
      if (filter.from)        q.from        = filter.from;
      if (filter.to)          q.to          = filter.to;
      setRows(await courtDatesApi.list(q));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const runConflicts = async () => {
    setBusy(true); setErr(null);
    try {
      const q = {};
      if (filter.attorney_id) q.attorney_id = filter.attorney_id;
      if (filter.from)        q.from        = filter.from;
      if (filter.to)          q.to          = filter.to;
      setConf(await courtDatesApi.conflicts(q));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      await courtDatesApi.create(form);
      setForm({ ...form, case_id: '', court: '', starts_at: '', ends_at: '', location: '', notes: '' });
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    setBusy(true); setErr(null);
    try { await courtDatesApi.remove(id); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const icsLink = () => {
    const q = {};
    if (filter.attorney_id) q.attorney_id = filter.attorney_id;
    if (filter.from)        q.from        = filter.from;
    if (filter.to)          q.to          = filter.to;
    return courtDatesApi.icsUrl(q);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Court Dates (Deterministic Scheduler)</h2>
          <p>Hard-coded conflict detection — no LLM. ICS export at RFC-5545.</p>
        </div>
        <div className="page-header-actions">
          <a className="btn secondary" href={icsLink()} target="_blank" rel="noreferrer">Download ICS</a>
          <button className="btn ai" onClick={runConflicts} disabled={busy}>Scan Conflicts</button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Attorney</label>
            <input value={filter.attorney_id} onChange={(e) => setFilter({ ...filter, attorney_id: e.target.value })} placeholder="ATT-001 or ALL" />
          </div>
          <div className="form-group">
            <label>From</label>
            <input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
          </div>
        </div>
        <button className="btn secondary" onClick={load} disabled={busy} style={{ marginTop: 12 }}>Apply Filters</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Court Date</h3>
        <div className="form-grid">
          <div className="form-group"><label>Case ID</label><input value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} placeholder="CAS-2026-0001" /></div>
          <div className="form-group"><label>Attorney ID</label><input value={form.attorney_id} onChange={(e) => setForm({ ...form, attorney_id: e.target.value })} placeholder="ATT-001" /></div>
          <div className="form-group"><label>Court</label><input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder="NY Immigration Court" /></div>
          <div className="form-group">
            <label>Kind</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {['master_calendar', 'merits', 'bia_oral', 'filing', 'prep'].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Starts At</label><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div className="form-group"><label>Ends At</label><input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          <div className="form-group"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="26 Federal Plaza, Rm 1234" /></div>
          <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <button className="btn ai" onClick={create} disabled={busy || !form.starts_at} style={{ marginTop: 12 }}>Create</button>
      </div>

      {err && <div className="ai-error" style={{ marginTop: 12 }}>{err}</div>}

      {conflicts && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Conflicts</h3>
          <p>{conflicts.summary}</p>
          {conflicts.conflicts.map((c, i) => (
            <div key={`c${i}`} className="history-entry">
              <strong>Double book ({c.severity}):</strong> {c.a.court} @ {new Date(c.a.starts_at).toLocaleString()} ↔ {c.b.court} @ {new Date(c.b.starts_at).toLocaleString()}
            </div>
          ))}
          {conflicts.tight_travel.map((t, i) => (
            <div key={`t${i}`} className="history-entry">
              <strong>Tight travel ({t.severity}, {t.gap_minutes}m):</strong> {t.from.court} → {t.to.court}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Case</th><th>Attorney</th><th>Court</th><th>Kind</th><th>Starts</th><th>Ends</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.court_date_id}</td>
                <td>{r.case_id ?? '—'}</td>
                <td>{r.attorney_id ?? '—'}</td>
                <td>{r.court ?? '—'}</td>
                <td>{r.kind}</td>
                <td>{r.starts_at ? new Date(r.starts_at).toLocaleString() : ''}</td>
                <td>{r.ends_at   ? new Date(r.ends_at).toLocaleString()   : ''}</td>
                <td>{r.status}</td>
                <td><button className="btn secondary" onClick={() => remove(r.id)} disabled={busy}>Delete</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="empty-state">No court dates yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
