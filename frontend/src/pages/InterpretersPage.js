import React from 'react';
import CrudPage from '../components/CrudPage';
import { interpretersApi } from '../services/api';

export default function InterpretersPage() {
  return (
    <CrudPage
      title="Interpreters"
      subtitle="NAJIT / ATA / community-certified interpreters by language."
      api={interpretersApi}
      statusKey="status"
      fields={[
        { key: 'interpreter_id', label: 'Interpreter ID' },
        { key: 'name',           label: 'Name' },
        { key: 'languages',      label: 'Languages' },
        { key: 'certifications', label: 'Certifications' },
        { key: 'base',           label: 'Base / City' },
        { key: 'status',         label: 'Status', type: 'select', options: ['available','engaged','on_leave','inactive'] },
        { key: 'notes',          label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
