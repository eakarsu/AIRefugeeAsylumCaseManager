import React from 'react';
import CrudPage from '../components/CrudPage';
import { paralegalsApi } from '../services/api';

export default function ParalegalsPage() {
  return (
    <CrudPage
      title="Paralegals"
      subtitle="Paralegals attached to lead attorneys."
      api={paralegalsApi}
      statusKey="status"
      fields={[
        { key: 'paralegal_id', label: 'Paralegal ID' },
        { key: 'name',         label: 'Name' },
        { key: 'attorney_id',  label: 'Attorney ID' },
        { key: 'base',         label: 'Base / City' },
        { key: 'case_count',   label: 'Case Count', type: 'number' },
        { key: 'status',       label: 'Status',     type: 'select', options: ['active','on_leave','inactive'] },
        { key: 'notes',        label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
