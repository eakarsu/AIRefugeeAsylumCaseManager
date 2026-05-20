import React from 'react';
import AIPage from '../components/AIPage';
import { aiEvidenceGapAnalyze } from '../services/api';

export default function AIEvidenceGapAnalyzePage() {
  return (
    <AIPage
      title="AI · Evidence Gap Analyze"
      feature="evidence-gap-analyze"
      subtitle="Identify missing or weak evidence given the claim elements and current dossier contents."
      inputs={[
        { key: 'claim',                 label: 'Claim (legal theory)', type: 'textarea', placeholder: 'e.g. PSG — Honduran women unable to leave abusive intra-family relationship.' },
        { key: 'existing_evidence_text',label: 'Existing Evidence (free-form)', type: 'textarea', placeholder: 'List what is already in the file.' },
      ]}
      run={(v) => aiEvidenceGapAnalyze({ claim: v.claim, existing_evidence: v.existing_evidence_text })}
    />
  );
}
