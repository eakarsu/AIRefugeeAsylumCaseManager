import React from 'react';
import AIPage from '../components/AIPage';
import { aiPartnerOrgReferral } from '../services/api';

export default function AIPartnerOrgReferralPage() {
  return (
    <AIPage
      title="AI · Partner Org Referral"
      feature="partner-org-referral"
      subtitle="Recommend partner orgs for non-legal services (housing, mental health, language, community)."
      inputs={[
        { key: 'client_country', label: 'Client Country' },
        { key: 'client_need',    label: 'Client Need',  type: 'textarea' },
        { key: 'notes',          label: 'Notes',        type: 'textarea' },
      ]}
      run={(v) => aiPartnerOrgReferral({ client_country: v.client_country, client_need: v.client_need, notes: v.notes })}
    />
  );
}
