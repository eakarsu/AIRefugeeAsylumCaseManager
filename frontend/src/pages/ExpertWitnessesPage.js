import React from 'react';
import CrudPage from '../components/CrudPage';
import { expertWitnessesApi } from '../services/api';

export default function ExpertWitnessesPage() {
  return (
    <CrudPage
      title="Expert Witnesses"
      subtitle="Country-condition and subject-matter experts engaged for testimony or report."
      api={expertWitnessesApi}
      statusKey="status"
      fields={[
        { key: 'witness_id', label: 'Witness ID' },
        { key: 'name',       label: 'Name' },
        { key: 'expertise',  label: 'Expertise' },
        { key: 'case_id',    label: 'Case ID' },
        { key: 'fee_usd',    label: 'Fee (USD)', type: 'number' },
        { key: 'status',     label: 'Status',    type: 'select', options: ['pending','engaged','completed','declined'] },
        { key: 'notes',      label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}
