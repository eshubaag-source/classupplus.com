'use client';

import { useState, useEffect } from 'react';

export default function AttendancePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>({});
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [userRole, setUserRole] = useState<string>('admin');
  const isTeacher = userRole === 'teacher';
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Messaging Modal State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgResult, setMsgResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [msgForm, setMsgForm] = useState({
    type: 'Both' as 'SMS' | 'WhatsApp' | 'Both',
    category: 'Attendance' as 'Attendance' | 'Fee' | 'VehicleFee' | 'Custom',
    message: '',
  });

  useEffect(() => {
    setIsMounted(true);
    // Set initial date only on client
    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  useEffect(() => {
    if (date) {
      fetchData();
    }
  }, [date]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [studentsRes, attendanceRes, profileRes] = await Promise.all([
        fetch('/api/students', { headers: { 'Accept': 'application/json' } }),
        fetch(`/api/attendance?date=${date}`, { headers: { 'Accept': 'application/json' } }),
        fetch('/api/profile', { headers: { 'Accept': 'application/json' } })
      ]);

      // Validate HTTP status for students
      if (!studentsRes.ok) {
        const errData = await studentsRes.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch students (${studentsRes.status})`);
      }

      // Guard against non-JSON responses (e.g. PDF served instead of JSON)
      const studentsContentType = studentsRes.headers.get('content-type') || '';
      if (!studentsContentType.includes('application/json')) {
        throw new Error(`Unexpected response from /api/students (${studentsContentType}). Try refreshing the page.`);
      }

      const studentsData = await studentsRes.json();
      const attendanceData = attendanceRes.ok ? await attendanceRes.json().catch(() => []) : [];
      const profile = profileRes.ok ? await profileRes.json().catch(() => ({})) : {};

      if (profile.schoolName) setSchoolName(profile.schoolName);
      if (profile.role) setUserRole(profile.role);

      // Ensure students is always an array
      setStudents(Array.isArray(studentsData) ? studentsData : []);

      const attMap: any = {};
      if (Array.isArray(attendanceData)) {
        attendanceData.forEach((record: any) => {
          attMap[record.studentId._id || record.studentId] = record.status;
        });
      }
      setAttendance(attMap);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setFetchError(err.message || 'Failed to load data. Please try again.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (studentId: string, status: 'Present' | 'Absent') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ studentId, status, date }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setAttendance({ ...attendance, [studentId]: status });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllPresent = async () => {
    if (!confirm('Mark all currently listed students as Present?')) return;

    setLoading(true);
    try {
      const promises = filteredStudents.map(student =>
        fetch('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({ studentId: student._id, status: 'Present', date }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await Promise.all(promises);

      const newAttendance = { ...attendance };
      filteredStudents.forEach(student => {
        newAttendance[student._id] = 'Present';
      });
      setAttendance(newAttendance);
    } catch (err) {
      console.error(err);
      alert('Failed to mark all present.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredStudents.length === 0 || !msgForm.message.trim()) return;

    setSendingMsg(true);
    setMsgResult(null);

    try {
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: filteredStudents.map((s) => s._id),
          type: msgForm.type,
          category: msgForm.category,
          message: msgForm.message,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsgResult({ success: true, message: `Successfully queued message for ${filteredStudents.length} student(s)!` });
        setMsgForm({ ...msgForm, message: '' });
      } else {
        setMsgResult({ success: false, message: data.message || 'Failed to send bulk message.' });
      }
    } catch (err: any) {
      setMsgResult({ success: false, message: err.message || 'An error occurred while sending.' });
    } finally {
      setSendingMsg(false);
    }
  };

  if (!isMounted) return null;
  const uniqueClasses = Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  const uniqueSections = Array.from(new Set(students.map(s => s.section))).filter(Boolean).sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.Fathername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.fatherName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass ? s.grade === filterClass : true;
    const matchesSection = filterSection ? s.section === filterSection : true;
    return matchesSearch && matchesClass && matchesSection;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Daily Attendance</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Track student presence and absences.</p>
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
        <div className="page-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontWeight: 600 }}>Select Date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }}
            />
          </div>
          {date && (
            <a href={`/api/attendance/pdf?date=${date}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📄 Download Monthly PDF
              </button>
            </a>
          )}
        </div>
      </div>
      {/* Search Bar & Actions */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            placeholder="Search by name or father name"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.95rem',
              minWidth: '200px',
              maxWidth: '400px'
            }}
          />
          {!isTeacher && (
            <>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                  background: 'white',
                }}
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c as string} value={c as string}>{c as string}</option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                  background: 'white',
                }}
              >
                <option value="">All Sections</option>
                {uniqueSections.map(s => (
                  <option key={s as string} value={s as string}>{s as string}</option>
                ))}
              </select>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={markAllPresent}
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={loading || filteredStudents.length === 0}
          >
            ✅ Mark All Present
          </button>
          <button
            onClick={() => { setShowMsgModal(true); setMsgResult(null); }}
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={loading || filteredStudents.length === 0}
          >
            💬 Message All
          </button>
        </div>
      </div>

      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '16px' }}>Student Name</th>
              <th style={{ padding: '16px' }}>Father Name</th>
              <th style={{ padding: '16px' }}>Roll No</th>
              {!isTeacher && <th style={{ padding: '16px' }}>Class</th>}
              {!isTeacher && <th style={{ padding: '16px' }}>Section</th>}
              <th style={{ padding: '16px' }}>Note</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isTeacher ? 5 : 7} style={{ padding: '40px', textAlign: 'center' }}>Loading...</td></tr>
            ) : fetchError ? (
              <tr><td colSpan={isTeacher ? 5 : 7} style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                ⚠️ {fetchError}
              </td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={isTeacher ? 5 : 7} style={{ padding: '40px', textAlign: 'center' }}>No students found. Please add students first.</td></tr>
            ) :
              filteredStudents.length === 0 ? (
                <tr><td colSpan={isTeacher ? 5 : 7} style={{ padding: '40px', textAlign: 'center' }}>No students found matching your search.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px', fontWeight: 800 }}>{student.name}</td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{student.fatherName}</td>
                    <td style={{ padding: '16px' }}>{student.rollNumber}</td>
                    {!isTeacher && <td style={{ padding: '16px' }}>{student.grade}</td>}
                    {!isTeacher && <td style={{ padding: '16px' }}>{student.section}</td>}
                    <td style={{ padding: '16px' }}>{student.note}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => markAttendance(student._id, 'Present')}
                          className={`badge ${attendance[student._id] === 'Present' ? 'badge-success' : ''}`}
                          style={{
                            border: attendance[student._id] === 'Present' ? 'none' : '1px solid #dcfce7',
                            color: attendance[student._id] === 'Present' ? 'white' : '#166534',
                            background: attendance[student._id] === 'Present' ? '#10b981' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(student._id, 'Absent')}
                          className={`badge ${attendance[student._id] === 'Absent' ? 'badge-danger' : ''}`}
                          style={{
                            border: attendance[student._id] === 'Absent' ? 'none' : '1px solid #fee2e2',
                            color: attendance[student._id] === 'Absent' ? 'white' : '#991b1b',
                            background: attendance[student._id] === 'Absent' ? '#ef4444' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

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

      {/* Bulk Message Modal */}
      {showMsgModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowMsgModal(false); }}>
          <div className="modal-box" style={{ color: 'var(--foreground)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '4px', color: 'var(--foreground)' }}>💬 Send Message to All</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Draft and send a message to parents of all {filteredStudents.length} currently listed/filtered students.
                </p>
              </div>
              <button onClick={() => setShowMsgModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>

            <form onSubmit={handleSendBulkMessage} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Target info */}
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.9rem' }}>
                🎯 Recipients: <strong>{filteredStudents.length} student(s)</strong> {filterClass && `in class ${filterClass}`} {filterSection && `section ${filterSection}`}
              </div>

              {/* Channel & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Channel</label>
                  <select value={msgForm.type} onChange={e => setMsgForm({ ...msgForm, type: e.target.value as any })} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                    <option value="Both">📱🟢 Both</option>
                    <option value="SMS">📱 SMS Only</option>
                    <option value="WhatsApp">🟢 WhatsApp Only</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                  <select value={msgForm.category} onChange={e => setMsgForm({ ...msgForm, category: e.target.value as any })} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                    <option value="Attendance">📅 Attendance</option>
                    <option value="Custom">✍️ Custom</option>
                    <option value="Fee">💰 Fee</option>
                    <option value="VehicleFee">🚍 Vehicle Fee</option>
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
                  value={msgForm.message}
                  onChange={e => setMsgForm({ ...msgForm, message: e.target.value })}
                  placeholder="Type your bulk message to parents…"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: msgForm.message.length > 160 ? '#f59e0b' : 'var(--text-muted)', marginTop: '4px' }}>
                  {msgForm.message.length} characters {msgForm.message.length > 160 ? '(may be split across multiple SMS)' : ''}
                </div>
              </div>

              {/* Result */}
              {msgResult && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: msgResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msgResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: msgResult.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {msgResult.success ? '✅' : '⚠️'} {msgResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowMsgModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  Cancel
                </button>
                <button
                  id="modal-send-bulk-notification-btn"
                  type="submit"
                  disabled={sendingMsg || filteredStudents.length === 0 || !msgForm.message.trim()}
                  style={{ padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, cursor: sendingMsg ? 'not-allowed' : 'pointer', opacity: sendingMsg || filteredStudents.length === 0 || !msgForm.message.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
                >
                  {sendingMsg ? (
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
