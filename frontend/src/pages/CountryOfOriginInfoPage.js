import React from 'react';
import CrudPage from '../components/CrudPage';
import { countryOfOriginInfoApi } from '../services/api';

export default function CountryOfOriginInfoPage() {
  return (
    <CrudPage
      title="Country of Origin Info"
      subtitle="Curated COI sources (UNHCR, US State Dept, EUAA, HRW, Amnesty)."
      api={countryOfOriginInfoApi}
      fields={[
        { key: 'coi_id',         label: 'COI ID' },
        { key: 'country',        label: 'Country' },
        { key: 'period',         label: 'Period' },
        { key: 'source',         label: 'Source' },
        { key: 'retrieved_at',   label: 'Retrieved',     type: 'date' },
        { key: 'citation_count', label: 'Citations',     type: 'number' },
        { key: 'notes',          label: 'Notes',         type: 'textarea' },
      ]}
    />
  );
}
