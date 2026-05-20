import React from 'react';
import CrudPage from '../components/CrudPage';
import { evidenceDocsApi } from '../services/api';

export default function EvidenceDocsPage() {
  return (
    <CrudPage
      title="Evidence Docs"
      subtitle="Police reports, medical records, expert reports, photographs and other supporting evidence."
      api={evidenceDocsApi}
      statusKey="status"
      fields={[
        { key: 'doc_id',      label: 'Doc ID' },
        { key: 'case_id',     label: 'Case ID' },
        { key: 'type',        label: 'Type',   type: 'select', options: ['police_report','medical_record','witness_affidavit','expert_country_report','photographs','identity_documents','NGO_letter','employment_letter','social_media','translation','other'] },
        { key: 'source',      label: 'Source' },
        { key: 'uploaded_at', label: 'Uploaded', type: 'date' },
        { key: 'status',      label: 'Status',   type: 'select', options: ['pending_review','verified','contested','rejected'] },
        { key: 'notes',       label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}
