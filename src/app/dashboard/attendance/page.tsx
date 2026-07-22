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
    </div>
  );
}
