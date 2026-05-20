import React from 'react';
import AIPage from '../components/AIPage';
import { aiCountryConditionsSummary } from '../services/api';

export default function AICountryConditionsSummaryPage() {
  return (
    <AIPage
      title="AI · Country Conditions Summary"
      feature="country-conditions-summary"
      subtitle="Summarize current country conditions, key actors and protected-grounds risk for an asylum claim."
      inputs={[
        { key: 'country', label: 'Country' },
        { key: 'period',  label: 'Period', placeholder: 'e.g. 2024-2026' },
        { key: 'notes',   label: 'Notes',  type: 'textarea' },
      ]}
      run={(v) => aiCountryConditionsSummary({ country: v.country, period: v.period, context: { notes: v.notes } })}
    />
  );
}
