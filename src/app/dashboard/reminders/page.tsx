'use client';

import { useState, useEffect, useMemo } from 'react';

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  grade: string;
  section: string;
  parentContact?: string;
}

export default function RemindersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'Fee' | 'VehicleFee'>('Fee');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Message Form
  const [messageTemplate, setMessageTemplate] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'WhatsApp' | 'Both'>('Both');

  // Submission State
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetch('/api/students')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Update default message when tab changes
  useEffect(() => {
    if (activeTab === 'Fee') {
      setMessageTemplate(`Dear Parent, this is a reminder regarding the pending school fee for your child [Student Name]. Please do the needful at the earliest.`);
    } else {
      setMessageTemplate(`Dear Parent, this is a reminder regarding the pending vehicle fee for your child [Student Name]. Please do the needful at the earliest.`);
    }
    setSelectedStudentIds(new Set()); // Reset selections on tab change
    setSendResult(null);
  }, [activeTab]);

  const uniqueGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort(), [students]);
  const uniqueSections = useMemo(() => {
    if (!selectedGrade) return [];
    return Array.from(new Set(students.filter(s => s.grade === selectedGrade).map(s => s.section))).sort();
  }, [students, selectedGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade && s.grade !== selectedGrade) return false;
      if (selectedSection && s.section !== selectedSection) return false;
      return true;
    });
  }, [students, selectedGrade, selectedSection]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)));
    }
  };

  const handleSendBulk = async () => {
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student.');
      return;
    }
    if (!messageTemplate.trim()) {
      alert('Please enter a message template.');
      return;
    }

    setSending(true);
    setSendResult(null);

    // Prepare individualized messages
    const studentMessages: Record<string, string> = {};
    Array.from(selectedStudentIds).forEach(id => {
      const student = students.find(s => s._id === id);
      if (student) {
        studentMessages[id] = messageTemplate.replace(/\[Student Name\]/gi, student.name);
      }
    });

    try {
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudentIds),
          type: channel,
          category: activeTab,
          message: studentMessages,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, message: data.message || `Successfully sent ${selectedStudentIds.size} reminders.` });
        setSelectedStudentIds(new Set()); // clear on success
      } else {
        setSendResult({ success: false, message: data.message || 'Failed to send bulk reminders.' });
      }
    } catch (err: any) {
      setSendResult({ success: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePDF = () => {
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student to generate a PDF.');
      return;
    }
    const idsString = Array.from(selectedStudentIds).join(',');
    window.open(`/api/reminders/pdf?ids=${idsString}`, '_blank');
  };

  return (
    <div>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .student-row { animation: fadeInUp 0.3s ease both; }
        .tab-btn {
          padding: 12px 24px; border-radius: 12px; border: 1px solid transparent; background: transparent; color: var(--text-muted); font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .tab-btn.active {
          background: var(--glass-bg); border-color: var(--glass-border); color: var(--foreground); box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .reminders-layout {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
          align-items: flex-start;
        }
        @media (max-width: 900px) {
          .reminders-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Send Reminders</h1>
          <p style={{ color: 'var(--text-muted)' }}>Send bulk school fee and vehicle fee reminders to parents.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`tab-btn ${activeTab === 'Fee' ? 'active' : ''}`} onClick={() => setActiveTab('Fee')}>
          💰 School Fees
        </button>
        <button className={`tab-btn ${activeTab === 'VehicleFee' ? 'active' : ''}`} onClick={() => setActiveTab('VehicleFee')}>
          🚍 Vehicle Fees
        </button>
      </div>

      <div className="reminders-layout">
        {/* Left Column: Student List & Filters */}
        <div className="glass card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select
              value={selectedGrade}
              onChange={e => { setSelectedGrade(e.target.value); setSelectedSection(''); }}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)' }}
            >
              <option value="">All Classes</option>
              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              disabled={!selectedGrade}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)' }}
            >
              <option value="">All Sections</option>
              {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {selectedStudentIds.size} selected
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '14px', width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                  </th>
                  <th style={{ padding: '14px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</th>
                  <th style={{ padding: '14px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Roll No</th>
                  <th style={{ padding: '14px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                  <th style={{ padding: '14px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</td></tr>
                ) : (
                  filteredStudents.map((s, i) => (
                    <tr key={s._id} className="student-row" style={{ borderBottom: '1px solid var(--glass-border)', animationDelay: `${i * 0.02}s` }} onClick={() => toggleStudent(s._id)}>
                      <td style={{ padding: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedStudentIds.has(s._id)} readOnly style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                      </td>
                      <td style={{ padding: '14px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{s.rollNumber}</td>
                      <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{s.grade} - {s.section}</td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', color: s.parentContact ? 'var(--foreground)' : '#ef4444' }}>
                        {s.parentContact || 'Missing'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Compose Message */}
        <div className="glass card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Compose Reminder</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>CHANNEL</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as any)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)' }}
            >
              <option value="Both">📱🟢 Both (SMS & WhatsApp)</option>
              <option value="SMS">📱 SMS Only</option>
              <option value="WhatsApp">🟢 WhatsApp Only</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>MESSAGE TEMPLATE</label>
            <textarea
              rows={6}
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '8px' }}>
              💡 Use <strong>[Student Name]</strong> to auto-insert each selected student&apos;s name.
            </div>
          </div>

          {sendResult && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '10px', background: sendResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: sendResult.success ? '#10b981' : '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
              {sendResult.success ? '✅' : '⚠️'} {sendResult.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleSendBulk}
              disabled={sending || selectedStudentIds.size === 0}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: 700, border: 'none', cursor: (sending || selectedStudentIds.size === 0) ? 'not-allowed' : 'pointer',
                opacity: (sending || selectedStudentIds.size === 0) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {sending ? 'Sending...' : `Send Reminders (${selectedStudentIds.size})`}
            </button>

            <button
              onClick={handleGeneratePDF}
              disabled={selectedStudentIds.size === 0}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'transparent',
                color: 'var(--foreground)', fontWeight: 700, border: '1px solid var(--glass-border)', cursor: selectedStudentIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedStudentIds.size === 0 ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              📄 Generate PDF Reminders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
