import React from 'react';
import CrudPage from '../components/CrudPage';
import { partnerOrgsApi } from '../services/api';

export default function PartnerOrgsPage() {
  return (
    <CrudPage
      title="Partner Orgs"
      subtitle="Referral and resettlement partner organizations (UNHCR, IRC, HIAS, KIND, CLINIC, etc.)."
      api={partnerOrgsApi}
      statusKey="status"
      fields={[
        { key: 'org_id',   label: 'Org ID' },
        { key: 'name',     label: 'Name' },
        { key: 'country',  label: 'Country' },
        { key: 'services', label: 'Services' },
        { key: 'contact',  label: 'Contact' },
        { key: 'status',   label: 'Status', type: 'select', options: ['active','inactive','prospect'] },
        { key: 'notes',    label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
