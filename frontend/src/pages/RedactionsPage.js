// Apply pass 7: Document redaction console.
// Draft -> Apply -> Revert pipeline against /api/redactions.

import React, { useEffect, useState } from 'react';
import { redactionsApi } from '../services/api';

export default function RedactionsPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    attachment_id: '', evidence_doc_id: '', reason: '', watermark: '',
    masks_json: '[{"page":1,"x":50,"y":50,"w":200,"h":40,"label":"client_name"}]',
  });

  const load = async () => {
    setBusy(true); setErr(null);
    try { setRows(await redactionsApi.list()); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      let masks;
      try { masks = JSON.parse(form.masks_json || '[]'); } catch (e) { throw new Error(`masks JSON parse failed: ${e.message}`); }
      await redactionsApi.create({
        attachment_id: form.attachment_id ? Number(form.attachment_id) : undefined,
        evidence_doc_id: form.evidence_doc_id || undefined,
        reason: form.reason || undefined,
        watermark: form.watermark || undefined,
        masks,
      });
      setForm({ ...form, attachment_id: '', evidence_doc_id: '', reason: '', watermark: '' });
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const act = async (id, op) => {
    setBusy(true); setErr(null);
    try {
      if (op === 'apply')  await redactionsApi.apply(id);
      if (op === 'revert') await redactionsApi.revert(id);
      if (op === 'delete') await redactionsApi.remove(id);
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Document Redactions</h2>
          <p>Page-level mask pipeline. Draft → Apply writes a sidecar burn-in spec next to the original upload.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn secondary" onClick={load} disabled={busy}>Refresh</button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Attachment ID (DB integer)</label>
            <input value={form.attachment_id} onChange={(e) => setForm({ ...form, attachment_id: e.target.value })} placeholder="e.g. 42" />
          </div>
          <div className="form-group">
            <label>Evidence Doc ID (string)</label>
            <input value={form.evidence_doc_id} onChange={(e) => setForm({ ...form, evidence_doc_id: e.target.value })} placeholder="e.g. DOC-2026-0007" />
          </div>
          <div className="form-group">
            <label>Reason</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. third-party PII; minor's identity" />
          </div>
          <div className="form-group">
            <label>Watermark</label>
            <input value={form.watermark} onChange={(e) => setForm({ ...form, watermark: e.target.value })} placeholder="e.g. CONFIDENTIAL — clinic use" />
          </div>
          <div className="form-group full-width">
            <label>Masks (JSON array of {`{page, x, y, w, h, label}`})</label>
            <textarea value={form.masks_json} onChange={(e) => setForm({ ...form, masks_json: e.target.value })} />
          </div>
        </div>
        <button className="btn ai" onClick={create} disabled={busy} style={{ marginTop: 12 }}>Create Draft Redaction</button>
      </div>

      {err && <div className="ai-error" style={{ marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Redaction ID</th><th>Attachment</th><th>Evidence Doc</th>
              <th>Masks</th><th>Status</th><th>Reason</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.redaction_id}</td>
                <td>{r.attachment_id ?? '—'}</td>
                <td>{r.evidence_doc_id ?? '—'}</td>
                <td>{Array.isArray(r.masks) ? r.masks.length : 0}</td>
                <td>{r.status}</td>
                <td>{r.reason ?? '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {r.status === 'draft'   && <button className="btn ai"        onClick={() => act(r.id, 'apply')}  disabled={busy}>Apply</button>}
                  {r.status === 'applied' && <button className="btn secondary" onClick={() => act(r.id, 'revert')} disabled={busy}>Revert</button>}
                  <button className="btn secondary" onClick={() => act(r.id, 'delete')} disabled={busy}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="empty-state">No redactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
