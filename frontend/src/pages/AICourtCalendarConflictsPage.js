import React from 'react';
import AIPage from '../components/AIPage';
import { aiCourtCalendarConflicts } from '../services/api';

export default function AICourtCalendarConflictsPage() {
  return (
    <AIPage
      title="AI · Court Calendar Conflicts"
      feature="court-calendar-conflicts"
      subtitle="Detect calendar conflicts, travel infeasibility, and prep overlaps across cases."
      inputs={[
        { key: 'attorney_id', label: 'Attorney ID', placeholder: 'ATT-001 or ALL' },
        { key: 'window',      label: 'Window',      placeholder: '2026-05-15 to 2026-06-30' },
        { key: 'notes',       label: 'Notes',       type: 'textarea' },
      ]}
      run={(v) => aiCourtCalendarConflicts({ attorney_id: v.attorney_id, window: v.window })}
    />
  );
}
