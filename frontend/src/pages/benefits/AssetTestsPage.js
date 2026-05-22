import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { assetTestsApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',                        label: 'Case ID' },
  { key: 'applicant_id',                   label: 'Applicant ID' },
  { key: 'program',                        label: 'Program', type: 'select', options: ['Medicaid','SNAP','SSI','TANF','multiple'] },
  { key: 'total_countable_assets',         label: 'Total Countable Assets', type: 'number' },
  { key: 'asset_limit',                    label: 'Asset Limit', type: 'number' },
  { key: 'vehicle_equity',                 label: 'Vehicle Equity', type: 'number' },
  { key: 'home_equity',                    label: 'Home Equity', type: 'number' },
  { key: 'bank_accounts',                  label: 'Bank Accounts', type: 'number' },
  { key: 'life_insurance_csv',             label: 'Life Insurance CSV', type: 'number' },
  { key: 'burial_fund',                    label: 'Burial Fund', type: 'number' },
  { key: 'retirement_accounts',            label: 'Retirement Accounts', type: 'number' },
  { key: 'trust_assets',                   label: 'Trust Assets', type: 'number' },
  { key: 'business_property',              label: 'Business Property', type: 'number' },
  { key: 'transferred_assets_last_60_months', label: 'Transferred Assets (60mo)', type: 'number' },
  { key: 'look_back_penalty_months',       label: 'Look-Back Penalty Months', type: 'number' },
  { key: 'able_account_balance',           label: 'ABLE Account Balance', type: 'number' },
  { key: 'passes_asset_test',              label: 'Passes Asset Test', type: 'select', options: ['true','false','pending'] },
  { key: 'status',                         label: 'Status', type: 'select', options: ['pending','passed','failed','archived'] },
  { key: 'notes',                          label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',                     label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-countable-vs-exempt', label: 'Classify Countable vs Exempt', inputs: [] },
  { verb: 'calculate-vehicle-equity', label: 'Calculate Vehicle Equity', inputs: [] },
  { verb: 'detect-resource-transfer', label: 'Detect Resource Transfer', inputs: [] },
  { verb: 'predict-asset-test-failure', label: 'Predict Asset Test Failure', inputs: [] },
  { verb: 'suggest-spend-down-strategy', label: 'Suggest Spend-Down Strategy', inputs: [] },
  { verb: 'generate-asset-narrative', label: 'Generate Asset Narrative', inputs: [] },
  { verb: 'summarize-asset-changes', label: 'Summarize Asset Changes', inputs: [] },
  { verb: 'validate-trust-exclusion', label: 'Validate Trust Exclusion', inputs: [] },
  { verb: 'recommend-able-account', label: 'Recommend ABLE Account', inputs: [] },
  { verb: 'classify-burial-fund-status', label: 'Classify Burial Fund Status', inputs: [] },
  { verb: 'predict-look-back-period-issue', label: 'Predict Look-Back Issue', inputs: [] },
  { verb: 'detect-life-insurance-cash-value', label: 'Detect Life Insurance CSV', inputs: [] },
  { verb: 'generate-resource-letter', label: 'Generate Resource Letter', inputs: [] },
  { verb: 'score-asset-documentation', label: 'Score Asset Documentation', inputs: [] },
  { verb: 'suggest-asset-conversion', label: 'Suggest Asset Conversion', inputs: [] },
  { verb: 'validate-business-property-exclusion', label: 'Validate Business Property Exclusion', inputs: [] },
];

export default function AssetTestsPage() {
  return (
    <BenefitPage
      title="Asset Tests"
      subtitle="Resource and asset test determinations for means-tested benefit programs."
      api={assetTestsApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="asset-tests"
    />
  );
}
