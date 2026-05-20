import React, { useEffect, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { getOriginHeatmap } from '../services/api';

// Recharts Treemap of clients by country_of_origin.
function CountryCell(props) {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 0 || height < 0) return null;
  const showLabel = width > 60 && height > 28;
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        style={{ fill: fill || '#3b82f6', stroke: '#0f172a', strokeWidth: 1 }}
      />
      {showLabel && (
        <>
          <text x={x + 6} y={y + 16} fill="#0f172a" fontSize={12} fontWeight={700}>
            {name}
          </text>
          <text x={x + 6} y={y + 32} fill="#0f172a" fontSize={11}>
            {value} clients
          </text>
        </>
      )}
    </g>
  );
}

export default function OriginHeatmap() {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState(null);

  useEffect(() => {
    getOriginHeatmap().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="ai-error" data-testid="origin-heatmap-error">Heatmap error: {err}</div>;
  if (!data) return <div data-testid="origin-heatmap-loading">Loading origin heatmap…</div>;
  if (!data.treemap?.length) return <div data-testid="origin-heatmap-empty">No client country data.</div>;

  return (
    <div data-testid="origin-heatmap" style={{ width: '100%' }}>
      <div style={{ color: '#cbd5e1', fontSize: 13, margin: '0 0 8px' }}>
        Country of Origin Heatmap · {data.count} countries · {data.total_clients} clients
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <Treemap
          data={data.treemap}
          dataKey="size"
          nameKey="name"
          stroke="#0f172a"
          content={<CountryCell />}
          isAnimationActive={false}
        >
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            formatter={(value, _n, p) => {
              const d = p?.payload || {};
              return [`${value} clients (${d.active || 0} active, ${d.intake || 0} intake)`, d.name];
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
