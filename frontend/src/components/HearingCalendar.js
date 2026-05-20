import React, { useEffect, useState } from 'react';
import { getHearingCalendar } from '../services/api';

// 7x4 CSS grid calendar showing hearings per day and which courts hold each.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function heatColor(n) {
  if (!n) return 'transparent';
  if (n >= 6) return 'rgba(239,68,68,0.55)';   // red
  if (n >= 4) return 'rgba(249,115,22,0.45)';  // orange
  if (n >= 2) return 'rgba(245,158,11,0.4)';   // amber
  return 'rgba(59,130,246,0.35)';              // blue
}

export default function HearingCalendar() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [data,  setData]  = useState(null);
  const [err,   setErr]   = useState(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    getHearingCalendar(year, month).then(setData).catch((e) => setErr(e.message));
  }, [year, month]);

  function shift(delta) {
    let m = month + delta;
    let y = year;
    if (m < 1)  { m = 12; y -= 1; }
    if (m > 12) { m = 1;  y += 1; }
    setMonth(m);
    setYear(y);
  }

  if (err) return <div className="ai-error" data-testid="hearing-calendar-error">Calendar error: {err}</div>;
  if (!data) return <div data-testid="hearing-calendar-loading">Loading calendar…</div>;

  return (
    <div data-testid="hearing-calendar" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
        <div style={{ color: '#cbd5e1', fontSize: 13 }}>
          Hearing Calendar · {data.month_label} {data.year} · {data.total_hearings} hearings ·
          {' '}{Object.keys(data.court_totals || {}).length} courts
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={() => shift(-1)} data-testid="cal-prev">‹ Prev</button>
          <button className="btn secondary" onClick={() => shift( 1)} data-testid="cal-next">Next ›</button>
        </div>
      </div>

      <div
        data-testid="hearing-calendar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
          gap: 6,
          marginBottom: 6,
        }}
      >
        {DAY_NAMES.map((d) => (
          <div key={d} style={{
            color: '#94a3b8', fontSize: 11, textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: 1, padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
          gridTemplateRows: 'repeat(4, minmax(80px, auto))',
          gap: 6,
        }}
      >
        {data.grid.map((cell, i) => {
          const courts = Object.entries(cell.courts || {});
          return (
            <div
              key={i}
              data-testid="hearing-calendar-cell"
              data-date={cell.date}
              data-total={cell.total}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #1f2937',
                background: cell.in_month ? '#0f172a' : '#0b1220',
                opacity: cell.in_month ? 1 : 0.4,
                minHeight: 80,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: heatColor(cell.total),
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>{cell.day}</div>
                {cell.total > 0 && (
                  <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
                    {cell.total}
                  </div>
                )}
                <div style={{ marginTop: 2 }}>
                  {courts.slice(0, 3).map(([court, n]) => (
                    <div key={court} style={{ color: '#94a3b8', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {court.slice(0, 16)} · {n}
                    </div>
                  ))}
                  {courts.length > 3 && (
                    <div style={{ color: '#64748b', fontSize: 10 }}>+{courts.length - 3} more</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
