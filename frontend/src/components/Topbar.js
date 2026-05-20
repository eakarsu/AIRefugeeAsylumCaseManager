import React from 'react';
import NotificationBell from './NotificationBell';
import { getStoredUser } from '../services/api';

export default function Topbar() {
  const user = getStoredUser();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 18px',
      background: '#0b1424',
      borderBottom: '1px solid #1e293b',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ color: '#cbd5e1', fontSize: 13 }}>
        Logged in as <strong style={{ color: '#f1f5f9' }}>{user?.name || user?.email || 'user'}</strong>
        <span style={{ marginLeft: 8, color: '#94a3b8' }}>· role: {user?.role || 'viewer'}</span>
      </div>
      <NotificationBell />
    </div>
  );
}
