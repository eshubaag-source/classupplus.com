'use client';
import { useState, useEffect } from 'react';

type ClassPaperMark = {
  subject: string;
  totalNumber: string;
  subjectPaperNumber: string;
};

export default function ClassPaperPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Bulk Message Modal State
  const [showModal, setShowModal] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'whatsapp'>('sms');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; total: number } | null>(null);

  // Edit Marks Modal State
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editingMarks, setEditingMarks] = useState<ClassPaperMark[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
  };

  const handleEditMarks = (student: any) => {
    setEditingStudent(student);
    if (student.classPaperMarks && Array.isArray(student.classPaperMarks) && student.classPaperMarks.length > 0) {
      setEditingMarks(student.classPaperMarks);
    } else if (student.subject || student.totalNumber || student.subjectPaperNumber) {
      // Migrate old single subject data to array structure for editing
      setEditingMarks([{
        subject: student.subject || '',
        totalNumber: student.totalNumber || '',
        subjectPaperNumber: student.subjectPaperNumber || ''
      }]);
    } else {
      setEditingMarks([]);
    }
  };

  const handleAddSubject = () => {
    setEditingMarks([...editingMarks, { subject: '', totalNumber: '', subjectPaperNumber: '' }]);
  };

  const handleMarkChange = (index: number, field: keyof ClassPaperMark, value: string) => {
    const newMarks = [...editingMarks];
    newMarks[index][field] = value;
    setEditingMarks(newMarks);
  };

  const handleRemoveSubject = (index: number) => {
    const newMarks = editingMarks.filter((_, i) => i !== index);
    setEditingMarks(newMarks);
  };

  const handleSaveMarks = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          classPaperMarks: editingMarks,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setStudents(prev =>
          prev.map(s =>
            s._id === editingStudent._id
              ? { ...s, classPaperMarks: editingMarks }
              : s
          )
        );
        setEditingStudent(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save');
      }
    } catch {
      alert('Network error');
    } finally {
      setIsSaving(false);
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
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Manage subject paper numbers for all subjects.</p>
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
        <div className="page-header-actions">
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
              <th style={{ padding: '14px 16px' }}>Marks Recorded</th>
              <th style={{ padding: '14px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students found.
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => {
                const marksCount = student.classPaperMarks?.length || (student.subject ? 1 : 0);
                return (
                  <tr key={student._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.name}</td>
                    <td style={{ padding: '12px 16px' }}>{student.grade}</td>
                    <td style={{ padding: '12px 16px' }}>{student.section}</td>
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
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: marksCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: marksCount > 0 ? '#059669' : '#dc2626',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {marksCount} Subjects
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleEditMarks(student)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#fff',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📝 Edit Marks
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Marks Modal */}
      {editingStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="glass" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', background: '#fff' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Edit Marks</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Student: <strong>{editingStudent.name}</strong> (Roll No: {editingStudent.rollNumber})
            </p>

            {editingMarks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>No marks added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <div>Subject</div>
                  <div>Total Marks</div>
                  <div>Obtained</div>
                  <div></div>
                </div>
                {editingMarks.map((mark, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={mark.subject}
                      onChange={e => handleMarkChange(index, 'subject', e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={mark.totalNumber}
                      onChange={e => handleMarkChange(index, 'totalNumber', e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="e.g. 85"
                      value={mark.subjectPaperNumber}
                      onChange={e => handleMarkChange(index, 'subjectPaperNumber', e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => handleRemoveSubject(index)}
                      style={{
                        padding: '6px 10px',
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      title="Remove Subject"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAddSubject}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                border: '1px dashed var(--primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: '1.5rem'
              }}
            >
              + Add Subject
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setEditingStudent(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#e5e7eb', cursor: 'pointer' }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMarks}
                disabled={isSaving}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {isSaving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

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
