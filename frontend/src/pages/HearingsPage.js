import React from 'react';
import CrudPage from '../components/CrudPage';
import { hearingsApi } from '../services/api';

export default function HearingsPage() {
  return (
    <CrudPage
      title="Hearings"
      subtitle="Scheduled Master Calendar, Individual Hearings, asylum office interviews, BIA oral arguments."
      api={hearingsApi}
      statusKey="status"
      fields={[
        { key: 'hearing_id', label: 'Hearing ID' },
        { key: 'case_id',    label: 'Case ID' },
        { key: 'court',      label: 'Court / Forum' },
        { key: 'date',       label: 'Date',   type: 'datetime-local' },
        { key: 'judge',      label: 'Judge / Officer' },
        { key: 'status',     label: 'Status', type: 'select', options: ['scheduled','held','continued','cancelled'] },
        { key: 'notes',      label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
