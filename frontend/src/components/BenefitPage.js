import React, { useEffect, useMemo, useRef, useState } from 'react';
import AIResultDisplay from './AIResultDisplay';
import { canWrite } from '../services/api';

/**
 * Generic Gov-Benefits page.
 * Props:
 *   - title, subtitle
 *   - api: benefitsCrud(name)
 *   - fields: [{ key, label, type?, options? }]
 *   - statusKey?: string
 *   - aiVerbs: [{ verb, label, inputs: [{ key, label, type?, placeholder?, options? }] }]
 *   - featureKey: string  (used for page-level stats)
 */
export default function BenefitPage({ title, subtitle, api, fields, statusKey, aiVerbs = [], featureKey }) {
  const PAGE_SIZE = 25;
  const writer = canWrite();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
  const [stats, setStats] = useState(null);

  // detail/AI panel
  const [detailRow, setDetailRow] = useState(null);
  const [activeAiVerb, setActiveAiVerb] = useState(null);
  const [aiInputs, setAiInputs] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  // import
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileInputRef = useRef(null);

  const emptyDraft = () =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? 0 : '']));

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api.list();
      const list = data?.data ?? (Array.isArray(data) ? data : []);
      setRows(list);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCount = async () => {
    try { const r = await api.count(); setTotalCount(r?.count ?? null); } catch (_) {}
  };

  const loadStats = async () => {
    try { const r = await api.statsSummary(); setStats(r); } catch (_) {}
  };

  useEffect(() => { load(); loadCount(); loadStats(); }, []); // eslint-disable-line
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => { setDraft(emptyDraft()); setCreating(true); setEditing(null); };
  const openEdit = (row) => { setDraft({ ...row }); setEditing(row); setCreating(false); };
  const closeModal = () => { setCreating(false); setEditing(null); setDraft({}); };

  const handleSave = async () => {
    try {
      if (editing) await api.update(editing.id, draft);
      else await api.create(draft);
      closeModal();
      load();
      loadCount();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Archive ${row[fields[0]?.key] || row.id}?`)) return;
    try { await api.remove(row.id); load(); loadCount(); } catch (e) { alert(e.message); }
  };

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.trim().length >= 2) {
      try {
        const r = await api.search(q);
        setRows(r?.data ?? []);
      } catch (_) {}
    } else if (q.trim().length === 0) {
      load();
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      fields.some((f) => {
        const v = row[f.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, search, fields]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExportCsv = () => {
    const url = api.exportCsv();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${featureKey || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await api.importCsv(text);
      setImportResult(result);
      load();
      loadCount();
    } catch (e) {
      setImportResult({ error: e.message });
    } finally {
      setImportBusy(false);
    }
  };

  const openDetail = (row) => {
    setDetailRow(row);
    setActiveAiVerb(null);
    setAiResult(null);
    setAiError(null);
    if (aiVerbs.length > 0) {
      const first = aiVerbs[0];
      setActiveAiVerb(first);
      setAiInputs(Object.fromEntries((first.inputs || []).map((i) => [i.key, i.defaultValue ?? ''])));
    }
  };
  const closeDetail = () => { setDetailRow(null); setAiResult(null); setAiError(null); };

  const selectVerb = (verb) => {
    setActiveAiVerb(verb);
    setAiInputs(Object.fromEntries((verb.inputs || []).map((i) => [i.key, i.defaultValue ?? ''])));
    setAiResult(null);
    setAiError(null);
  };

  const runAi = async () => {
    if (!activeAiVerb) return;
    setAiLoading(true);
    setAiResult(null);
    setAiError(null);
    try {
      const body = { ...(detailRow ? { id: detailRow.id } : {}), ...aiInputs };
      const r = await api.ai(activeAiVerb.verb, body);
      setAiResult(r?.result ?? r);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const renderCell = (row, f) => {
    const v = row[f.key];
    if (v == null) return <span style={{ color: '#64748b' }}>—</span>;
    if (f.key === statusKey || ['status','priority','severity'].includes(f.key)) {
      const cls = String(v).toLowerCase().replace(/\W+/g, '_');
      return <span className={`badge ${cls}`}>{String(v)}</span>;
    }
    if (typeof v === 'string' && v.length > 80) return v.slice(0, 80) + '…';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          {totalCount !== null && (
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
              {totalCount} total record{totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn secondary" onClick={handleExportCsv}>Export CSV</button>
          {writer && (
            <>
              <button className="btn secondary" onClick={() => { setImportOpen(true); setImportResult(null); }}>
                Import CSV
              </button>
              <button className="btn" onClick={openCreate}>+ New</button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {stats.byStatus && stats.byStatus.map((s) => (
            <div key={s.status} className="card" style={{ padding: '8px 16px', minWidth: 110 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{s.status || 'unknown'}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="toolbar-meta">
          {filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}
          {!writer && <span style={{ marginLeft: 12, color: '#fbbf24' }}>view-only role</span>}
        </div>
      </div>

      {err && <div className="ai-error">Failed to load: {err}</div>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : filteredRows.length === 0 ? (
        <div className="empty-state">
          {rows.length === 0
            ? (writer ? 'No records yet. Click "+ New" to add one.' : 'No records yet.')
            : 'No records match your search.'}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {fields.slice(0, 6).map((f) => <th key={f.key}>{f.label}</th>)}
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    {fields.slice(0, 6).map((f) => <td key={f.key}>{renderCell(row, f)}</td>)}
                    <td style={{ textAlign: 'right' }}>
                      {aiVerbs.length > 0 && (
                        <button className="btn ai" onClick={() => openDetail(row)} style={{ marginRight: 6 }}>
                          AI
                        </button>
                      )}
                      {writer && (
                        <>
                          <button className="btn secondary" onClick={() => openEdit(row)} style={{ marginRight: 6 }}>Edit</button>
                          <button className="btn danger" onClick={() => handleDelete(row)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>← Prev</button>
              <span className="page-indicator">Page {safePage} of {totalPages}</span>
              <button className="btn secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {(creating || editing) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>{editing ? `Edit ${title}` : `New ${title}`}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {fields.map((f) => (
                  <div key={f.key} className={`form-group ${f.type === 'textarea' ? 'full-width' : ''}`}>
                    <label>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                        <option value="">—</option>
                        {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
                    ) : (
                      <input
                        type={f.type || 'text'}
                        value={draft[f.key] ?? ''}
                        onChange={(e) =>
                          setField(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeModal}>Cancel</button>
              <button className="btn" onClick={handleSave}>{editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Import CSV → {title}</h3>
              <button className="modal-close" onClick={() => setImportOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                CSV header keys: <code>{fields.map((f) => f.key).join(', ')}</code>
              </p>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
              {importBusy && <div className="empty-state">Importing...</div>}
              {importResult && (
                <pre style={{ background: '#0b1424', padding: 12, marginTop: 10, borderRadius: 8, fontSize: 12 }}>
                  {JSON.stringify(importResult, null, 2)}
                </pre>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setImportOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail + AI Verbs Panel */}
      {detailRow && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 960, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{title} · Record #{detailRow.id}</h3>
              <button className="modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="modal-body">
              {/* Record Fields */}
              <div className="form-grid" style={{ marginBottom: 24 }}>
                {fields.map((f) => (
                  <div key={f.key} className={`form-group ${f.type === 'textarea' ? 'full-width' : ''}`}>
                    <label style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>{f.label}</label>
                    <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>
                      {detailRow[f.key] != null ? String(detailRow[f.key]) : <span style={{ color: '#475569' }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Verbs */}
              {aiVerbs.length > 0 && (
                <div>
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16, marginBottom: 12 }}>
                    <h4 style={{ margin: '0 0 12px', color: '#7c3aed' }}>AI Analysis Tools</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {aiVerbs.map((v) => (
                        <button
                          key={v.verb}
                          className={`btn ${activeAiVerb?.verb === v.verb ? 'ai' : 'secondary'}`}
                          style={{ fontSize: 12 }}
                          onClick={() => selectVerb(v)}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeAiVerb && (
                    <div className="card" style={{ marginBottom: 16 }}>
                      <h5 style={{ margin: '0 0 12px', color: '#a78bfa' }}>{activeAiVerb.label}</h5>
                      {(activeAiVerb.inputs || []).length > 0 && (
                        <div className="form-grid" style={{ marginBottom: 12 }}>
                          {activeAiVerb.inputs.map((i) => (
                            <div key={i.key} className={`form-group ${i.type === 'textarea' ? 'full-width' : ''}`}>
                              <label>{i.label}</label>
                              {i.type === 'textarea' ? (
                                <textarea
                                  placeholder={i.placeholder || ''}
                                  value={aiInputs[i.key] ?? ''}
                                  onChange={(e) => setAiInputs((s) => ({ ...s, [i.key]: e.target.value }))}
                                />
                              ) : i.type === 'select' ? (
                                <select
                                  value={aiInputs[i.key] ?? ''}
                                  onChange={(e) => setAiInputs((s) => ({ ...s, [i.key]: e.target.value }))}
                                >
                                  <option value="">—</option>
                                  {(i.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={i.type || 'text'}
                                  placeholder={i.placeholder || ''}
                                  value={aiInputs[i.key] ?? ''}
                                  onChange={(e) => setAiInputs((s) => ({ ...s, [i.key]: e.target.value }))}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn ai" onClick={runAi} disabled={aiLoading}>
                        {aiLoading ? <><span className="spinner" />Running...</> : `Run: ${activeAiVerb.label}`}
                      </button>
                    </div>
                  )}

                  {aiError && <div className="ai-error">{aiError}</div>}
                  {aiResult && (
                    <AIResultDisplay result={aiResult} feature={featureKey} title={activeAiVerb?.label || ''} />
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {writer && (
                <button className="btn secondary" onClick={() => { closeDetail(); openEdit(detailRow); }}>
                  Edit Record
                </button>
              )}
              <button className="btn secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
