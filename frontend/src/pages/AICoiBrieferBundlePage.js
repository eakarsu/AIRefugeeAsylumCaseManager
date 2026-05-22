import React from 'react';
import AIPage from '../components/AIPage';
import { aiCoiBrieferBundle } from '../services/api';

export default function AICoiBrieferBundlePage() {
  return (
    <AIPage
      title="AI · COI Briefer (Source Bundle)"
      feature="coi-briefer-bundle"
      subtitle="Country-of-origin briefer constrained to a caller-supplied source bundle. Findings cite ONLY provided sources; unsupported assertions are flagged."
      inputs={[
        { key: 'country',      label: 'Country',     type: 'text',     placeholder: 'e.g. Honduras' },
        { key: 'claim_basis',  label: 'Claim Basis', type: 'textarea', placeholder: 'PSG / religion / political opinion summary' },
        { key: 'sources_text', label: 'Source Bundle (JSON array)', type: 'textarea',
          placeholder: '[{ "source_id": "S1", "title": "...", "date": "2025-01-01", "excerpt": "..." }]' },
      ]}
      run={(v) => aiCoiBrieferBundle({
        country: v.country,
        claim_basis: v.claim_basis,
        sources_text: v.sources_text,
      })}
    />
  );
}
