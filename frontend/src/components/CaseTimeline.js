import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { getCaseTimeline } from '../services/api';

// Horizontal bar chart: one bar per case, length = days from intake_date
// through the case's latest hearing (or today if no hearing yet).
const STATUS_COLORS = {
  open:           '#3b82f6',
  in_hearing:     '#10b981',
  appeal_pending: '#f59e0b',
  closed:         '#64748b',
};

export default function CaseTimeline() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getCaseTimeline(20)
      .then((d) => setData(d.series || []))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error" data-testid="case-timeline-error">Timeline error: {err}</div>;
  if (!data) return <div data-testid="case-timeline-loading">Loading case timeline…</div>;
  if (data.length === 0) return <div data-testid="case-timeline-empty">No cases to chart.</div>;

  const height = Math.max(320, data.length * 26);

  return (
    <div data-testid="case-timeline" style={{ width: '100%' }}>
      <div style={{ color: '#cbd5e1', fontSize: 13, margin: '0 0 8px' }}>
        Case Status Timeline · {data.length} cases · bar length = days from intake through latest hearing
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            label={{ value: 'days open', position: 'insideBottom', offset: -2, fill: '#94a3b8' }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={210}
            stroke="#94a3b8"
            tick={{ fontSize: 11, fill: '#cbd5e1' }}
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            formatter={(v, _n, p) => [`${v} days`, p?.payload?.status || 'days']}
            labelFormatter={(l, payload) => {
              const p = payload && payload[0]?.payload;
              if (!p) return l;
              return `${p.case_id} · ${p.client_name || ''} (${p.country || '—'})`;
            }}
          />
          <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          <Bar dataKey="days_open" name="days from intake" radius={[0, 4, 4, 0]}>
            {data.map((row, i) => (
              <Cell key={i} fill={STATUS_COLORS[row.status] || '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
