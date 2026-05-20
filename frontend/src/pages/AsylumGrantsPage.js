import React from 'react';
import CrudPage from '../components/CrudPage';
import { asylumGrantsApi } from '../services/api';

export default function AsylumGrantsPage() {
  return (
    <CrudPage
      title="Asylum Grants"
      subtitle="Outcomes of asylum, withholding, CAT, SIV and TPS adjudications."
      api={asylumGrantsApi}
      statusKey="status"
      fields={[
        { key: 'grant_id',   label: 'Grant ID' },
        { key: 'case_id',    label: 'Case ID' },
        { key: 'status',     label: 'Status',     type: 'select', options: ['pending','granted','denied','referred','withdrawn'] },
        { key: 'granted_at', label: 'Granted At', type: 'date' },
        { key: 'court',      label: 'Court / Office' },
        { key: 'basis',      label: 'Basis' },
        { key: 'notes',      label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
