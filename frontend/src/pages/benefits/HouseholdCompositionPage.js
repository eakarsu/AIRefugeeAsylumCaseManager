import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { householdCompositionApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',                    label: 'Case ID' },
  { key: 'primary_applicant_id',       label: 'Primary Applicant ID' },
  { key: 'household_members',          label: 'Household Members', type: 'textarea' },
  { key: 'household_size',             label: 'Household Size', type: 'number' },
  { key: 'snap_unit_size',             label: 'SNAP Unit Size', type: 'number' },
  { key: 'medicaid_unit_size',         label: 'Medicaid Unit Size', type: 'number' },
  { key: 'tanf_unit_size',             label: 'TANF Unit Size', type: 'number' },
  { key: 'shared_living_arrangement',  label: 'Shared Living Arrangement', type: 'select', options: ['true','false'] },
  { key: 'tax_filer_status',           label: 'Tax Filer Status', type: 'select', options: ['filer','dependent','non_filer'] },
  { key: 'pregnancy_status',           label: 'Pregnancy Status', type: 'select', options: ['not_pregnant','pregnant','recently_pregnant'] },
  { key: 'non_citizen_members',        label: 'Non-Citizen Members', type: 'number' },
  { key: 'composition_dispute',        label: 'Composition Dispute', type: 'select', options: ['true','false'] },
  { key: 'state',                      label: 'State' },
  { key: 'status',                     label: 'Status', type: 'select', options: ['pending','confirmed','disputed','archived'] },
  { key: 'notes',                      label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',                 label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-household-membership', label: 'Classify Household Membership', inputs: [] },
  { verb: 'detect-shared-living-arrangement', label: 'Detect Shared Living Arrangement', inputs: [] },
  { verb: 'predict-household-change', label: 'Predict Household Change', inputs: [] },
  { verb: 'suggest-separate-household', label: 'Suggest Separate Household', inputs: [] },
  { verb: 'generate-composition-narrative', label: 'Generate Composition Narrative', inputs: [] },
  { verb: 'summarize-composition-history', label: 'Summarize Composition History', inputs: [] },
  { verb: 'validate-tax-dependency', label: 'Validate Tax Dependency', inputs: [] },
  { verb: 'recommend-snap-vs-medicaid-household', label: 'SNAP vs Medicaid Household', inputs: [] },
  { verb: 'classify-non-citizen-member', label: 'Classify Non-Citizen Member', inputs: [] },
  { verb: 'predict-composition-dispute', label: 'Predict Composition Dispute', inputs: [] },
  { verb: 'detect-living-with-relative', label: 'Detect Living with Relative', inputs: [] },
  { verb: 'generate-household-affidavit', label: 'Generate Household Affidavit', inputs: [] },
  { verb: 'score-composition-clarity', label: 'Score Composition Clarity', inputs: [] },
  { verb: 'suggest-evidence-of-separate-household', label: 'Suggest Separate Household Evidence', inputs: [] },
  { verb: 'validate-dependent-care', label: 'Validate Dependent Care', inputs: [] },
  { verb: 'classify-pregnancy-status', label: 'Classify Pregnancy Status', inputs: [] },
];

export default function HouseholdCompositionPage() {
  return (
    <BenefitPage
      title="Household Composition"
      subtitle="Determine and document household units for benefits programs."
      api={householdCompositionApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="household-composition"
    />
  );
}
