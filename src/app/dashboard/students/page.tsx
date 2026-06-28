'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'add' | 'edit' | 'changeClass'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [newStudent, setNewStudent] = useState({
    name: '',
    fatherName: '',
    rollNumber: '',
    grade: '',
    section: '',
    parentContact: ''
  });
  const [isMounted, setIsMounted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const res = await fetch('/api/students');
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
  };

  const handleOpenAddForm = () => {
    if (showAddForm && editMode === 'add') {
      setShowAddForm(false);
      setFormError(null);
    } else {
      setNewStudent({ name: '', fatherName: '', rollNumber: '', grade: '', section: '', parentContact: '' });
      setEditingStudentId(null);
      setEditMode('add');
      setFormError(null);
      setShowAddForm(true);
    }
  };

  const handleEditClick = (student: any) => {
    setNewStudent({
      name: student.name,
      fatherName: student.fatherName,
      rollNumber: student.rollNumber,
      grade: student.grade,
      section: student.section,
      parentContact: student.parentContact || ''
    });
    setEditingStudentId(student._id);
    setEditMode('edit');
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeClassClick = (student: any) => {
    setNewStudent({
      name: student.name,
      fatherName: student.fatherName,
      rollNumber: student.rollNumber,
      grade: student.grade,
      section: student.section,
      parentContact: student.parentContact || ''
    });
    setEditingStudentId(student._id);
    setEditMode('changeClass');
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete student "${name}"? This will also delete all their attendance and fee records.`)) {
      try {
        const res = await fetch(`/api/students/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchStudents();
        } else {
          const errData = await res.json();
          alert(`Error deleting student: ${errData.message}`);
        }
      } catch (err) {
      }
    }
  };
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.schoolName) setSchoolName(data.schoolName); })
      .catch(() => {});
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingStudentId ? `/api/students/${editingStudentId}` : '/api/students';
    const method = editingStudentId ? 'PUT' : 'POST';

    // For change class mode, only send grade and section
    const payload = editMode === 'changeClass'
      ? { grade: newStudent.grade, section: newStudent.section }
      : newStudent;

    setFormError(null);
    try {
      const res = await fetch(url, {
        method,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setNewStudent({ name: '', fatherName: '', rollNumber: '', grade: '', section: '', parentContact: '' });
        setEditingStudentId(null);
        setEditMode('add');
        setFormError(null);
        setShowAddForm(false);
        fetchStudents();
      } else {
        const errData = await res.json();
        setFormError(errData.message || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      setFormError(`Network error: ${err.message}`);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingStudentId(null);
    setEditMode('add');
    setFormError(null);
    setNewStudent({ name: '', fatherName: '', rollNumber: '', grade: '', section: '', parentContact: '' });
  };

  const getFormTitle = () => {
    if (editMode === 'changeClass') return 'Change Class / Section';
    if (editMode === 'edit') return 'Edit Student Details';
    return 'Add New Student';
  };

  if (!isMounted) return null;
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.fatherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students Directory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage student information and profile.</p>
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
          <a href="/api/students/pdf" target="_blank" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              Download PDF
            </button>
          </a>
          <button className="btn-primary" onClick={handleOpenAddForm}>
            {showAddForm && editMode === 'add' ? 'Cancel' : '+ Add New Student'}
          </button>
        </div>
      </div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          }}
        />
      </div>

      {showAddForm && (
        <div className="glass card" style={{ marginBottom: '2rem', animation: 'slideDown 0.3s ease' }}>
          {/* Form Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: editMode === 'changeClass'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}>
                {editMode === 'edit' ? '✏️' : '➕'}
              </div>
              <h2 style={{
                fontSize: '1.25rem',
                color: editMode === 'changeClass' ? '#f59e0b' : 'var(--primary)',
              }}>
                {getFormTitle()}
              </h2>
            </div>
            {(editMode === 'edit' || editMode === 'changeClass') && (
              <button
                onClick={handleCancelForm}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>

          {/* Change Class Info Banner */}
          {editMode === 'changeClass' && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <div>
                <strong>{newStudent.name}</strong> (Roll: <strong>{newStudent.rollNumber}</strong>) 02
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="responsive-grid-2">
            {/* Name - hidden in changeClass mode */}
            {editMode !== 'changeClass' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Full Name</label>
                <input type="text" placeholder="Full Name" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} required />
              </div>
            )}

            {editMode !== 'changeClass' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Father Name</label>
                <input type="text" placeholder="Fathe Name" value={newStudent.fatherName} onChange={e => setNewStudent({ ...newStudent, fatherName: e.target.value })} required />
              </div>
            )}

            {/* Roll Number - hidden in changeClass, read-only in edit */}
            {editMode !== 'changeClass' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Roll Number
                  {editMode === 'edit' && (
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      🔒 Locked
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. R001"
                  value={newStudent.rollNumber}
                  onChange={e => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  required
                  readOnly={editMode === 'edit'}
                  style={{
                    ...(editMode === 'edit' ? {
                      opacity: 0.6,
                      cursor: 'not-allowed',
                      background: 'rgba(0,0,0,0.03)',
                    } : {})
                  }}
                />
              </div>
            )}

            {/* Grade / Class */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Class
                {editMode === 'changeClass' && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#d97706',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}>
                    ✎ Editable
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="e.g. 10th"
                value={newStudent.grade}
                onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}
                required
                style={{
                  ...(editMode === 'changeClass' ? {
                    borderColor: '#f59e0b',
                    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.15)',
                  } : {})
                }}
              />
            </div>

            {/* Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Section
                {editMode === 'changeClass' && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#d97706',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}>
                    ✎ Editable
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="e.g. A"
                value={newStudent.section}
                onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                required
                style={{
                  ...(editMode === 'changeClass' ? {
                    borderColor: '#f59e0b',
                    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.15)',
                  } : {})
                }}
              />
            </div>


            {/* Parent Contact - hidden in changeClass mode */}
            {editMode !== 'changeClass' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                <label>Parent Contact</label>
                <input type="text" placeholder="+1 234 567 890" value={newStudent.parentContact} onChange={e => setNewStudent({ ...newStudent, parentContact: e.target.value })} />
              </div>
            )}

            {/* Inline error banner */}
            {formError && (
              <div
                style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1.3, flexShrink: 0 }}>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{
                gridColumn: 'span 2',
                ...(editMode === 'changeClass' ? {
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                } : {})
              }}
            >
              {editMode === 'edit' ? 'Save Changes' : 'Save Student'}
            </button>
          </form>
        </div>
      )}

      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '16px' }}>Name</th>
              <th style={{ padding: '16px' }}>fatherName</th>
              <th style={{ padding: '16px' }}>Roll No</th>
              <th style={{ padding: '16px' }}>Grade</th>
              <th style={{ padding: '16px' }}>Section</th>
              <th style={{ padding: '16px' }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No students found. Add your first student!</td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{student.name}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: "black" }}>{student.fatherName}</td>
                  <td style={{ padding: '16px' }}>
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
                  <td style={{ padding: '16px' }}>{student.grade}</td>
                  <td style={{ padding: '16px' }}>{student.section}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{student.parentContact || 'N/A'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleChangeClassClick(student)}
                      title="Change class/section"
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#d97706',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginRight: '6px',
                        fontWeight: 500,
                      }}
                    >
                    </button>
                    <button
                      onClick={() => handleEditClick(student)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginRight: '6px'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(student._id, student.name)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Delete
                    </button>
                    <Link href={`/api/students/${student._id}/pdf`} target="_blank" rel="noopener noreferrer">
                      <button style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginLeft: '6px',
                        fontWeight: 500,
                      }}>
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
