'use client';
import { useState, useEffect } from 'react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    grade: '',
    section: '',
    schoolName: '',
    aadhaarNumber: '',
    qualification: '',
    subject: '',
    post: '',
    monthlySalary: '',
    password: ''
  });
  const [userRole, setUserRole] = useState('admin');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { 
        if (data?.schoolName) setSchoolName(data.schoolName);
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => { });
  }, []);

  const handleOpenAddForm = () => {
    if (showAddForm && !editingTeacherId) {
      setShowAddForm(false);
    } else {
      setNewTeacher({ name: '', email: '', phone: '', grade: '', section: '', schoolName: '', aadhaarNumber: '', qualification: '', subject: '', post: '', monthlySalary: '', password: '' });
      setEditingTeacherId(null);
      setShowAddForm(true);
    }
  };

  const handleEditClick = (teacher: any) => {
    setNewTeacher({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      grade: teacher.grade,
      section: teacher.section,
      schoolName: teacher.schoolName || '',
      aadhaarNumber: teacher.aadhaarNumber || '',
      qualification: teacher.qualification || '',
      subject: teacher.subject || '',
      post: teacher.post || '',
      monthlySalary: teacher.monthlySalary != null ? String(teacher.monthlySalary) : '',
      password: ''
    });
    setEditingTeacherId(teacher._id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete teacher "${name}"?`)) {
      try {
        const res = await fetch(`/api/teachers/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchTeachers();
        } else {
          const errData = await res.json();
          alert(`Error deleting teacher: ${errData.message}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingTeacherId ? `/api/teachers/${editingTeacherId}` : '/api/teachers';
    const method = editingTeacherId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: JSON.stringify(newTeacher),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setNewTeacher({ name: '', email: '', phone: '', grade: '', section: '', schoolName: '', aadhaarNumber: '', qualification: '', subject: '', post: '', monthlySalary: '', password: '' });
        setEditingTeacherId(null);
        setShowAddForm(false);
        fetchTeachers();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingTeacherId(null);
    setNewTeacher({ name: '', email: '', phone: '', grade: '', section: '', schoolName: '', aadhaarNumber: '', qualification: '', subject: '', post: '', monthlySalary: '', password: '' });
  };

  if (!isMounted) return null;
  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMonthlySalary = teachers.reduce((sum, t) => sum + (Number(t.monthlySalary) || 0), 0);
  const teachersWithSalary = teachers.filter(t => Number(t.monthlySalary) > 0).length;

  return (
    <div>

      <div className='teacher page-header'>
        <div>
          <h1 className="page-title">Teachers Directory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage teachers, contact details, and class assignments.</p>
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
          <a href="/api/teachers/pdf" target="_blank" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              Download PDF
            </button>
          </a>
          {userRole === 'admin' && (
            <button className="btn-primary" onClick={handleOpenAddForm}>
              {showAddForm && !editingTeacherId ? 'Cancel' : '+ Add New Teacher'}
            </button>
          )}
        </div>
      </div>

      {userRole === 'admin' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {/* Total Monthly Salary */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,179,8,0.08))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
            }}>
              💰
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Total Monthly Salary
              </p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0', color: '#f59e0b', lineHeight: 1.1 }}>
                ₹{totalMonthlySalary.toLocaleString('en-IN')}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {teachersWithSalary} of {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
          </div>

          {/* Total Teachers */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>
              👨‍🏫
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Total Teachers
              </p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--primary)', lineHeight: 1.1 }}>
                {teachers.length}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Avg. ₹{teachers.length > 0 ? Math.round(totalMonthlySalary / teachers.length).toLocaleString('en-IN') : 0} / teacher
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or email"
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}>
                {editingTeacherId ? '✏️' : '👨‍🏫'}
              </div>
              <h2 style={{
                fontSize: '1.25rem',
                color: 'var(--primary)',
              }}>
                {editingTeacherId ? 'Edit Teacher Details' : 'Record New Teacher'}
              </h2>
            </div>
            {editingTeacherId && (
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

          <form onSubmit={handleSubmit} className="responsive-grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Full Name</label>
              <input type="text" placeholder="Teacher Name" value={newTeacher.name} onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Email ID</label>
              <input type="email" placeholder="www@eschool.com" value={newTeacher.email} onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Phone Number</label>
              <input type="text" placeholder="+1 234 567 890" value={newTeacher.phone} onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Assigned Class</label>
              <input type="text" placeholder="e.g. 10th" value={newTeacher.grade} onChange={e => setNewTeacher({ ...newTeacher, grade: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Section</label>
              <input type="text" placeholder="e.g. A" value={newTeacher.section} onChange={e => setNewTeacher({ ...newTeacher, section: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>School Name</label>
              <input type="text" placeholder="E.g. Springfield Elementary" value={newTeacher.schoolName} onChange={e => setNewTeacher({ ...newTeacher, schoolName: e.target.value })} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Aadhaar Number</label>
              <input type="text" placeholder="1234-5678-9012" value={newTeacher.aadhaarNumber} onChange={e => setNewTeacher({ ...newTeacher, aadhaarNumber: e.target.value })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Qualification</label>
              <input type="text" placeholder="M.Sc., B.Ed." value={newTeacher.qualification} onChange={e => setNewTeacher({ ...newTeacher, qualification: e.target.value })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Subject</label>
              {(() => {
                const seniorClasses = ['11', '12', '11th', '12th', 'xi', 'xii', 'class 11', 'class 12'];
                const isSenior = seniorClasses.some(c => newTeacher.grade.trim().toLowerCase().includes(c));

                const subjectOptions = isSenior
                  ? [
                    '── Science Stream ──',
                    'Physics',
                    'Chemistry',
                    'Biology',
                    'Mathematics',
                    'Computer Science',
                    'Informatics Practices',
                    '── Commerce Stream ──',
                    'Accountancy',
                    'Business Studies',
                    'Economics',
                    'Mathematics',
                    'Entrepreneurship',
                    '── Arts / Humanities Stream ──',
                    'Geography',
                    'History',
                    'Political Science',
                    'Geography',
                    'Sociology',
                    'Psychology',
                    'Philosophy',
                    'Fine Arts',
                    'Home Science',
                    '── Common / Language ──',
                    'English',
                    'Hindi',
                    'Sanskrit',
                    'Physical Education',
                    'Other',
                  ]
                  : [
                    'English',
                    'Hindi',
                    'Sanskrit',
                    'Mathematics',
                    'Science',
                    'Social Science',
                    'Computer Science',
                    'Physical Education',
                    'Art & Craft',
                    'Music',
                    'Moral Science',
                    'Other',
                  ];

                const isGroupHeader = (opt: string) => opt.startsWith('──');

                return (
                  <>
                    <select
                      value={isGroupHeader(newTeacher.subject) ? '' : newTeacher.subject}
                      onChange={e => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        color: 'var(--text)',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— Select Subject —</option>
                      {subjectOptions.map((opt, i) =>
                        isGroupHeader(opt) ? (
                          <option key={i} disabled style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {opt}
                          </option>
                        ) : (
                          <option key={i} value={opt}>{opt}</option>
                        )
                      )}
                    </select>
                    {newTeacher.subject === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter subject name"
                        onChange={e => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                        style={{ marginTop: '6px' }}
                        autoFocus
                      />
                    )}
                  </>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Post / Designation</label>
              <select
                value={newTeacher.post}
                onChange={e => setNewTeacher({ ...newTeacher, post: e.target.value })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--glass-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">— Select Post —</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Senior Teacher">Senior Teacher</option>
                <option value="PGT">PGT (Post Graduate Teacher)</option>
                <option value="TGT">TGT (Trained Graduate Teacher)</option>
                <option value="PRT">PRT (Primary Teacher)</option>
                <option value="Assistant Teacher">Assistant Teacher</option>
                <option value="Guest Teacher">Guest Teacher</option>
                <option value="Librarian">Librarian</option>
                <option value="Lab Assistant">Lab Assistant</option>
                <option value="Physical Education Teacher">Physical Education Teacher</option>
                <option value="Vice Principal">Vice Principal</option>
                <option value="Principal">Principal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Monthly Salary (₹)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                min="0"
                value={newTeacher.monthlySalary}
                onChange={e => setNewTeacher({ ...newTeacher, monthlySalary: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Password {editingTeacherId && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Leave blank to keep unchanged)</span>}</label>
              <input type="password" placeholder={editingTeacherId ? "Enter new password" : "Set teacher password"} value={newTeacher.password || ''} onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })} required={!editingTeacherId} />
            </div>

            <button
              type="submit"
              className="btn-primary form-full-width"
            >
              {editingTeacherId ? 'Save Changes' : 'Save Teacher'}
            </button>
          </form>
        </div>
      )}

      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '16px' }}>Name</th>
              <th style={{ padding: '16px' }}>Phone</th>
              <th style={{ padding: '16px' }}>Class/Sec</th>
              <th style={{ padding: '16px' }}>Subject</th>
              <th style={{ padding: '16px' }}>Post</th>
              <th style={{ padding: '16px' }}>Salary (₹)</th>
              <th style={{ padding: '16px' }}>Qual.</th>
              <th style={{ padding: '16px' }}>Aadhaar</th>
              {userRole === 'admin' && (
                <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'admin' ? 9 : 8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No teachers found. Add your first teacher!</td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <tr key={teacher._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{teacher.name}</td>
                  <td style={{ padding: '16px' }}>{teacher.phone}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: 'var(--primary)',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}>
                      {teacher.grade} - {teacher.section}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>{teacher.subject || '—'}</td>
                  <td style={{ padding: '16px' }}>
                    {teacher.post ? (
                      <span style={{
                        background: 'rgba(16,185,129,0.1)',
                        color: '#10b981',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>{teacher.post}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {teacher.monthlySalary ? (
                      <span style={{
                        background: 'rgba(245,158,11,0.1)',
                        color: '#f59e0b',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}>₹{Number(teacher.monthlySalary).toLocaleString('en-IN')}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{teacher.qualification || '—'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{teacher.aadhaarNumber || '—'}</td>
                  {userRole === 'admin' && (
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEditClick(teacher)}
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
                        onClick={() => handleDeleteClick(teacher._id, teacher.name)}
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
                    </td>
                  )}
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
