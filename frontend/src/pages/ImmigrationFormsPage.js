import React from 'react';
import CrudPage from '../components/CrudPage';
import { immigrationFormsApi } from '../services/api';

export default function ImmigrationFormsPage() {
  return (
    <CrudPage
      title="Immigration Forms"
      subtitle="I-589, I-730, I-360, I-765, EOIR-26, I-821 and related forms."
      api={immigrationFormsApi}
      statusKey="status"
      fields={[
        { key: 'form_id',   label: 'Form ID' },
        { key: 'case_id',   label: 'Case ID' },
        { key: 'form_type', label: 'Form Type', type: 'select', options: ['I-589','I-730','I-360','I-765','EOIR-26','I-821','I-134A','I-601','I-589A','other'] },
        { key: 'version',   label: 'Version' },
        { key: 'filed_at',  label: 'Filed',     type: 'date' },
        { key: 'status',    label: 'Status',    type: 'select', options: ['draft','pending','filed','approved','denied','withdrawn'] },
        { key: 'notes',     label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
