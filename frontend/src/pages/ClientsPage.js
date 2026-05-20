import React from 'react';
import CrudPage from '../components/CrudPage';
import { clientsApi } from '../services/api';

export default function ClientsPage() {
  return (
    <CrudPage
      title="Clients"
      subtitle="Refugee / asylum seekers in clinic intake or active representation."
      api={clientsApi}
      statusKey="status"
      fields={[
        { key: 'client_id',         label: 'Client ID' },
        { key: 'full_name',         label: 'Full Name' },
        { key: 'country_of_origin', label: 'Country of Origin' },
        { key: 'dob',               label: 'Date of Birth', type: 'date' },
        { key: 'intake_date',       label: 'Intake Date',   type: 'date' },
        { key: 'status',            label: 'Status',        type: 'select', options: ['intake','active','closed','withdrawn'] },
        { key: 'notes',             label: 'Notes',         type: 'textarea' },
      ]}
    />
  );
}
