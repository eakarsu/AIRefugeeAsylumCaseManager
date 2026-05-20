import React from 'react';
import AIPage from '../components/AIPage';
import { aiInterpreterMatch } from '../services/api';

export default function AIInterpreterMatchPage() {
  return (
    <AIPage
      title="AI · Interpreter Match"
      feature="interpreter-match"
      subtitle="Match the right interpreter to a client given languages, dialect, gender and clan sensitivities."
      inputs={[
        { key: 'client_country',     label: 'Client Country' },
        { key: 'client_languages',   label: 'Client Languages', type: 'textarea' },
        { key: 'case_sensitivities', label: 'Case Sensitivities', type: 'textarea' },
      ]}
      run={(v) => aiInterpreterMatch({
        client_country: v.client_country,
        client_languages: v.client_languages,
        case_sensitivities: v.case_sensitivities,
      })}
    />
  );
}
