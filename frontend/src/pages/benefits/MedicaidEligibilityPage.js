import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { medicaidEligibilityApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',             label: 'Case ID' },
  { key: 'applicant_id',        label: 'Applicant ID' },
  { key: 'eligibility_pathway', label: 'Eligibility Pathway' },
  { key: 'magi_income',         label: 'MAGI Income', type: 'number' },
  { key: 'fpl_percentage',      label: 'FPL %', type: 'number' },
  { key: 'household_size',      label: 'Household Size', type: 'number' },
  { key: 'citizenship_status',  label: 'Citizenship Status' },
  { key: 'immigration_status',  label: 'Immigration Status' },
  { key: 'five_year_bar_applies', label: '5-Year Bar Applies', type: 'select', options: ['true','false'] },
  { key: 'state',               label: 'State' },
  { key: 'program_type',        label: 'Program Type' },
  { key: 'determination_date',  label: 'Determination Date', type: 'date' },
  { key: 'renewal_date',        label: 'Renewal Date', type: 'date' },
  { key: 'status',              label: 'Status', type: 'select', options: ['pending','active','denied','renewal_pending','archived'] },
  { key: 'notes',               label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',          label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-eligibility-pathway', label: 'Classify Pathway', inputs: [] },
  { verb: 'calculate-magi', label: 'Calculate MAGI', inputs: [] },
  { verb: 'detect-five-year-bar', label: 'Detect Five-Year Bar', inputs: [] },
  { verb: 'predict-renewal-risk', label: 'Predict Renewal Risk', inputs: [] },
  { verb: 'suggest-additional-info-needed', label: 'Suggest Missing Info', inputs: [] },
  { verb: 'generate-determination-narrative', label: 'Generate Narrative', inputs: [] },
  { verb: 'summarize-case-history', label: 'Summarize Case History', inputs: [] },
  { verb: 'score-app-completeness', label: 'Score Completeness', inputs: [] },
  { verb: 'validate-income-vs-fpl', label: 'Validate Income vs FPL', inputs: [] },
  { verb: 'recommend-program-alternative', label: 'Recommend Alternatives', inputs: [] },
  { verb: 'classify-disability-category', label: 'Classify Disability Category', inputs: [] },
  { verb: 'predict-eligibility-outcome', label: 'Predict Outcome', inputs: [] },
  { verb: 'detect-fraud-indicator', label: 'Detect Fraud Indicators', inputs: [] },
  { verb: 'generate-eligibility-letter', label: 'Generate Eligibility Letter', inputs: [] },
  { verb: 'suggest-presumptive-eligibility', label: 'Suggest Presumptive Eligibility', inputs: [] },
  { verb: 'score-policy-citation', label: 'Policy Citation Lookup', inputs: [
    { key: 'question', label: 'Policy Question', type: 'textarea', placeholder: 'e.g. Does the five-year bar apply to refugees?' },
  ]},
];

export default function MedicaidEligibilityPage() {
  return (
    <BenefitPage
      title="Medicaid Eligibility"
      subtitle="MAGI and non-MAGI Medicaid determinations for refugees and asylees."
      api={medicaidEligibilityApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="medicaid-eligibility"
    />
  );
}
