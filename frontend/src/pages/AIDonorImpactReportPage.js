import React from 'react';
import AIPage from '../components/AIPage';
import { aiDonorImpactReport } from '../services/api';

export default function AIDonorImpactReportPage() {
  return (
    <AIPage
      title="AI · Donor Impact Report"
      feature="donor-impact-report"
      subtitle="Draft a donor / funder impact report from clinic aggregate metrics (no PII)."
      inputs={[
        { key: 'period',   label: 'Period',   placeholder: 'e.g. Q1 2026' },
        { key: 'audience', label: 'Audience', placeholder: 'major_donors, board_meeting, foundation_grant_report, newsletter' },
        { key: 'notes',    label: 'Notes',    type: 'textarea' },
      ]}
      run={(v) => aiDonorImpactReport({ period: v.period, audience: v.audience, notes: v.notes })}
    />
  );
}
