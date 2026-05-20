import React from 'react';
import AIPage from '../components/AIPage';
import { aiAsylumNarrativeDraft } from '../services/api';

export default function AIAsylumNarrativeDraftPage() {
  return (
    <AIPage
      title="AI · Asylum Narrative Draft"
      feature="asylum-narrative-draft"
      subtitle="Draft a chronological I-589 declaration outline + nexus analysis."
      inputs={[
        { key: 'client_facts',      label: 'Client Facts',      type: 'textarea', placeholder: 'Age, country, key dates, persecution events.' },
        { key: 'persecution_basis', label: 'Persecution Basis', type: 'textarea', placeholder: 'Protected ground(s) + nexus.' },
        { key: 'notes',             label: 'Drafting Notes',    type: 'textarea' },
      ]}
      run={(v) => aiAsylumNarrativeDraft({ client_facts: v.client_facts, persecution_basis: v.persecution_basis, context: { notes: v.notes } })}
    />
  );
}
