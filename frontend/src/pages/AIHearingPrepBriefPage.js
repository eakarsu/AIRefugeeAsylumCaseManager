import React from 'react';
import AIPage from '../components/AIPage';
import { aiHearingPrepBrief } from '../services/api';

export default function AIHearingPrepBriefPage() {
  return (
    <AIPage
      title="AI · Hearing Prep Brief"
      feature="hearing-prep-brief"
      subtitle="Build direct exam outline, anticipated cross themes, and exhibit checklist for an upcoming hearing."
      inputs={[
        { key: 'case_summary', label: 'Case Summary', type: 'textarea', placeholder: 'Client / claim / posture overview.' },
        { key: 'court',        label: 'Court / Forum' },
        { key: 'judge',        label: 'Judge / Officer' },
        { key: 'date',         label: 'Hearing Date',  type: 'date' },
      ]}
      run={(v) => aiHearingPrepBrief({ case_summary: v.case_summary, hearing: { court: v.court, judge: v.judge, date: v.date } })}
    />
  );
}
