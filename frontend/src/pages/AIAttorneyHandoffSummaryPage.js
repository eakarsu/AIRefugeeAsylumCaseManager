import React from 'react';
import AIPage from '../components/AIPage';
import { aiAttorneyHandoffSummary } from '../services/api';

export default function AIAttorneyHandoffSummaryPage() {
  return (
    <AIPage
      title="AI · Attorney Handoff Summary"
      feature="attorney-handoff-summary"
      subtitle="Build a handoff packet for an incoming attorney — open items, deadlines, client notes."
      inputs={[
        { key: 'case_summary',   label: 'Case Summary',     type: 'textarea' },
        { key: 'outgoing_notes', label: 'Outgoing Attorney Notes', type: 'textarea' },
      ]}
      run={(v) => aiAttorneyHandoffSummary({ case_summary: v.case_summary, outgoing_notes: v.outgoing_notes })}
    />
  );
}
