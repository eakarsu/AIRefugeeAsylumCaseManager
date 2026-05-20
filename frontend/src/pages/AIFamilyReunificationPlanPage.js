import React from 'react';
import AIPage from '../components/AIPage';
import { aiFamilyReunificationPlan } from '../services/api';

export default function AIFamilyReunificationPlanPage() {
  return (
    <AIPage
      title="AI · Family Reunification Plan"
      feature="family-reunification-plan"
      subtitle="Map family-reunification pathways (I-730, P-3, parole, derivative) and timeline."
      inputs={[
        { key: 'principal_text', label: 'Principal Client', type: 'textarea' },
        { key: 'members_text',   label: 'Family Members',   type: 'textarea' },
        { key: 'notes',          label: 'Notes',            type: 'textarea' },
      ]}
      run={(v) => aiFamilyReunificationPlan({
        principal_text: v.principal_text,
        members_text: v.members_text,
        context: { notes: v.notes },
      })}
    />
  );
}
