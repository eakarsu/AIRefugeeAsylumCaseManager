import React from 'react';
import AIPage from '../components/AIPage';
import { aiRegulatoryUpdateBrief } from '../services/api';

export default function AIRegulatoryUpdateBriefPage() {
  return (
    <AIPage
      title="AI · Regulatory Update Brief"
      feature="regulatory-update-brief"
      subtitle="Summarize recent regulations, policy memos and case law on an immigration topic."
      inputs={[
        { key: 'topic',        label: 'Topic',        placeholder: 'e.g. asylum bar, TPS designations, credible-fear' },
        { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'US, US — 9th Cir., etc.' },
        { key: 'notes',        label: 'Notes',        type: 'textarea' },
      ]}
      run={(v) => aiRegulatoryUpdateBrief({ topic: v.topic, jurisdiction: v.jurisdiction, context: { notes: v.notes } })}
    />
  );
}
