import React from 'react';
import CrudPage from '../components/CrudPage';
import { deportationOrdersApi } from '../services/api';

export default function DeportationOrdersPage() {
  return (
    <CrudPage
      title="Deportation Orders"
      subtitle="Removal orders and pending appeals / motions to reopen."
      api={deportationOrdersApi}
      statusKey="status"
      fields={[
        { key: 'order_id',        label: 'Order ID' },
        { key: 'case_id',         label: 'Case ID' },
        { key: 'issued_at',       label: 'Issued At',       type: 'date' },
        { key: 'removal_country', label: 'Removal Country' },
        { key: 'status',          label: 'Status',          type: 'select', options: ['not_issued','preliminary','final','on_appeal','executed','cancelled'] },
        { key: 'appeal_status',   label: 'Appeal Status' },
        { key: 'notes',           label: 'Notes',           type: 'textarea' },
      ]}
    />
  );
}
