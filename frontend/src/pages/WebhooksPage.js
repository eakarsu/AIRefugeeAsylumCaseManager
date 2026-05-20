import React, { useEffect, useState } from 'react';
import { webhooksApi, isAdmin } from '../services/api';

export default function WebhooksPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: '', url: '', secret: '', events: '', active: true });
  const [deliveries, setDeliveries] = useState({ id: null, rows: [], loading: false });
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  const admin = isAdmin();

  const load = async () => {
    setErr(null);
    try {
      const r = await webhooksApi.list();
      setRows(Array.isArray(r) ? r : []);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) await webhooksApi.update(editing.id, draft);
      else await webhooksApi.create(draft);
      setEditing(null);
      setDraft({ name: '', url: '', secret: '', events: '', active: true });
      load();
    } catch (e) { alert(e.message); }
  };
  const handleDelete = async (row) => {
    if (!window.confirm(`Delete webhook ${row.name || row.url}?`)) return;
    try { await webhooksApi.remove(row.id); load(); } catch (e) { alert(e.message); }
  };
  const handleEdit = (row) => {
    setEditing(row);
    setDraft({
      name: row.name || '',
      url: row.url || '',
      secret: row.secret || '',
      events: row.events || '',
      active: row.active !== false,
    });
  };

  const openDeliveries = async (row) => {
    setDeliveries({ id: row.id, rows: [], loading: true });
    try {
      const r = await webhooksApi.deliveries(row.id);
      setDeliveries({ id: row.id, rows: r, loading: false });
    } catch (e) {
      setDeliveries({ id: row.id, rows: [], loading: false, error: e.message });
    }
  };

  const handleTest = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const r = await webhooksApi.test('test.ping', { from: 'webhooks-page', at: new Date().toISOString() });
      setTestResult(r);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Webhooks</h2>
          <p>HMAC-signed outbound webhooks for case-event notifications to partner orgs.</p>
        </div>
        <div className="page-header-actions">
          {admin && (
            <button className="btn ai" onClick={handleTest} disabled={testBusy}>
              {testBusy ? 'Firing...' : 'Fire Test Event'}
            </button>
          )}
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}
      {testResult && (
        <div className="card">
          <strong>Test result:</strong>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      {admin && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editing ? `Edit webhook #${editing.id}` : 'New webhook'}</h3>
          <div className="form-grid">
            <div className="form-group"><label>Name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="form-group"><label>URL</label>
              <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></div>
            <div className="form-group"><label>Secret</label>
              <input value={draft.secret} onChange={(e) => setDraft({ ...draft, secret: e.target.value })} /></div>
            <div className="form-group"><label>Events (comma-sep, blank = all)</label>
              <input value={draft.events} onChange={(e) => setDraft({ ...draft, events: e.target.value })} /></div>
            <div className="form-group"><label>Active</label>
              <select value={draft.active ? 'true' : 'false'}
                onChange={(e) => setDraft({ ...draft, active: e.target.value === 'true' })}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button>
            {editing && (
              <button className="btn secondary" style={{ marginLeft: 8 }}
                onClick={() => { setEditing(null); setDraft({ name:'', url:'', secret:'', events:'', active:true }); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>URL</th><th>Events</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.url}</td>
                <td>{r.events}</td>
                <td>{String(r.active)}</td>
                <td>
                  <button className="btn secondary" onClick={() => openDeliveries(r)} style={{ marginRight: 6 }}>Deliveries</button>
                  {admin && (
                    <>
                      <button className="btn secondary" onClick={() => handleEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                      <button className="btn danger" onClick={() => handleDelete(r)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deliveries.id && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Deliveries · webhook #{deliveries.id}</h3>
          {deliveries.loading && <div className="empty-state">Loading...</div>}
          {deliveries.error && <div className="ai-error">{deliveries.error}</div>}
          {deliveries.rows && deliveries.rows.length === 0 && !deliveries.loading && (
            <div className="empty-state">No deliveries yet.</div>
          )}
          {deliveries.rows && deliveries.rows.length > 0 && (
            <table>
              <thead><tr><th>ID</th><th>Event</th><th>Status</th><th>At</th></tr></thead>
              <tbody>
                {deliveries.rows.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.event}</td>
                    <td>{d.status_code}</td>
                    <td>{d.attempted_at ? new Date(d.attempted_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
