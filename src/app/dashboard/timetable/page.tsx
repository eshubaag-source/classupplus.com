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

  // Form state for adding/editing a period
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    day: 'Monday',
    periodNumber: '1',
    startTime: '09:00',
    endTime: '09:45',
    subject: '',
    grade: '',
    section: '',
    roomNumber: ''
  });

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
    const teacher = teachers.find(t => t._id === teacherId) || null;
    setSelectedTeacher(teacher);
    setShowAddForm(false);
    if (teacherId) {
      fetchTimetable(teacherId);
      // Pre-fill form values using the teacher's defaults
      if (teacher) {
        setNewPeriod(prev => ({
          ...prev,
          grade: teacher.grade || '',
          section: teacher.section || '',
          subject: teacher.subject || ''
        }));
      }
    } else {
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

  // Handle local period add
  const handleAddPeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriod.subject || !newPeriod.grade || !newPeriod.section || !newPeriod.startTime || !newPeriod.endTime) {
      alert('Please fill out all required fields.');
      return;
    }

    // Basic time validation
    if (newPeriod.startTime >= newPeriod.endTime) {
      alert('Start time must be before end time.');
      return;
    }

    const updated = [...periods, { ...newPeriod }];
    // Sort periods locally
    const daysOrder: Record<string, number> = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    updated.sort((a, b) => {
      const dayA = daysOrder[a.day] || 99;
      const dayB = daysOrder[b.day] || 99;
      if (dayA !== dayB) return dayA - dayB;
      return a.startTime.localeCompare(b.startTime);
    });

    setPeriods(updated);
    setShowAddForm(false);
    // Reset form fields except structural ones (grade, section, day) to help add multiple
    setNewPeriod(prev => ({
      ...prev,
      periodNumber: String(Number(prev.periodNumber) + 1 || 1),
      startTime: '',
      endTime: '',
      roomNumber: ''
    }));
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

            {selectedTeacher && (
              <button
                className="btn-primary"
                onClick={() => {
                  setNewPeriod(prev => ({
                    ...prev,
                    grade: selectedTeacher.grade || '',
                    section: selectedTeacher.section || '',
                    subject: selectedTeacher.subject || '',
                    day: 'Monday',
                    periodNumber: '1',
                    startTime: '09:00',
                    endTime: '09:45',
                    roomNumber: ''
                  }));
                  setShowAddForm(true);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                + Add Period
              </button>
            )}

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

      {/* Add Period Modal/Form */}
      {showAddForm && (
        <div className="glass card" style={{
          padding: '24px',
          marginBottom: '2rem',
          animation: 'slideDown 0.3s ease',
          border: '1px solid var(--primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>Add Timetable Period</h3>
            <button
              onClick={() => setShowAddForm(false)}
              style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleAddPeriodSubmit} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.2rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Day of Week *</label>
              <select
                value={newPeriod.day}
                onChange={e => setNewPeriod({ ...newPeriod, day: e.target.value })}
                required
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Period Number/Name *</label>
              <input
                type="text"
                placeholder="e.g. 1st or Period 1"
                value={newPeriod.periodNumber}
                onChange={e => setNewPeriod({ ...newPeriod, periodNumber: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Start Time *</label>
              <input
                type="time"
                value={newPeriod.startTime}
                onChange={e => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>End Time *</label>
              <input
                type="time"
                value={newPeriod.endTime}
                onChange={e => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject *</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={newPeriod.subject}
                onChange={e => setNewPeriod({ ...newPeriod, subject: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Grade / Class *</label>
              <input
                type="text"
                placeholder="e.g. 10th"
                value={newPeriod.grade}
                onChange={e => setNewPeriod({ ...newPeriod, grade: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Section *</label>
              <input
                type="text"
                placeholder="e.g. A"
                value={newPeriod.section}
                onChange={e => setNewPeriod({ ...newPeriod, section: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Room Number</label>
              <input
                type="text"
                placeholder="e.g. Lab 2 or Room 102"
                value={newPeriod.roomNumber}
                onChange={e => setNewPeriod({ ...newPeriod, roomNumber: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ minWidth: '150px' }}>
                Add Period to Grid
              </button>
            </div>
          </form>
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
