import React from 'react';
import AIPage from '../components/AIPage';
import { aiHearingQaSimulator } from '../services/api';

export default function AIHearingQaSimulatorPage() {
  return (
    <AIPage
      title="AI · Hearing-Prep Q&A Simulator"
      feature="hearing-qa-simulator"
      subtitle="Turn-based hearing simulator. Choose IJ / AO / DHS trial attorney / BIA panel persona. Paste prior transcript as JSON to advance turns."
      inputs={[
        { key: 'case_summary',     label: 'Case Summary', type: 'textarea',
          placeholder: 'Short case posture: client, country, claim, hearing type.' },
        { key: 'persona',          label: 'Persona',      type: 'select',
          options: ['IJ', 'AO', 'DHS_trial_atty', 'BIA_panel'], defaultValue: 'IJ' },
        { key: 'transcript_text',  label: 'Prior Transcript (JSON array)', type: 'textarea',
          placeholder: '[{ "speaker": "IJ", "text": "Please state your full name..." }, { "speaker": "CL", "text": "..." }]' },
      ]}
      run={(v) => aiHearingQaSimulator({
        case_summary: v.case_summary,
        persona: v.persona,
        transcript_text: v.transcript_text,
      })}
    />
  );
}
