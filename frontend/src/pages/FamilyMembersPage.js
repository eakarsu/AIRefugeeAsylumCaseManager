import React from 'react';
import CrudPage from '../components/CrudPage';
import { familyMembersApi } from '../services/api';

export default function FamilyMembersPage() {
  return (
    <CrudPage
      title="Family Members"
      subtitle="Family relationships used for I-730 follow-to-join and family reunification."
      api={familyMembersApi}
      statusKey="status"
      fields={[
        { key: 'member_id',    label: 'Member ID' },
        { key: 'client_id',    label: 'Client ID' },
        { key: 'name',         label: 'Name' },
        { key: 'relationship', label: 'Relationship' },
        { key: 'location',     label: 'Current Location' },
        { key: 'status',       label: 'Status', type: 'select', options: ['separated','reunited','deceased','unknown'] },
        { key: 'notes',        label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}
