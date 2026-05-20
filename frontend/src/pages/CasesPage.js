import React from 'react';
import CrudPage from '../components/CrudPage';
import { casesApi } from '../services/api';

export default function CasesPage() {
  return (
    <CrudPage
      title="Cases"
      subtitle="Asylum, withholding, CAT, TPS, SIV and related legal matters."
      api={casesApi}
      statusKey="status"
      fields={[
        { key: 'case_id',       label: 'Case ID' },
        { key: 'client_id',     label: 'Client ID' },
        { key: 'type',          label: 'Type',     type: 'select', options: ['asylum_affirmative','asylum_defensive','withholding_removal','cat_protection','TPS_application','SIV_application','U_visa','T_visa','VAWA','other'] },
        { key: 'lead_attorney', label: 'Lead Attorney' },
        { key: 'opened_at',     label: 'Opened',   type: 'date' },
        { key: 'status',        label: 'Status',   type: 'select', options: ['intake','open','briefing','in_hearing','appeal_pending','closed','withdrawn'] },
        { key: 'notes',         label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}
