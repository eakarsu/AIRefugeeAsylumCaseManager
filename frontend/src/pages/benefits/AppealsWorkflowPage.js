import React from 'react';
import BenefitPage from '../../components/BenefitPage';
import { appealsWorkflowApi } from '../../services/api';

const FIELDS = [
  { key: 'case_id',                   label: 'Case ID' },
  { key: 'applicant_id',              label: 'Applicant ID' },
  { key: 'appeal_type',               label: 'Appeal Type', type: 'select', options: ['fair_hearing','administrative_review','federal_review','state_court','federal_court'] },
  { key: 'program',                   label: 'Program', type: 'select', options: ['Medicaid','SNAP','TANF','SSI','SSDI','multiple'] },
  { key: 'appeal_issue',              label: 'Appeal Issue', type: 'textarea' },
  { key: 'original_action',           label: 'Original Action', type: 'select', options: ['denial','termination','reduction','delay','other'] },
  { key: 'appeal_filed_date',         label: 'Appeal Filed Date', type: 'date' },
  { key: 'hearing_date',              label: 'Hearing Date', type: 'date' },
  { key: 'hearing_scheduled_date',    label: 'Hearing Scheduled Date', type: 'date' },
  { key: 'hearing_location',          label: 'Hearing Location' },
  { key: 'alj_name',                  label: 'ALJ Name' },
  { key: 'appellant_representative',  label: 'Appellant Representative' },
  { key: 'aid_pending_requested',     label: 'Aid Pending Requested', type: 'select', options: ['true','false'] },
  { key: 'aid_pending_granted',       label: 'Aid Pending Granted', type: 'select', options: ['true','false'] },
  { key: 'mediation_offered',         label: 'Mediation Offered', type: 'select', options: ['true','false'] },
  { key: 'mediation_accepted',        label: 'Mediation Accepted', type: 'select', options: ['true','false'] },
  { key: 'evidence_submitted',        label: 'Evidence Submitted', type: 'textarea' },
  { key: 'decision',                  label: 'Decision', type: 'select', options: ['pending','sustained','reversed','partially_reversed','withdrawn','dismissed'] },
  { key: 'decision_date',             label: 'Decision Date', type: 'date' },
  { key: 'decision_summary',          label: 'Decision Summary', type: 'textarea' },
  { key: 'post_hearing_action',       label: 'Post-Hearing Action', type: 'textarea' },
  { key: 'status',                    label: 'Status', type: 'select', options: ['pending','scheduled','in_hearing','decided','closed','archived'] },
  { key: 'notes',                     label: 'Notes', type: 'textarea' },
  { key: 'ai_summary',                label: 'AI Summary', type: 'textarea' },
];

const AI_VERBS = [
  { verb: 'classify-appeal-issue', label: 'Classify Appeal Issue', inputs: [] },
  { verb: 'predict-hearing-outcome', label: 'Predict Hearing Outcome', inputs: [] },
  { verb: 'suggest-evidence-needed', label: 'Suggest Evidence Needed', inputs: [] },
  { verb: 'generate-hearing-summary', label: 'Generate Hearing Summary', inputs: [] },
  { verb: 'summarize-appeals-history', label: 'Summarize Appeals History', inputs: [] },
  { verb: 'score-case-strength', label: 'Score Case Strength', inputs: [] },
  { verb: 'validate-timely-filing', label: 'Validate Timely Filing', inputs: [] },
  { verb: 'recommend-mediation', label: 'Recommend Mediation', inputs: [] },
  { verb: 'classify-procedural-vs-substantive', label: 'Procedural vs Substantive', inputs: [] },
  { verb: 'predict-continuance-need', label: 'Predict Continuance Need', inputs: [] },
  { verb: 'detect-jurisdictional-issue', label: 'Detect Jurisdictional Issue', inputs: [] },
  { verb: 'generate-decision-narrative', label: 'Generate Decision Narrative', inputs: [] },
  { verb: 'suggest-precedent-citation', label: 'Suggest Precedent Citation', inputs: [] },
  { verb: 'score-alj-likely-rationale', label: "Score ALJ's Likely Rationale", inputs: [] },
  { verb: 'recommend-witness-list', label: 'Recommend Witness List', inputs: [] },
  { verb: 'generate-post-hearing-brief', label: 'Generate Post-Hearing Brief', inputs: [] },
];

export default function AppealsWorkflowPage() {
  return (
    <BenefitPage
      title="Appeals Workflow"
      subtitle="Manage fair hearing and administrative appeal processes across benefit programs."
      api={appealsWorkflowApi}
      fields={FIELDS}
      statusKey="status"
      aiVerbs={AI_VERBS}
      featureKey="appeals-workflow"
    />
  );
}
