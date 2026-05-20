import React from 'react';
import CrudPage from '../components/CrudPage';
import { courtCalendarsApi } from '../services/api';

export default function CourtCalendarsPage() {
  return (
    <CrudPage
      title="Court Calendars"
      subtitle="Court / asylum office docket days clinic is tracking."
      api={courtCalendarsApi}
      statusKey="status"
      fields={[
        { key: 'calendar_id', label: 'Calendar ID' },
        { key: 'court',       label: 'Court' },
        { key: 'date',        label: 'Date',       type: 'date' },
        { key: 'case_count',  label: 'Case Count', type: 'number' },
        { key: 'status',      label: 'Status',     type: 'select', options: ['open','closed','cancelled'] },
        { key: 'judge',       label: 'Judge / Officer' },
        { key: 'notes',       label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}
