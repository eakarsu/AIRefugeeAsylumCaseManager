import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { ssiSsdiEligibilityApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',              label: 'Case ID' },
  { key: 'applicant_id',         label: 'Applicant ID' },
  { key: 'program_type',         label: 'Program Type', type: 'select', options: ['SSI','SSDI','both'] },
  { key: 'disability_onset_date', label: 'Disability Onset Date', type: 'date' },
  { key: 'medical_conditions',   label: 'Medical Conditions', type: 'textarea' },
  { key: 'listings_considered',  label: 'Listings Considered', type: 'textarea' },
  { key: 'sga_monthly_amount',   label: 'SGA Monthly Amount', type: 'number' },
  { key: 'countable_income',     label: 'Countable Income', type: 'number' },
  { key: 'countable_resources',  label: 'Countable Resources', type: 'number' },
  { key: 'citizenship_status',   label: 'Citizenship Status' },
  { key: 'work_credits',         label: 'Work Credits', type: 'number' },
  { key: 'application_date',     label: 'Application Date', type: 'date' },
  { key: 'determination_date',   label: 'Determination Date', type: 'date' },
  { key: 'decision',             label: 'Decision', type: 'select', options: ['pending','approved','denied','appealing','partially_approved'] },
  { key: 'rfc_assessment',       label: 'RFC Assessment', type: 'textarea' },
  { key: 'status',               label: 'Status', type: 'select', options: ['pending','active','denied','closed','archived'] },
  { key: 'notes',                label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',           label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-disability-listing', label: 'Classify Disability Listing', inputs: [] },
  { verb: 'calculate-substantial-gainful-activity', label: 'Calculate SGA', inputs: [] },
  { verb: 'detect-work-incentive-eligibility', label: 'Detect Work Incentive Eligibility', inputs: [] },
  { verb: 'predict-disability-decision', label: 'Predict Disability Decision', inputs: [] },
  { verb: 'suggest-medical-evidence-needed', label: 'Suggest Medical Evidence Needed', inputs: [] },
  { verb: 'generate-disability-narrative', label: 'Generate Disability Narrative', inputs: [] },
  { verb: 'summarize-medical-evidence', label: 'Summarize Medical Evidence', inputs: [] },
  { verb: 'score-listing-match-strength', label: 'Score Listing Match Strength', inputs: [] },
  { verb: 'validate-onset-date', label: 'Validate Onset Date', inputs: [] },
  { verb: 'recommend-listing-strategy', label: 'Recommend Listing Strategy', inputs: [] },
  { verb: 'classify-mental-vs-physical', label: 'Classify Mental vs Physical', inputs: [] },
  { verb: 'predict-cdr-result', label: 'Predict CDR Result', inputs: [] },
  { verb: 'detect-substantial-gainful-activity', label: 'Detect SGA', inputs: [] },
  { verb: 'generate-rfc-summary', label: 'Generate RFC Summary', inputs: [] },
  { verb: 'suggest-vocational-expert-question', label: 'Suggest VE Questions', inputs: [] },
  { verb: 'score-credibility', label: 'Score Claimant Credibility', inputs: [] },
];

export default function SsiSsdiEligibilityPage() {
  return (
    <BenefitPage
      title="SSI / SSDI Eligibility"
      subtitle="Supplemental Security Income and Social Security Disability Insurance determinations."
      api={ssiSsdiEligibilityApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="ssi-ssdi-eligibility"
    />
  );
}
