'use client';
import { useState, useEffect } from 'react';

type EditRow = {
  subject: string;
  totalNumber: string;
  subjectPaperNumber: string;
};

export default function ClassPaperPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editRows, setEditRows] = useState<Record<string, EditRow>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');

  // Bulk Message Modal State
  const [showModal, setShowModal] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'whatsapp'>('sms');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; total: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const [res, profileRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/profile')
    ]);
    const data = await res.json();
    const profile = await profileRes.json();
    if (profile.schoolName) setSchoolName(profile.schoolName);
    
    const list = Array.isArray(data) ? data : [];
    setStudents(list);
    // Initialize edit rows from fetched data
    const rows: Record<string, EditRow> = {};
    list.forEach((s: any) => {
      rows[s._id] = {
        subject: s.subject || '',
        totalNumber: s.totalNumber || '',
        subjectPaperNumber: s.subjectPaperNumber || '',
      };
    });
    setEditRows(rows);
  };

  const handleFieldChange = (studentId: string, field: keyof EditRow, value: string) => {
    setEditRows(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSaveRow = async (studentId: string) => {
    const row = editRows[studentId];
    if (!row) return;
    setSavingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          subject: row.subject,
          totalNumber: row.totalNumber,
          subjectPaperNumber: row.subjectPaperNumber,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setStudents(prev =>
          prev.map(s =>
            s._id === studentId
              ? { ...s, subject: row.subject, totalNumber: row.totalNumber, subjectPaperNumber: row.subjectPaperNumber }
              : s
          )
        );
        setSavedId(studentId);
        setTimeout(() => setSavedId(null), 2000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save');
      }
    } catch {
      alert('Network error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSendBulkMessage = async () => {
    if (!messageText.trim()) return alert('Message cannot be empty');
    setSending(true);
    setSendResult(null);
    try {
      const studentIds = filteredStudents.map(s => s._id);
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          type: messageType,
          category: 'other',
          message: messageText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: data.results?.filter((r: any) => r.success).length || 0, total: studentIds.length });
        setMessageText('');
        setTimeout(() => setShowModal(false), 3000);
      } else {
        alert(data.message || 'Failed to send bulk message');
      }
    } catch {
      alert('Network error');
    } finally {
      setSending(false);
    }
  };

  if (!isMounted) return null;

  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--glass-border, #e2e8f0)',
    background: 'rgba(255,255,255,0.6)',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Class Paper Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Manage subject paper numbers and send bulk messages.</p>
          {schoolName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--primary)',
            }}>
              🏫 {schoolName}
            </div>
          )}
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-primary"
            onClick={() => {
              window.open('/api/classpaper/pdf', '_blank');
            }}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            📥 Download List
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            💬 Send Bulk Message
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or roll number"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '0.95rem',
          }}
        />
      </div>

      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Roll No</th>
              <th style={{ padding: '14px 16px' }}>Name</th>
              <th style={{ padding: '14px 16px' }}>Class</th>
              <th style={{ padding: '14px 16px' }}>Section</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Parent Contact</th>
              <th style={{ padding: '14px 16px' }}>Subject</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Total Number</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Paper Number</th>
              <th style={{ padding: '14px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students found.
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => {
                const row = editRows[student._id] || { subject: '', totalNumber: '', subjectPaperNumber: '' };
                const isSaving = savingId === student._id;
                const isSaved = savedId === student._id;
                return (
                  <tr key={student._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {/* Roll No */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        color: 'var(--primary)',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}>
                        {student.rollNumber}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.name}</td>

                    {/* Class */}
                    <td style={{ padding: '12px 16px' }}>{student.grade}</td>

                    {/* Section */}
                    <td style={{ padding: '12px 16px' }}>{student.section}</td>

                    {/* Parent Contact */}
                    <td style={{ padding: '12px 16px' }}>
                      {student.parentContact ? (
                        <a
                          href={`tel:${student.parentContact}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                        >
                          📞 {student.parentContact}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                      )}
                    </td>

                    {/* Subject */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="text"
                        value={row.subject}
                        onChange={e => handleFieldChange(student._id, 'subject', e.target.value)}
                        placeholder="Subject..."
                        style={{ ...inputStyle, width: '120px' }}
                      />
                    </td>

                    {/* Total Number */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="number"
                        value={row.totalNumber}
                        onChange={e => handleFieldChange(student._id, 'totalNumber', e.target.value)}
                        placeholder="Total..."
                        style={{ ...inputStyle, width: '80px' }}
                      />
                    </td>

                    {/* Paper Number */}
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="text"
                        value={row.subjectPaperNumber}
                        onChange={e => handleFieldChange(student._id, 'subjectPaperNumber', e.target.value)}
                        placeholder="Paper No..."
                        style={{ ...inputStyle, width: '120px' }}
                      />
                    </td>

                    {/* Save Button */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleSaveRow(student._id)}
                        disabled={isSaving}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          background: isSaved
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#fff',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          opacity: isSaving ? 0.7 : 1,
                        }}
                      >
                        {isSaving ? '⏳ Saving...' : isSaved ? '✅ Saved!' : '💾 Save'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Message Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="glass" style={{ width: '90%', maxWidth: '500px', padding: '2rem', borderRadius: '16px', background: '#fff' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Send Message to All</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              This will send a message to all <strong>{filteredStudents.length}</strong> students currently visible in the table.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message Type</label>
              <select
                value={messageType}
                onChange={e => setMessageType(e.target.value as 'sms' | 'whatsapp')}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '100px' }}
              />
            </div>

            {sendResult && (
              <div style={{
                padding: '10px', marginBottom: '1rem', borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 500,
              }}>
                ✅ Successfully sent {sendResult.success} out of {sendResult.total} messages!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#e5e7eb', cursor: 'pointer' }}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulkMessage}
                disabled={sending || filteredStudents.length === 0}
                className="btn-primary"
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
