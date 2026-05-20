import React from 'react';
import AIPage from '../components/AIPage';
import { aiHardshipEvidenceSuggest } from '../services/api';

export default function AIHardshipEvidenceSuggestPage() {
  return (
    <AIPage
      title="AI · Hardship Evidence Suggest"
      feature="hardship-evidence-suggest"
      subtitle="Suggest evidence categories for I-601A / cancellation / humanitarian asylum hardship narratives."
      inputs={[
        { key: 'client_facts', label: 'Client Facts',   type: 'textarea' },
        { key: 'relief_type',  label: 'Relief Type',    placeholder: 'I-601A, cancellation of removal, humanitarian asylum, VAWA, etc.' },
        { key: 'notes',        label: 'Notes',          type: 'textarea' },
      ]}
      run={(v) => aiHardshipEvidenceSuggest({ client_facts: v.client_facts, relief_type: v.relief_type, context: { notes: v.notes } })}
    />
  );
}
