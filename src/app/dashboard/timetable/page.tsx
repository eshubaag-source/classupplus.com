'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetablePeriod {
  _id?: string;
  day: string;
  periodNumber: string;
  subject: string;
  grade: string;
  section: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
  grade: string;
  section: string;
  subject?: string;
  schoolName: string;
}

export default function TimetablePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Timetable state
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [originalPeriods, setOriginalPeriods] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // Load user profile & role
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setRole(data.role);
          if (data.role === 'admin') {
            fetchTeachers();
          } else {
            // Teacher directly fetches their own timetable
            fetchTimetable('');
          }
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Fetch teachers list (Admin only)
  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch timetable for a teacher
  const fetchTimetable = async (teacherId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const url = teacherId ? `/api/timetable?teacherId=${teacherId}` : '/api/timetable';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPeriods(data);
        setOriginalPeriods(JSON.parse(JSON.stringify(data)));
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to load timetable.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error loading timetable.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle teacher dropdown change
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    if (teacherId) {
      const teacher = teachers.find(t => t._id === teacherId) || null;
      setSelectedTeacher(teacher);

      // Fetch timetable for the selected teacher from the backend
      fetchTimetable(teacherId);
    } else {
      setSelectedTeacher(null);
      setPeriods([]);
      setOriginalPeriods([]);
    }
  };

  // Handle local period delete
  const handleDeletePeriod = (index: number) => {
    const updated = [...periods];
    updated.splice(index, 1);
    setPeriods(updated);
  };

  // Handle local period edit (inline in grid)
  const handleUpdatePeriod = (index: number, field: keyof TimetablePeriod, value: string) => {
    const updated = [...periods];
    (updated[index] as any)[field] = value;
    setPeriods(updated);
  };

  // Add a blank row to the grid
  const handleAddBlankRow = () => {
    setPeriods([...periods, {
      day: 'Monday',
      periodNumber: '1',
      startTime: '07:00',
      endTime: '07:45',
      subject: selectedTeacher?.subject || '',
      grade: selectedTeacher?.grade || '',
      section: selectedTeacher?.section || '',
      roomNumber: '1'
    }]);
  };

  // Save the entire timetable draft to backend (Admin only)
  const handleSaveTimetable = async () => {
    if (!selectedTeacherId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          periods: periods
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Timetable saved successfully!' });
        setOriginalPeriods(JSON.parse(JSON.stringify(periods)));
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save timetable.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error saving timetable.' });
    } finally {
      setSaving(false);
    }
  };

  // Reset changes to original state
  const handleResetChanges = () => {
    setPeriods(JSON.parse(JSON.stringify(originalPeriods)));
    setMessage(null);
  };

  // Helper: Group periods by Day for viewing
  const getPeriodsByDay = (day: string) => {
    return periods.filter(p => p.day === day);
  };

  const hasUnsavedChanges = JSON.stringify(periods) !== JSON.stringify(originalPeriods);

  if (role === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading interface...</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">{role === 'admin' ? 'Teacher Timetable Manager' : 'My Weekly Timetable'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {role === 'admin'
              ? 'Schedule and manage weekly teaching periods for all instructors.'
              : 'View your scheduled periods, classes, and room assignments for the week.'
            }
          </p>
        </div>
      </div>

      {/* Admin Interface Controls */}
      {role === 'admin' && (
        <div className="glass card" style={{ padding: '24px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Select Teacher</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedTeacherId}
              onChange={e => handleTeacherChange(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                minWidth: '250px',
                cursor: 'pointer'
              }}
            >
              <option value="">— Select Teacher —</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.subject || 'No Subject'} - Class {t.grade} {t.section})
                </option>
              ))}
            </select>


            {hasUnsavedChanges && (
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  className="btn-primary"
                  onClick={handleSaveTimetable}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {saving ? 'Saving...' : '💾 Save Timetable'}
                </button>
                <button
                  onClick={handleResetChanges}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {selectedTeacher && (
            <div style={{
              marginTop: '1.2rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              gap: '1.5rem',
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap'
            }}>
              <span><strong>School:</strong> {selectedTeacher.schoolName}</span>
              <span><strong>Assigned Class:</strong> {selectedTeacher.grade} - {selectedTeacher.section}</span>
              <span><strong>Primary Subject:</strong> {selectedTeacher.subject || '—'}</span>
              <span><strong>Email:</strong> {selectedTeacher.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Success/Error Alerts */}
      {message && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          marginBottom: '2rem',
          fontWeight: 500,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
        }}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Floating unsaved changes reminder for Admins */}
      {role === 'admin' && hasUnsavedChanges && !message && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
          border: '1px solid rgba(245,158,11,0.3)',
          color: '#d97706',
          fontWeight: 600,
          fontSize: '0.9rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'between',
          alignItems: 'center'
        }}>
          <span>⚠️ You have unsaved changes. Remember to click "Save Timetable" to apply them.</span>
        </div>
      )}



      {/* Main Timetable Display Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading schedule data...</p>
        </div>
      ) : role === 'admin' && !selectedTeacherId ? (
        <div className="glass card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗓️</div>
          <h2>No Teacher Selected</h2>
          <p style={{ marginTop: '0.5rem' }}>Please select an instructor from the dropdown list to manage or create their period timetable.</p>
        </div>
      ) : role === 'admin' ? (
        <div className="glass card" style={{ padding: '20px', overflowX: 'auto', background: 'var(--glass-bg)', borderRadius: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px' }}>Day</th>
                <th style={{ padding: '12px 8px' }}>Period</th>
                <th style={{ padding: '12px 8px' }}>Time</th>
                <th style={{ padding: '12px 8px' }}>Subject</th>
                <th style={{ padding: '12px 8px' }}>Class</th>
                <th style={{ padding: '12px 8px' }}>Sec</th>
                <th style={{ padding: '12px 8px' }}>Room</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No periods entered yet. Click "+ Add Blank Period" below.</td>
                </tr>
              ) : (
                periods.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '8px' }}>
                      <select value={p.day} onChange={e => handleUpdatePeriod(i, 'day', e.target.value)} style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }}>
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={p.periodNumber} onChange={e => handleUpdatePeriod(i, 'periodNumber', e.target.value)} placeholder="1st" style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input type="time" value={p.startTime} onChange={e => handleUpdatePeriod(i, 'startTime', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                      -
                      <input type="time" value={p.endTime} onChange={e => handleUpdatePeriod(i, 'endTime', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={p.subject} onChange={e => handleUpdatePeriod(i, 'subject', e.target.value)} placeholder="Subject" style={{ width: '120px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={p.grade} onChange={e => handleUpdatePeriod(i, 'grade', e.target.value)} placeholder="Class" style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={p.section} onChange={e => handleUpdatePeriod(i, 'section', e.target.value)} placeholder="Sec" style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={p.roomNumber || ''} onChange={e => handleUpdatePeriod(i, 'roomNumber', e.target.value)} placeholder="Room" style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.5)' }} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDeletePeriod(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }} title="Delete Row">✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem' }}>
            <button className="btn-secondary" onClick={handleAddBlankRow} style={{ padding: '8px 16px', fontSize: '0.9rem', borderRadius: '8px', fontWeight: 600, border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', cursor: 'pointer' }}>+ Add Blank Period</button>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {DAYS_OF_WEEK.map(day => {
            const dayPeriods = getPeriodsByDay(day);
            return (
              <div key={day} className="glass card" style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '280px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow)',
                transition: 'transform 0.2s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Day Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1.5px solid var(--glass-border)',
                  marginBottom: '14px'
                }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    letterSpacing: '0.02em'
                  }}>
                    {day}
                  </h3>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: '20px'
                  }}>
                    {dayPeriods.length} {dayPeriods.length === 1 ? 'Period' : 'Periods'}
                  </span>
                </div>

                {/* Period Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {dayPeriods.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      border: '1.5px dashed var(--glass-border)',
                      borderRadius: '10px',
                      padding: '20px 10px',
                      textAlign: 'center'
                    }}>
                      No periods scheduled
                    </div>
                  ) : (
                    dayPeriods.map((period, index) => {
                      // Find direct index in main periods list to delete correctly
                      const globalIndex = periods.indexOf(period);
                      return (
                        <div key={index}
                          onClick={() => {
                            router.push(`/dashboard/classpaper?class=${encodeURIComponent(period.grade)}&section=${encodeURIComponent(period.section)}&subject=${encodeURIComponent(period.subject)}`);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            cursor: 'pointer'
                          }}>
                          {/* Top Row: Period Num & Delete button if Admin */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              color: 'var(--primary)',
                              background: 'rgba(99, 102, 241, 0.08)',
                              padding: '2px 6px',
                              borderRadius: '6px'
                            }}>
                              {period.periodNumber} Period
                            </span>

                            {role === 'admin' && (
                              <button
                                onClick={() => handleDeletePeriod(globalIndex)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Delete Period"
                              >
                                🗑️
                              </button>
                            )}
                          </div>

                          {/* Subject Name */}
                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--foreground)' }}>
                            {period.subject}
                          </div>

                          {/* Details Row: Class / Room */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span>🏫 Class: <strong>{period.grade} - {period.section}</strong></span>
                            {period.roomNumber && (
                              <span>📍 Room: <strong>{period.roomNumber}</strong></span>
                            )}
                          </div>

                          {/* Time Stamp */}
                          <div style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                            fontWeight: 500
                          }}>
                            ⏰ {period.startTime} – {period.endTime}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Styled JSX (Animations) */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
