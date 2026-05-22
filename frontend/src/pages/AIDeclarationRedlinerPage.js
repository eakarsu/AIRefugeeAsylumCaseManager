import React from 'react';
import AIPage from '../components/AIPage';
import { aiDeclarationRedliner } from '../services/api';

export default function AIDeclarationRedlinerPage() {
  return (
    <AIPage
      title="AI · Declaration Redliner"
      feature="declaration-redliner"
      subtitle="Iterative declaration drafter. Produces a redlined revision with [ADD]/[DEL] markers and optional trauma-informed pacing."
      inputs={[
        { key: 'prior_draft',     label: 'Prior Draft',     type: 'textarea',
          placeholder: 'Paste current declaration draft (any version).' },
        { key: 'revision_goals',  label: 'Revision Goals',  type: 'textarea',
          placeholder: 'Numbered revision goals (e.g. "1) add dates, 2) clarify nexus, 3) soften graphic content").' },
        { key: 'trauma_pacing',   label: 'Trauma Pacing',   type: 'select',
          options: ['true', 'false'], defaultValue: 'true' },
      ]}
      run={(v) => aiDeclarationRedliner({
        prior_draft: v.prior_draft,
        revision_goals: v.revision_goals,
        trauma_pacing: v.trauma_pacing,
      })}
    />
  );
}
