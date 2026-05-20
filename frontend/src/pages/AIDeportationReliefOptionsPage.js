import React from 'react';
import AIPage from '../components/AIPage';
import { aiDeportationReliefOptions } from '../services/api';

export default function AIDeportationReliefOptionsPage() {
  return (
    <AIPage
      title="AI · Deportation Relief Options"
      feature="deportation-relief-options"
      subtitle="Identify potentially available relief options against removal — for attorney review only."
      inputs={[
        { key: 'client_facts',   label: 'Client Facts',           type: 'textarea' },
        { key: 'current_status', label: 'Current Immigration Status', type: 'text' },
        { key: 'notes',          label: 'Notes',                  type: 'textarea' },
      ]}
      run={(v) => aiDeportationReliefOptions({ client_facts: v.client_facts, current_status: v.current_status, context: { notes: v.notes } })}
    />
  );
}
