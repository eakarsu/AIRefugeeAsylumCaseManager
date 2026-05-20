import React from 'react';
import AIPage from '../components/AIPage';
import { aiCoiCiteMemo } from '../services/api';

export default function AICoiCiteMemoPage() {
  return (
    <AIPage
      title="AI · COI Cite Memo"
      feature="coi-cite-memo"
      subtitle="Generate a country-of-origin information citation memo for a specific claim basis."
      inputs={[
        { key: 'country',     label: 'Country',     type: 'text',     placeholder: 'e.g. Honduras' },
        { key: 'claim_basis', label: 'Claim Basis', type: 'textarea', placeholder: 'e.g. PSG — Honduran women unable to leave abusive intra-family relationship.' },
        { key: 'notes',       label: 'Notes',       type: 'textarea', placeholder: 'Any drafting orientation, audience, or COI gaps to fill.' },
      ]}
      run={(v) => aiCoiCiteMemo({ country: v.country, claim_basis: v.claim_basis, context: { notes: v.notes } })}
    />
  );
}
