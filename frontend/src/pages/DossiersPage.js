import React from 'react';
import CrudPage from '../components/CrudPage';
import { dossiersApi } from '../services/api';

export default function DossiersPage() {
  return (
    <CrudPage
      title="Dossiers"
      subtitle="Case dossiers assembled for filing or hearing submission."
      api={dossiersApi}
      statusKey="status"
      fields={[
        { key: 'dossier_id',   label: 'Dossier ID' },
        { key: 'case_id',      label: 'Case ID' },
        { key: 'version',      label: 'Version' },
        { key: 'doc_count',    label: 'Doc Count',    type: 'number' },
        { key: 'last_updated', label: 'Last Updated', type: 'date' },
        { key: 'status',       label: 'Status',       type: 'select', options: ['draft','in_review','final','submitted','archived'] },
        { key: 'notes',        label: 'Notes',        type: 'textarea' },
      ]}
    />
  );
}
