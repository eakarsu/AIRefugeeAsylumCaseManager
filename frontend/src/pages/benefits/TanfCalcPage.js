import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { tanfCalcApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',              label: 'Case ID' },
  { key: 'applicant_id',         label: 'Applicant ID' },
  { key: 'household_size',       label: 'Household Size', type: 'number' },
  { key: 'number_of_children',   label: 'Number of Children', type: 'number' },
  { key: 'benefit_amount',       label: 'Benefit Amount', type: 'number' },
  { key: 'maximum_benefit',      label: 'Maximum Benefit', type: 'number' },
  { key: 'income_deduction',     label: 'Income Deduction', type: 'number' },
  { key: 'work_participation_status', label: 'Work Participation Status', type: 'select', options: ['compliant','non_compliant','exempt','pending'] },
  { key: 'months_on_tanf_federal', label: 'Months on TANF (Federal)', type: 'number' },
  { key: 'months_on_tanf_state', label: 'Months on TANF (State)', type: 'number' },
  { key: 'time_limit_federal_exhausted', label: 'Federal Limit Exhausted', type: 'select', options: ['true','false'] },
  { key: 'time_limit_state_exhausted', label: 'State Limit Exhausted', type: 'select', options: ['true','false'] },
  { key: 'sanction_level',       label: 'Sanction Level', type: 'select', options: ['none','first','second','third','full_family'] },
  { key: 'sanction_reason',      label: 'Sanction Reason', type: 'textarea' },
  { key: 'irp_status',           label: 'IRP Status', type: 'select', options: ['not_required','pending','active','expired'] },
  { key: 'domestic_violence_flag', label: 'DV Flag', type: 'select', options: ['true','false'] },
  { key: 'immigration_status',   label: 'Immigration Status' },
  { key: 'state',                label: 'State' },
  { key: 'status',               label: 'Status', type: 'select', options: ['pending','active','sanctioned','closed','archived'] },
  { key: 'notes',                label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',           label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'calculate-tanf-benefit', label: 'Calculate TANF Benefit', inputs: [] },
  { verb: 'classify-work-participation-rate', label: 'Classify Work Participation Rate', inputs: [] },
  { verb: 'detect-time-limit-exhaustion', label: 'Detect Time Limit Exhaustion', inputs: [] },
  { verb: 'predict-sanction-risk', label: 'Predict Sanction Risk', inputs: [] },
  { verb: 'suggest-good-cause-exception', label: 'Suggest Good Cause Exception', inputs: [] },
  { verb: 'generate-tanf-narrative', label: 'Generate TANF Narrative', inputs: [] },
  { verb: 'summarize-tanf-history', label: 'Summarize TANF History', inputs: [] },
  { verb: 'score-work-activity-engagement', label: 'Score Work Activity Engagement', inputs: [] },
  { verb: 'validate-irp', label: 'Validate IRP', inputs: [] },
  { verb: 'recommend-conciliation', label: 'Recommend Conciliation', inputs: [] },
  { verb: 'classify-sanction-tier', label: 'Classify Sanction Tier', inputs: [] },
  { verb: 'predict-recidivism', label: 'Predict Recidivism', inputs: [] },
  { verb: 'detect-domestic-violence-exception', label: 'Detect DV Exception', inputs: [] },
  { verb: 'generate-sanction-notice', label: 'Generate Sanction Notice', inputs: [] },
  { verb: 'suggest-supportive-services', label: 'Suggest Supportive Services', inputs: [] },
  { verb: 'score-self-sufficiency-plan', label: 'Score Self-Sufficiency Plan', inputs: [] },
];

export default function TanfCalcPage() {
  return (
    <BenefitPage
      title="TANF Calculator"
      subtitle="Temporary Assistance for Needy Families benefit calculations and sanction tracking."
      api={tanfCalcApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="tanf-calc"
    />
  );
}
