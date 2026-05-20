import React, { useEffect, useState, useCallback } from 'react';
import { getUnreadNotifications, markAllNotificationsRead, markNotificationRead, getNotifications } from '../services/api';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await getUnreadNotifications();
      setCount(r?.count || 0);
    } catch (_) { /* swallow; bell is non-essential */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const openPanel = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await getNotifications();
      setRows(Array.isArray(r) ? r : []);
    } catch (_) { setRows([]); }
    finally { setLoading(false); }
  };

  const closePanel = () => setOpen(false);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      refresh();
      const r = await getNotifications();
      setRows(Array.isArray(r) ? r : []);
    } catch (_) {}
  };
  const handleMarkOne = async (id) => {
    try {
      await markNotificationRead(id);
      refresh();
      const r = await getNotifications();
      setRows(Array.isArray(r) ? r : []);
    } catch (_) {}
  };

  return (
    <>
      <button
        className="btn secondary"
        onClick={openPanel}
        style={{ position: 'relative', padding: '6px 12px' }}
        title="Notifications"
      >
        Notifications
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#dc2626', color: '#fff',
            borderRadius: 10, fontSize: 11, padding: '1px 6px',
            fontWeight: 700,
          }}>{count}</span>
        )}
      </button>

      {open && (
        <div className="modal-overlay" onClick={closePanel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Notifications</h3>
              <button className="modal-close" onClick={closePanel}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
              {loading && <div className="empty-state">Loading...</div>}
              {!loading && rows.length === 0 && <div className="empty-state">No notifications.</div>}
              {rows.map((n) => (
                <div key={n.id} style={{
                  padding: '10px 0', borderBottom: '1px solid #1e293b',
                  opacity: n.read_at ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: '#f1f5f9' }}>{n.title}</strong>
                    <span className={`badge ${String(n.severity || '').toLowerCase()}`}>{n.severity}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display:'flex', justifyContent:'space-between' }}>
                    <span>{n.source} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
                    {!n.read_at && (
                      <a href="#" onClick={(e) => { e.preventDefault(); handleMarkOne(n.id); }}>mark read</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={handleMarkAll}>Mark all read</button>
              <button className="btn" onClick={closePanel}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
