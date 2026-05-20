import React from 'react';
import CaseTimeline from '../components/CaseTimeline';
import HearingCalendar from '../components/HearingCalendar';
import OriginHeatmap from '../components/OriginHeatmap';
import GrantFunnel from '../components/GrantFunnel';

function Panel({ title, subtitle, children }) {
  return (
    <section
      data-testid="custom-views-panel"
      style={{
        background: '#0b1220',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: 16,
        marginBottom: 18,
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <h3 style={{
          color: '#e2e8f0', fontSize: 15, margin: 0,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>{title}</h3>
        {subtitle && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
      </header>
      {children}
    </section>
  );
}

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="dashboard-header">
        <h2>Case Analytics</h2>
        <p>Four custom views over cases, hearings, clients and asylum-grant outcomes.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Panel
          title="Case Status Timeline"
          subtitle="Horizontal bars from intake_date through latest hearing per case."
        >
          <CaseTimeline />
        </Panel>

        <Panel
          title="Hearing Calendar"
          subtitle="7×4 month grid · hearings per day per court."
        >
          <HearingCalendar />
        </Panel>

        <Panel
          title="Country of Origin Heatmap"
          subtitle="Treemap of clients grouped by country_of_origin."
        >
          <OriginHeatmap />
        </Panel>

        <Panel
          title="Asylum Grant Funnel"
          subtitle="Intake → Hearing → Grant → Appeal across asylum_grants."
        >
          <GrantFunnel />
        </Panel>
      </div>
    </div>
  );
}
