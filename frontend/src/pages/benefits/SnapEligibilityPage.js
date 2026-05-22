import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { snapEligibilityApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',               label: 'Case ID' },
  { key: 'applicant_id',          label: 'Applicant ID' },
  { key: 'household_size',        label: 'Household Size', type: 'number' },
  { key: 'gross_monthly_income',  label: 'Gross Monthly Income', type: 'number' },
  { key: 'net_monthly_income',    label: 'Net Monthly Income', type: 'number' },
  { key: 'gross_income_limit',    label: 'Gross Income Limit', type: 'number' },
  { key: 'net_income_limit',      label: 'Net Income Limit', type: 'number' },
  { key: 'standard_deduction',    label: 'Standard Deduction', type: 'number' },
  { key: 'earned_income_deduction', label: 'Earned Income Deduction', type: 'number' },
  { key: 'dependent_care_deduction', label: 'Dependent Care Deduction', type: 'number' },
  { key: 'shelter_deduction',     label: 'Shelter Deduction', type: 'number' },
  { key: 'medical_deduction',     label: 'Medical Deduction', type: 'number' },
  { key: 'abawd_status',          label: 'ABAWD Status', type: 'select', options: ['exempt','subject','compliant','non_compliant'] },
  { key: 'categorical_eligibility', label: 'Categorical Eligibility', type: 'select', options: ['standard','broad','not_applicable'] },
  { key: 'immigration_status',    label: 'Immigration Status' },
  { key: 'state',                 label: 'State' },
  { key: 'benefit_amount',        label: 'Benefit Amount', type: 'number' },
  { key: 'certification_period_end', label: 'Cert Period End', type: 'date' },
  { key: 'status',                label: 'Status', type: 'select', options: ['pending','active','denied','renewal_pending','archived'] },
  { key: 'notes',                 label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',            label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'calculate-gross-income', label: 'Calculate Gross Income', inputs: [] },
  { verb: 'calculate-net-income', label: 'Calculate Net Income', inputs: [] },
  { verb: 'classify-deduction', label: 'Classify Deduction', inputs: [] },
  { verb: 'detect-able-bodied-adult-without-dependents-status', label: 'Detect ABAWD Status', inputs: [] },
  { verb: 'predict-allotment', label: 'Predict Allotment', inputs: [] },
  { verb: 'suggest-additional-deductions', label: 'Suggest Additional Deductions', inputs: [] },
  { verb: 'generate-snap-narrative', label: 'Generate SNAP Narrative', inputs: [] },
  { verb: 'summarize-household-snap-history', label: 'Summarize Household SNAP History', inputs: [] },
  { verb: 'validate-shelter-cost', label: 'Validate Shelter Cost', inputs: [] },
  { verb: 'recommend-recertification-timing', label: 'Recommend Recertification Timing', inputs: [] },
  { verb: 'classify-special-population', label: 'Classify Special Population', inputs: [] },
  { verb: 'predict-benefit-change', label: 'Predict Benefit Change', inputs: [] },
  { verb: 'detect-overissuance', label: 'Detect Overissuance', inputs: [] },
  { verb: 'generate-overissuance-notice', label: 'Generate Overissuance Notice', inputs: [] },
  { verb: 'score-budget-accuracy', label: 'Score Budget Accuracy', inputs: [] },
  { verb: 'suggest-categorical-eligibility', label: 'Suggest Categorical Eligibility', inputs: [] },
];

export default function SnapEligibilityPage() {
  return (
    <BenefitPage
      title="SNAP Eligibility"
      subtitle="Supplemental Nutrition Assistance Program eligibility and benefit calculations."
      api={snapEligibilityApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="snap-eligibility"
    />
  );
}
