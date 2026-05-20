import React from 'react';
import CrudPage from '../components/CrudPage';
import { attorneysApi } from '../services/api';

export default function AttorneysPage() {
  return (
    <CrudPage
      title="Attorneys"
      subtitle="Staff and pro bono attorneys with bar admission and specialty."
      api={attorneysApi}
      statusKey="status"
      fields={[
        { key: 'attorney_id', label: 'Attorney ID' },
        { key: 'name',        label: 'Name' },
        { key: 'bar_state',   label: 'Bar State' },
        { key: 'specialty',   label: 'Specialty' },
        { key: 'case_count',  label: 'Case Count', type: 'number' },
        { key: 'status',      label: 'Status',     type: 'select', options: ['active','on_leave','inactive'] },
        { key: 'notes',       label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
