import React from 'react';
import AIPage from '../components/AIPage';
import { aiExecutiveBrief } from '../services/api';

export default function AIExecutiveBriefPage() {
  return (
    <AIPage
      title="AI · Executive Brief"
      feature="executive-brief"
      subtitle="Clinic-level snapshot for the managing attorney — caseload, hearings, risks, decisions."
      inputs={[
        { key: 'notes', label: 'Bias / Focus Notes (optional)', type: 'textarea',
          placeholder: 'e.g. Focus on upcoming hearings 7d, or BIA appeals, or funder reporting.' },
      ]}
      run={(v) => aiExecutiveBrief({ notes: v.notes })}
    />
  );
}
