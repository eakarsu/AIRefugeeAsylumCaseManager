import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { noticeGenerationApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',              label: 'Case ID' },
  { key: 'applicant_id',         label: 'Applicant ID' },
  { key: 'notice_type',          label: 'Notice Type', type: 'select', options: ['eligibility_determination','denial','termination','overissuance','suspension','other'] },
  { key: 'program',              label: 'Program', type: 'select', options: ['Medicaid','SNAP','TANF','SSI','SSDI','multiple'] },
  { key: 'determination',        label: 'Determination', type: 'select', options: ['approved','denied','terminated','pended'] },
  { key: 'effective_date',       label: 'Effective Date', type: 'date' },
  { key: 'denial_reasons',       label: 'Denial Reasons', type: 'textarea' },
  { key: 'appeal_deadline',      label: 'Appeal Deadline (days)', type: 'number' },
  { key: 'appeal_deadline_date', label: 'Appeal Deadline Date', type: 'date' },
  { key: 'hearing_rights',       label: 'Hearing Rights', type: 'textarea' },
  { key: 'notice_text',          label: 'Notice Text', type: 'textarea' },
  { key: 'language',             label: 'Language' },
  { key: 'translation_required', label: 'Translation Required', type: 'select', options: ['true','false'] },
  { key: 'sent_date',            label: 'Sent Date', type: 'date' },
  { key: 'delivery_method',      label: 'Delivery Method', type: 'select', options: ['mail','email','in_person','portal'] },
  { key: 'procedural_defects',   label: 'Procedural Defects', type: 'textarea' },
  { key: 'status',               label: 'Status', type: 'select', options: ['draft','sent','delivered','appealed','archived'] },
  { key: 'notes',                label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',           label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-notice-type', label: 'Classify Notice Type', inputs: [] },
  { verb: 'draft-eligibility-determination-notice', label: 'Draft Eligibility Notice', inputs: [] },
  { verb: 'draft-denial-notice', label: 'Draft Denial Notice', inputs: [] },
  { verb: 'draft-termination-notice', label: 'Draft Termination Notice', inputs: [] },
  { verb: 'draft-overissuance-notice', label: 'Draft Overissuance Notice', inputs: [] },
  { verb: 'classify-good-cause', label: 'Classify Good Cause', inputs: [] },
  { verb: 'generate-due-process-language', label: 'Generate Due Process Language', inputs: [] },
  { verb: 'validate-notice-completeness', label: 'Validate Notice Completeness', inputs: [] },
  { verb: 'suggest-citation', label: 'Suggest Regulation Citation', inputs: [] },
  { verb: 'classify-action-level-impact', label: 'Classify Action Level Impact', inputs: [] },
  { verb: 'predict-appeal-likelihood', label: 'Predict Appeal Likelihood', inputs: [] },
  { verb: 'summarize-notice-history', label: 'Summarize Notice History', inputs: [] },
  { verb: 'score-notice-clarity', label: 'Score Notice Clarity', inputs: [] },
  { verb: 'recommend-translation-language', label: 'Recommend Translation Language', inputs: [] },
  { verb: 'detect-procedural-defect', label: 'Detect Procedural Defect', inputs: [] },
  { verb: 'generate-plain-language-version', label: 'Generate Plain Language Version', inputs: [] },
];

export default function NoticeGenerationPage() {
  return (
    <BenefitPage
      title="Notice Generation"
      subtitle="Draft and manage regulatory notices for benefit determinations."
      api={noticeGenerationApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="notice-generation"
    />
  );
}
