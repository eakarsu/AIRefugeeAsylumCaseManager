import React, { useEffect, useState } from 'react';
import AIResultDisplay from './AIResultDisplay';
import { getAIHistory, getAISamples } from '../services/api';

/**
 * Generic AI feature page.
 * Props:
 *   - title, subtitle
 *   - feature: string  (matches backend `feature` column in ai_results, e.g. "plan-mission")
 *   - inputs: [{ key, label, type?, placeholder?, options?, defaultValue? }]
 *   - run: async (values) => result
 *   - buttonLabel?
 */
export default function AIPage({ title, subtitle, feature, inputs, run, buttonLabel = 'Run AI Analysis' }) {
  const initial = Object.fromEntries(
    (inputs || []).map((i) => [i.key, i.defaultValue ?? (i.type === 'number' ? 0 : '')])
  );
  const [values, setValues] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [samples, setSamples] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!feature) return undefined;
    getAISamples(feature)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data?.samples) ? data.samples : [];
        setSamples(list);
      })
      .catch(() => { if (alive) setSamples([]); });
    return () => { alive = false; };
  }, [feature]);

  const setField = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const applySample = (sample) => {
    const next = { ...initial };
    const sv = sample && sample.values ? sample.values : {};
    for (const k of Object.keys(sv)) next[k] = sv[k];
    setValues(next);
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await run(values);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRows([]);
    try {
      const rows = await getAIHistory(feature, 50);
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setHistoryError(e.message);
    } finally {
      setHistoryLoading(false);
    }
  };
  const closeHistory = () => setHistoryOpen(false);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="page-header-actions">
          {feature && (
            <button className="btn secondary" onClick={openHistory}>History</button>
          )}
          <button className="btn ai" onClick={handleRun} disabled={loading}>
            {loading ? <><span className="spinner" />Running...</> : buttonLabel}
          </button>
        </div>
      </div>

      {samples && samples.length > 0 && inputs && inputs.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 600, marginRight: 8 }}>Sample Fill:</span>
            {samples.slice(0, 5).map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="btn secondary"
                title={s.label}
                onClick={() => applySample(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(inputs && inputs.length > 0) && (
        <div className="card">
          <div className="form-grid">
            {inputs.map((i) => (
              <div key={i.key} className={`form-group ${i.type === 'textarea' ? 'full-width' : ''}`}>
                <label>{i.label}</label>
                {i.type === 'select' ? (
                  <select value={values[i.key] ?? ''} onChange={(e) => setField(i.key, e.target.value)}>
                    <option value="">—</option>
                    {(i.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : i.type === 'textarea' ? (
                  <textarea
                    placeholder={i.placeholder || ''}
                    value={values[i.key] ?? ''}
                    onChange={(e) => setField(i.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={i.type || 'text'}
                    placeholder={i.placeholder || ''}
                    value={values[i.key] ?? ''}
                    onChange={(e) =>
                      setField(i.key, i.type === 'number' ? Number(e.target.value || 0) : e.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AIResultDisplay
        result={result}
        loading={loading}
        error={error}
        feature={feature}
        title={title}
      />

      {historyOpen && (
        <div className="modal-overlay" onClick={closeHistory}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>{title} · History</h3>
              <button className="modal-close" onClick={closeHistory}>×</button>
            </div>
            <div className="modal-body">
              {historyLoading && <div className="empty-state">Loading history...</div>}
              {historyError && <div className="ai-error">{historyError}</div>}
              {!historyLoading && !historyError && historyRows.length === 0 && (
                <div className="empty-state">No past results for this feature yet.</div>
              )}
              {historyRows.map((row) => (
                <div key={row.id} className="history-entry">
                  <div className="history-entry-meta">
                    <span className="history-entry-id">#{row.id}</span>
                    <span className="history-entry-time">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  {row.input && Object.keys(row.input).length > 0 && (
                    <details>
                      <summary>Input parameters</summary>
                      <div style={{ marginTop: 8 }}>
                        <AIResultDisplay result={row.input} feature={`${feature}-input`} title="Input" />
                      </div>
                    </details>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <AIResultDisplay result={row.output} feature={feature} title={title} />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeHistory}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
