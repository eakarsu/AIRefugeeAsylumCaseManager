import React from 'react';
import AIPage from '../components/AIPage';
import { aiSponsorPetitionDraft } from '../services/api';

export default function AISponsorPetitionDraftPage() {
  return (
    <AIPage
      title="AI · Sponsor Petition Draft"
      feature="sponsor-petition-draft"
      subtitle="Outline an I-134A / Welcome Corps / P-3 sponsor petition."
      inputs={[
        { key: 'beneficiary_text', label: 'Beneficiary',  type: 'textarea' },
        { key: 'sponsor_text',     label: 'Sponsor',      type: 'textarea' },
        { key: 'program',          label: 'Program',      placeholder: 'Welcome Corps, I-134A, CHNV, P-3, etc.' },
        { key: 'notes',            label: 'Notes',        type: 'textarea' },
      ]}
      run={(v) => aiSponsorPetitionDraft({
        beneficiary_text: v.beneficiary_text,
        sponsor_text: v.sponsor_text,
        program: v.program,
        context: { notes: v.notes },
      })}
    />
  );
}
