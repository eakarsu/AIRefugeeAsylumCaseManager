import React from 'react';
import CrudPage from '../components/CrudPage';
import { auditLogApi } from '../services/api';

export default function AuditLogPage() {
  return (
    <CrudPage
      title="Audit Log"
      subtitle="Append-only governance log of clinic actions."
      api={auditLogApi}
      statusKey="result"
      fields={[
        { key: 'entry_id', label: 'Entry ID' },
        { key: 'actor',    label: 'Actor' },
        { key: 'target',   label: 'Target' },
        { key: 'action',   label: 'Action' },
        { key: 'result',   label: 'Result', type: 'select', options: ['success','denied','error'] },
        { key: 'ts',       label: 'Timestamp', type: 'datetime-local' },
        { key: 'notes',    label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
