import React, { useEffect, useState } from 'react';
import {
  FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getGrantFunnel } from '../services/api';

// Vertical asylum funnel: intake -> hearing -> grant -> appeal
export default function GrantFunnel() {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState(null);

  useEffect(() => {
    getGrantFunnel().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error" data-testid="grant-funnel-error">Funnel error: {err}</div>;
  if (!data) return <div data-testid="grant-funnel-loading">Loading grant funnel…</div>;

  const stages = (data.stages || []).map((s) => ({
    name: s.stage,
    value: s.value,
    conversion: s.conversion_pct,
    fill: s.fill,
  }));

  return (
    <div data-testid="grant-funnel" style={{ width: '100%' }}>
      <div style={{ color: '#cbd5e1', fontSize: 13, margin: '0 0 8px' }}>
        Asylum Grant Funnel · overall grant rate {data.overall_grant_rate_pct}% (granted ÷ intake)
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <FunnelChart>
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            formatter={(v, _n, p) => {
              const d = p?.payload || {};
              return [`${v} (${d.conversion}% from prior)`, d.name];
            }}
          />
          <Funnel
            dataKey="value"
            nameKey="name"
            data={stages}
            orientation="vertical"
            isAnimationActive={false}
          >
            {stages.map((s, i) => <Cell key={i} fill={s.fill} />)}
            <LabelList
              position="right"
              fill="#e2e8f0"
              stroke="none"
              dataKey="name"
            />
            <LabelList
              position="center"
              fill="#0f172a"
              stroke="none"
              dataKey="value"
              fontWeight={700}
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
        {stages.map((s, i) => (
          <div key={s.name} data-testid={`funnel-stage-${i}`} style={{
            padding: '8px 10px', borderRadius: 6, background: '#0f172a',
            border: `1px solid ${s.fill}`,
          }}>
            <div style={{ color: s.fill, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{s.name}</div>
            <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.conversion}% conv.</div>
          </div>
        ))}
      </div>
    </div>
  );
}
