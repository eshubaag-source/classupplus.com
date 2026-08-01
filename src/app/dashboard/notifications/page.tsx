'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotifLog {
  _id: string;
  studentId?: { _id: string; name: string; rollNumber: string; grade: string; section: string } | null;
  recipient: string;
  type: 'SMS' | 'WhatsApp' | 'Both';
  category: 'Attendance' | 'Fee' | 'VehicleFee' | 'Custom' | 'ClassPaper';
  message: string;
  status: 'Sent' | 'Simulated' | 'Failed';
  error?: string;
  createdAt: string;
}

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  grade: string;
  section: string;
  parentContact?: string;
}

const categoryColors: Record<string, { bg: string; color: string; icon: string }> = {
  Attendance: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', icon: '📅' },
  Fee: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: '💰' },
  VehicleFee: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: '🚍' },
  Custom: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899', icon: '✍️' },
  ClassPaper: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: '📝' },
};
const statusColors: Record<string, { bg: string; color: string }> = {
  Sent: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  Simulated: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  Failed: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};
const typeIcons: Record<string, string> = { SMS: '📱', WhatsApp: '🟢', Both: '📱🟢' };

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  // Custom notification modal
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    type: 'Both' as 'SMS' | 'WhatsApp' | 'Both',
    category: 'Custom' as 'Attendance' | 'Fee' | 'VehicleFee' | 'Custom' | 'ClassPaper',
    message: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetch('/api/students')
      .then(r => r.ok ? r.json() : [])
      .then(d => setStudents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchLogs]);

  const selectedStudent = students.find(s => s._id === form.studentId);

  // Auto-generate message when modal opens, student changes, or category changes
  useEffect(() => {
    if (!showModal) return;

    const studentNameText = selectedStudent ? selectedStudent.name : '[Student Name]';
    let defaultMsg = '';

    switch (form.category) {
      case 'Attendance':
        defaultMsg = `Dear Parent, this is to inform you that your child ${studentNameText} is marked absent today.`;
        break;
      case 'Fee':
        defaultMsg = `Dear Parent, this is a reminder regarding the pending fee for your child ${studentNameText}. Please do the needful.`;
        break;
      case 'VehicleFee':
        defaultMsg = `Dear Parent, this is a reminder regarding the pending vehicle fee for your child ${studentNameText}. Please do the needful.`;
        break;
      case 'ClassPaper':
        defaultMsg = `Dear Parent, please note that class papers have been distributed to your child ${studentNameText}. Please check with your child.`;
        break;
      case 'Custom':
      default:
        defaultMsg = `Dear Parent, this is a message regarding your child ${studentNameText}. \n\n`;
        break;
    }

    // Only overwrite if empty or matches a previous template
    if (!form.message || form.message.includes('[Student Name]') || form.message.includes('Dear Parent')) {
      setForm(prev => ({ ...prev, message: defaultMsg }));
    }
  }, [showModal, form.category, form.studentId, selectedStudent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.message.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, message: 'Message queued successfully!' });
        setForm({ studentId: '', type: 'Both', category: 'Custom', message: '' });
        fetchLogs();
      } else {
        setSendResult({ success: false, message: data.message || 'Failed to send.' });
      }
    } catch (err: any) {
      setSendResult({ success: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const name = log.studentId?.name?.toLowerCase() || '';
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || log.recipient.includes(searchTerm) || log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || log.status === filterStatus;
    const matchCategory = !filterCategory || log.category === filterCategory;
    const matchType = !filterType || log.type === filterType;
    return matchSearch && matchStatus && matchCategory && matchType;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'Sent').length,
    simulated: logs.filter(l => l.status === 'Simulated').length,
    failed: logs.filter(l => l.status === 'Failed').length,
  };

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-row { animation: fadeInUp 0.3s ease both; }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-box {
          background: var(--glass-bg); backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border); border-radius: 20px;
          padding: 32px; max-width: 560px; width: 100%;
          animation: slideIn 0.25s ease;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p style={{ color: 'var(--text-muted)' }}>SMS &amp; WhatsApp message history for parents.</p>
        </div>
        <div className="page-header-actions">
        <button
          id="send-custom-notification-btn"
          onClick={() => { setShowModal(true); setSendResult(null); }}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', border: 'none', padding: '12px 24px',
            borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send Custom Message
        </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="responsive-grid-4" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Total Sent', value: stats.total, icon: '💬', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Delivered', value: stats.sent, icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Simulated', value: stats.simulated, icon: '🔬', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Failed', value: stats.failed, icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        ].map(stat => (
          <div key={stat.label} className="glass card" style={{ padding: '20px', background: stat.bg, border: `1px solid ${stat.color}22` }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, phone, or message…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
          <option value="">All Statuses</option>
          <option value="Sent">Sent</option>
          <option value="Simulated">Simulated</option>
          <option value="Failed">Failed</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
          <option value="">All Categories</option>
          <option value="Attendance">Attendance</option>
          <option value="Fee">Fee</option>
          <option value="VehicleFee">Vehicle Fee</option>
          <option value="Custom">Custom</option>
          <option value="ClassPaper">Class Paper</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
          <option value="">All Channels</option>
          <option value="SMS">SMS</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Both">Both</option>
        </select>
        {(searchTerm || filterStatus || filterCategory || filterType) && (
          <button onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterCategory(''); setFilterType(''); }} style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 600, fontSize: '0.85rem' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Student</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Contact</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Channel</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Category</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Message</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ width: '24px', height: '24px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Loading notifications…
                </div>
              </td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💬</div>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>{searchTerm || filterStatus || filterCategory || filterType ? 'No matching notifications found.' : 'No notifications yet.'}</div>
                <div style={{ fontSize: '0.85rem' }}>Notifications are sent automatically when attendance is marked or fees are recorded.</div>
              </td></tr>
            ) : filteredLogs.map((log, i) => {
              const cat = categoryColors[log.category] || categoryColors.Custom;
              const st = statusColors[log.status] || statusColors.Simulated;
              return (
                <tr key={log._id} className="notif-row" style={{ borderBottom: '1px solid var(--glass-border)', animationDelay: `${i * 0.04}s` }}>
                  <td style={{ padding: '14px 16px' }}>
                    {log.studentId ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{log.studentId.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Roll {log.studentId.rollNumber} • {log.studentId.grade}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unknown</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.recipient}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '0.8rem', fontWeight: 600 }}>
                      {typeIcons[log.type]} {log.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', background: cat.bg, color: cat.color, fontSize: '0.8rem', fontWeight: 600 }}>
                      {cat.icon} {log.category === 'VehicleFee' ? 'Vehicle Fee' : log.category === 'ClassPaper' ? 'Class Paper' : log.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--foreground)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                      {log.message}
                    </div>
                    {log.error && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>⚠️ {log.error}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', background: st.bg, color: st.color, fontSize: '0.8rem', fontWeight: 600 }}>
                      {log.status === 'Sent' ? '✅' : log.status === 'Failed' ? '❌' : '🔬'} {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}<br />
                    <span style={{ fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLogs.length > 0 && (
        <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing {filteredLogs.length} of {logs.length} notification{logs.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Custom Message Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>💬 Send Custom Message</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Draft and send a message to a student&apos;s parent via SMS &amp; WhatsApp.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Student */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  👤 Select Student
                </label>
                <select
                  required
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}
                >
                  <option value="">Choose a student…</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>{s.name} — Roll {s.rollNumber} ({s.grade})</option>
                  ))}
                </select>
                {selectedStudent?.parentContact && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    📞 Parent contact: <strong style={{ fontFamily: 'monospace' }}>{selectedStudent.parentContact}</strong>
                  </div>
                )}
                {form.studentId && !selectedStudent?.parentContact && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#ef4444' }}>
                    ⚠️ No parent contact number on file for this student.
                  </div>
                )}
              </div>

              {/* Channel & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Channel</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                    <option value="Both">📱🟢 Both</option>
                    <option value="SMS">📱 SMS Only</option>
                    <option value="WhatsApp">🟢 WhatsApp Only</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                    <option value="Custom">✍️ Custom</option>
                    <option value="Attendance">📅 Attendance</option>
                    <option value="Fee">💰 Fee</option>
                    <option value="VehicleFee">🚍 Vehicle Fee</option>
                    <option value="ClassPaper">📝 Class Paper</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✉️ Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Type your message to the parent…"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: form.message.length > 160 ? '#f59e0b' : 'var(--text-muted)', marginTop: '4px' }}>
                  {form.message.length} characters {form.message.length > 160 ? '(may be split across multiple SMS)' : ''}
                </div>
                {form.message.includes('[Student Name]') && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                    💡 The placeholder [Student Name] will be automatically replaced with the student's name.
                  </div>
                )}
              </div>

              {/* Result */}
              {sendResult && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: sendResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${sendResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: sendResult.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {sendResult.success ? '✅' : '⚠️'} {sendResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  Cancel
                </button>
                <button
                  id="modal-send-notification-btn"
                  type="submit"
                  disabled={sending || !form.studentId || !form.message.trim()}
                  style={{ padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending || !form.studentId || !form.message.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
                >
                  {sending ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
