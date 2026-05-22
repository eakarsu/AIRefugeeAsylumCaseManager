import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { incomeVerificationApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',                 label: 'Case ID' },
  { key: 'applicant_id',            label: 'Applicant ID' },
  { key: 'verification_type',       label: 'Verification Type', type: 'select', options: ['paystub','tax_return','employer_letter','self_declaration','bank_statement','other'] },
  { key: 'income_type',             label: 'Income Type', type: 'select', options: ['wages','self_employment','rental','retirement','disability','child_support','other'] },
  { key: 'gross_monthly_income',    label: 'Gross Monthly Income', type: 'number' },
  { key: 'net_monthly_income',      label: 'Net Monthly Income', type: 'number' },
  { key: 'employer_name',           label: 'Employer Name' },
  { key: 'pay_frequency',           label: 'Pay Frequency', type: 'select', options: ['weekly','bi_weekly','semi_monthly','monthly','irregular'] },
  { key: 'verification_document',   label: 'Verification Document' },
  { key: 'verification_date',       label: 'Verification Date', type: 'date' },
  { key: 'discrepancy_flag',        label: 'Discrepancy Flag', type: 'select', options: ['true','false'] },
  { key: 'discrepancy_description', label: 'Discrepancy Description', type: 'textarea' },
  { key: 'program_context',         label: 'Program Context', type: 'select', options: ['Medicaid','SNAP','TANF','SSI','multiple'] },
  { key: 'status',                  label: 'Status', type: 'select', options: ['pending','verified','flagged','rejected','archived'] },
  { key: 'notes',                   label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',              label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'parse-paystub', label: 'Parse Paystub', inputs: [
    { key: 'paystub_text', label: 'Paystub Text', type: 'textarea', placeholder: 'Paste paystub text or description...' },
  ]},
  { verb: 'parse-tax-return', label: 'Parse Tax Return', inputs: [
    { key: 'tax_return_text', label: 'Tax Return Text', type: 'textarea', placeholder: 'Paste tax return excerpts...' },
  ]},
  { verb: 'parse-employer-letter', label: 'Parse Employer Letter', inputs: [
    { key: 'letter_text', label: 'Letter Text', type: 'textarea', placeholder: 'Paste employer letter...' },
  ]},
  { verb: 'classify-income-type', label: 'Classify Income Type', inputs: [] },
  { verb: 'predict-income-stability', label: 'Predict Income Stability', inputs: [] },
  { verb: 'suggest-verification-source', label: 'Suggest Verification Source', inputs: [] },
  { verb: 'generate-discrepancy-narrative', label: 'Generate Discrepancy Narrative', inputs: [] },
  { verb: 'summarize-12-month-income', label: 'Summarize 12-Month Income', inputs: [] },
  { verb: 'validate-pay-frequency', label: 'Validate Pay Frequency', inputs: [] },
  { verb: 'recommend-prospective-vs-historical', label: 'Prospective vs Historical', inputs: [] },
  { verb: 'classify-irregular-income', label: 'Classify Irregular Income', inputs: [] },
  { verb: 'predict-income-trend', label: 'Predict Income Trend', inputs: [] },
  { verb: 'detect-undisclosed-income', label: 'Detect Undisclosed Income', inputs: [] },
  { verb: 'generate-rfp-request', label: 'Generate RFP Request', inputs: [] },
  { verb: 'score-verification-quality', label: 'Score Verification Quality', inputs: [] },
  { verb: 'suggest-self-employment-net-calc', label: 'Self-Employment Net Calc', inputs: [] },
];

export default function IncomeVerificationPage() {
  return (
    <BenefitPage
      title="Income Verification"
      subtitle="Document and verify income sources for benefits eligibility across all programs."
      api={incomeVerificationApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="income-verification"
    />
  );
}
