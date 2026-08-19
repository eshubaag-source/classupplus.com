'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type ClassPaperMark = {
  subject: string;
  totalNumber: string;
  subjectPaperNumber: string;
  date?: string;
};

function ClassPaperContent() {
  const [students, setStudents] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const [selectedClass, setSelectedClass] = useState(searchParams?.get('class') || '');
  const [selectedSection, setSelectedSection] = useState(searchParams?.get('section') || '');
  const [urlSubject, setUrlSubject] = useState(searchParams?.get('subject') || '');
  
  // Global settings for bulk marks entry
  const [globalSubject, setGlobalSubject] = useState('');
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalTotalMarks, setGlobalTotalMarks] = useState('');
  const [bulkMarks, setBulkMarks] = useState<Record<string, string>>({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [userRole, setUserRole] = useState<string>('admin');
  const isTeacher = userRole === 'teacher';

  // Bulk Message Modal State
  const [showModal, setShowModal] = useState(false);
  const [messageType, setMessageType] = useState<'SMS' | 'WhatsApp'>('SMS');
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

  useEffect(() => {
    if (searchParams) {
      if (searchParams.get('class')) setSelectedClass(searchParams.get('class')!);
      if (searchParams.get('section')) setSelectedSection(searchParams.get('section')!);
      if (searchParams.get('subject')) {
        setUrlSubject(searchParams.get('subject')!);
        setGlobalSubject(searchParams.get('subject')!);
      }
    }
  }, [searchParams]);

  const fetchStudents = async () => {
    const [res, profileRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/profile')
    ]);
    const data = await res.json();
    const profile = await profileRes.json();
    if (profile.schoolName) setSchoolName(profile.schoolName);
    if (profile.role) setUserRole(profile.role);
    
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
        subjectPaperNumber: student.subjectPaperNumber || '',
        date: ''
      }]);
    } else {
      setEditingMarks([{ subject: urlSubject || '', totalNumber: '', subjectPaperNumber: '', date: '' }]);
    }
  };

  const handleAddSubject = () => {
    setEditingMarks([...editingMarks, { subject: urlSubject || '', totalNumber: '', subjectPaperNumber: '', date: '' }]);
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
    setSending(true);
    setSendResult(null);
    try {
      const studentIds = filteredStudents.map(s => s._id);
      
      const messages: Record<string, string> = {};
      filteredStudents.forEach(s => {
        const marks = s.classPaperMarks || [];
        if (marks.length === 0) {
          const subject = s.subject || 'N/A';
          const obtained = s.subjectPaperNumber || '0';
          const total = s.totalNumber || '0';
          const marksText = obtained === 'A' || obtained.toLowerCase() === 'absent' ? 'Absent' : `${obtained}/${total}`;
          messages[s._id] = `Student Name: ${s.name}\nSubject: ${subject}\nMarks: ${marksText}`;
        } else {
          const subjectsText = marks.map((m: any) => {
            const marksText = m.subjectPaperNumber === 'A' || m.subjectPaperNumber?.toLowerCase() === 'absent' ? 'Absent' : `${m.subjectPaperNumber}/${m.totalNumber}`;
            return `${m.subject}: ${marksText}`;
          }).join('\n');
          messages[s._id] = `Student Name: ${s.name}\n${subjectsText}`;
        }
      });

      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          type: messageType,
          category: 'ClassPaper',
          message: messages,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: data.results?.filter((r: any) => r.success).length || 0, total: studentIds.length });
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

  const handleBulkMarkChange = (studentId: string, value: string) => {
    setBulkMarks(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSaveBulkMarks = async () => {
    if (!globalSubject.trim()) return alert('Please enter a Subject.');
    if (!globalTotalMarks.trim()) return alert('Please enter Total Marks.');
    
    const studentsToUpdate = Object.entries(bulkMarks).filter(([_, mark]) => mark.trim() !== '');
    if (studentsToUpdate.length === 0) return alert('No marks entered to save.');

    setIsSavingBulk(true);
    let successCount = 0;

    try {
      await Promise.all(studentsToUpdate.map(async ([studentId, obtainedMark]) => {
        const student = students.find(s => s._id === studentId);
        if (!student) return;

        let currentMarks = [...(student.classPaperMarks || [])];
        if (currentMarks.length === 0 && (student.subject || student.totalNumber || student.subjectPaperNumber)) {
           // migrate old structure
           currentMarks = [{
             subject: student.subject || '',
             totalNumber: student.totalNumber || '',
             subjectPaperNumber: student.subjectPaperNumber || '',
             date: ''
           }];
        }

        const newMark = {
          subject: globalSubject,
          date: globalDate,
          totalNumber: globalTotalMarks,
          subjectPaperNumber: obtainedMark
        };

        const existingIndex = currentMarks.findIndex(m => m.subject.toLowerCase() === globalSubject.toLowerCase() && m.date === globalDate);
        if (existingIndex >= 0) {
          currentMarks[existingIndex] = newMark;
        } else {
          currentMarks.push(newMark);
        }

        const res = await fetch(`/api/students/${studentId}`, {
          method: 'PUT',
          body: JSON.stringify({ classPaperMarks: currentMarks }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          successCount++;
        }
      }));

      alert(`Successfully saved marks for ${successCount} student(s)!`);
      setBulkMarks({});
      fetchStudents(); // Refresh data
    } catch {
      alert('A network error occurred while saving.');
    } finally {
      setIsSavingBulk(false);
    }
  };

  if (!isMounted) return null;

  const uniqueClasses = Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  const uniqueSections = Array.from(new Set(students.map(s => s.section))).filter(Boolean).sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass ? s.grade === selectedClass : true;
    const matchesSection = selectedSection ? s.section === selectedSection : true;
    return matchesSearch && matchesClass && matchesSection;
  }).sort((a, b) => a.name.localeCompare(b.name));

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
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <a
            href={`/api/classpaper/pdf?class=${encodeURIComponent(selectedClass)}&section=${encodeURIComponent(selectedSection)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📥 Download All Reports
          </a>
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            💬 Send Bulk Message
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or roll number"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '0.95rem',
          }}
        />
        {!isTeacher && (
          <>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{
                flex: '1 1 120px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '0.95rem',
                background: 'white',
              }}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls as string} value={cls as string}>{cls as string}</option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              style={{
                flex: '1 1 120px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '0.95rem',
                background: 'white',
              }}
            >
              <option value="">All Sections</option>
              {uniqueSections.map(sec => (
                <option key={sec as string} value={sec as string}>{sec as string}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="glass" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderRadius: '12px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Global Paper Settings (Apply to All)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>Subject</label>
            <input type="text" value={globalSubject} onChange={e => setGlobalSubject(e.target.value)} style={inputStyle} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>Date</label>
            <input type="date" value={globalDate} onChange={e => setGlobalDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>Total Marks</label>
            <input type="number" value={globalTotalMarks} onChange={e => setGlobalTotalMarks(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
          </div>
          <div>
             <button
                onClick={handleSaveBulkMarks}
                disabled={isSavingBulk || Object.keys(bulkMarks).length === 0}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: (isSavingBulk || Object.keys(bulkMarks).length === 0) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  background: (isSavingBulk || Object.keys(bulkMarks).length === 0) ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSavingBulk ? 'Saving...' : '💾 Save All Marks'}
              </button>
          </div>
        </div>
      </div>

      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Roll No</th>
              <th style={{ padding: '14px 16px' }}>Name</th>
              {!isTeacher && <th style={{ padding: '14px 16px' }}>Class</th>}
              {!isTeacher && <th style={{ padding: '14px 16px' }}>Section</th>}
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Parent Contact</th>
              <th style={{ padding: '14px 16px' }}>Marks Recorded</th>
              <th style={{ padding: '14px 16px', background: 'rgba(16, 185, 129, 0.05)', color: '#059669' }}>Obtained Marks</th>
              <th style={{ padding: '14px 16px' }}>Past Marks</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={isTeacher ? 5 : 7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                    {!isTeacher && <td style={{ padding: '12px 16px' }}>{student.grade}</td>}
                    {!isTeacher && <td style={{ padding: '12px 16px' }}>{student.section}</td>}
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
                    <td style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Score"
                          value={bulkMarks[student._id] || ''}
                          onChange={e => handleBulkMarkChange(student._id, e.target.value)}
                          style={{ ...inputStyle, width: '90px', borderColor: bulkMarks[student._id] ? '#10b981' : 'var(--glass-border)' }}
                        />
                        <button
                          onClick={() => handleBulkMarkChange(student._id, 'A')}
                          style={{
                            padding: '4px 8px',
                            background: bulkMarks[student._id] === 'A' || bulkMarks[student._id] === 'Absent' ? '#ef4444' : '#fee2e2',
                            color: bulkMarks[student._id] === 'A' || bulkMarks[student._id] === 'Absent' ? '#fff' : '#ef4444',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                          }}
                          title="Mark Absent"
                        >
                          A
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEditMarks(student)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            background: 'var(--surface-color)',
                            color: 'var(--text-color)',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Past Marks
                        </button>
                        <a
                          href={`/api/classpaper/student-pdf/${student._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            background: 'rgba(59, 130, 246, 0.05)',
                            color: '#2563eb',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📥 Download
                        </a>
                      </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr auto', gap: '10px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <div>Subject</div>
                  <div>Date</div>
                  <div>Total Marks</div>
                  <div>Obtained</div>
                  <div></div>
                </div>
                {editingMarks.map((mark, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={mark.subject}
                      onChange={e => handleMarkChange(index, 'subject', e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="date"
                      value={mark.date || ''}
                      onChange={e => handleMarkChange(index, 'date', e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={mark.totalNumber}
                      onChange={e => handleMarkChange(index, 'totalNumber', e.target.value)}
                      style={inputStyle}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="e.g. 85"
                        value={mark.subjectPaperNumber}
                        onChange={e => handleMarkChange(index, 'subjectPaperNumber', e.target.value)}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => handleMarkChange(index, 'subjectPaperNumber', 'A')}
                        style={{
                          padding: '6px 10px',
                          background: mark.subjectPaperNumber === 'A' || mark.subjectPaperNumber === 'Absent' ? '#ef4444' : '#fee2e2',
                          color: mark.subjectPaperNumber === 'A' || mark.subjectPaperNumber === 'Absent' ? '#fff' : '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        title="Mark Absent"
                      >
                        A
                      </button>
                    </div>
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
                onChange={e => setMessageType(e.target.value as 'SMS' | 'WhatsApp')}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="SMS">SMS</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem', padding: '10px', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>Note:</strong> Messages will be automatically generated with the student's name, subjects, and marks obtained.
            </div>

            {sendResult && (
              <div style={{
                padding: '10px', marginBottom: '1rem', borderRadius: '8px',
                background: sendResult.success > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: sendResult.success > 0 ? '#16a34a' : '#ef4444', 
                fontWeight: 500,
              }}>
                {sendResult.success > 0 ? '✅' : '⚠️'} Sent {sendResult.success} of {sendResult.total} messages. {sendResult.success === 0 && 'Check Notifications page for errors.'}
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

export default function ClassPaperPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <ClassPaperContent />
    </Suspense>
  );
}
