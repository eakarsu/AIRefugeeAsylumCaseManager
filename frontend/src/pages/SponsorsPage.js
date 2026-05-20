import React from 'react';
import CrudPage from '../components/CrudPage';
import { sponsorsApi } from '../services/api';

export default function SponsorsPage() {
  return (
    <CrudPage
      title="Sponsors"
      subtitle="Welcome Corps, family, congregational and NGO sponsors of clients."
      api={sponsorsApi}
      statusKey="status"
      fields={[
        { key: 'sponsor_id',     label: 'Sponsor ID' },
        { key: 'client_id',      label: 'Client ID' },
        { key: 'name',           label: 'Name / Org' },
        { key: 'location',       label: 'Location' },
        { key: 'sponsor_status', label: 'Sponsor Type' },
        { key: 'status',         label: 'Status', type: 'select', options: ['pending','active','inactive','withdrawn'] },
        { key: 'notes',          label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
