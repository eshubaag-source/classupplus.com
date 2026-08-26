'use client';

import { useState, useEffect } from 'react';

export default function SalaryPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [month, setMonth] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  // State for recording/editing custom payment details
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null); 
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    status: 'Paid',
    paymentMode: 'Cash',
    paidDate: '',
    note: ''
  });

  useEffect(() => {
    setIsMounted(true);
    // Initialize to current month (YYYY-MM)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    setMonth(`${yyyy}-${mm}`);
    
    // Fetch profile for schoolName
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.schoolName) setSchoolName(data.schoolName);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (month) {
      fetchSalaries();
    }
  }, [month]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salary?month=${month}`);
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

  const handleQuickPay = async (teacher: any) => {
    const baseSalary = teacher.monthlySalary || 0;
    if (baseSalary <= 0) {
      alert('Please set a base monthly salary for this teacher in the Teachers Directory first.');
      return;
    }

    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher._id,
          amount: baseSalary,
          status: 'Paid',
          month,
          paymentMode: 'Cash',
          paidDate: new Date().toISOString().split('T')[0],
          note: 'Quick Pay (Base Salary)'
        })
      });

      if (res.ok) {
        fetchSalaries();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    }
  };

  const handleOpenPayForm = (teacher: any) => {
    const rec = teacher.salaryRecord;
    setSelectedTeacher(teacher);
    setPayForm({
      amount: rec?.amount !== undefined ? String(rec.amount) : String(teacher.monthlySalary || 0),
      status: rec?.status || 'Paid',
      paymentMode: rec?.paymentMode || 'Cash',
      paidDate: rec?.paidDate ? new Date(rec.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      note: rec?.note || ''
    });
    setShowPayForm(true);
  };

  const handleSavePayForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher._id,
          amount: Number(payForm.amount) || 0,
          status: payForm.status,
          month,
          paymentMode: payForm.paymentMode,
          paidDate: payForm.status === 'Paid' ? payForm.paidDate : undefined,
          note: payForm.note
        })
      });

      if (res.ok) {
        setShowPayForm(false);
        setSelectedTeacher(null);
        fetchSalaries();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save salary details');
    }
  };

  if (!isMounted) return null;

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.post?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Computations
  const totalPaid = teachers
    .filter(t => t.salaryRecord?.status === 'Paid')
    .reduce((sum, t) => sum + (Number(t.salaryRecord?.amount) || 0), 0);

  const totalPending = teachers
    .filter(t => t.salaryRecord?.status !== 'Paid')
    .reduce((sum, t) => sum + (Number(t.monthlySalary) || 0), 0);

  const paidCount = teachers.filter(t => t.salaryRecord?.status === 'Paid').length;

  // Format month for display e.g. July 2026
  const displayMonthStr = () => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
    return dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="teacher page-header">
        <div>
          <h1 className="page-title">Teacher Salary Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Pay and track teacher salaries month-wise.</p>
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
          {month && (
            <a href={`/api/salary/pdf?month=${month}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Download PDF
              </button>
            </a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Month:</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '8px' }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Paid Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
          border: '1px solid rgba(16,185,129,0.3)',
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
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
          }}>
            💵
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Paid ({displayMonthStr()})
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0', color: '#10b981', lineHeight: 1.1 }}>
              ₹{totalPaid.toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {paidCount} of {teachers.length} teachers paid
            </p>
          </div>
        </div>

        {/* Pending Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))',
          border: '1px solid rgba(239,68,68,0.3)',
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
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
          }}>
            ⌛
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Pending ({displayMonthStr()})
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0', color: '#ef4444', lineHeight: 1.1 }}>
              ₹{totalPending.toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {teachers.length - paidCount} teachers pending
            </p>
          </div>
        </div>

        {/* Total Teacher Base Card */}
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
            💼
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Total Monthly Budget
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--primary)', lineHeight: 1.1 }}>
              ₹{teachers.reduce((s, t) => s + (t.monthlySalary || 0), 0).toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              For all {teachers.length} registered teachers
            </p>
          </div>
        </div>
      </div>

      {/* Pay Details Form / Details Editor */}
      {showPayForm && selectedTeacher && (
        <div className="glass card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--primary)' }}>
            Record Salary Payment - {selectedTeacher.name}
          </h3>
          <form onSubmit={handleSavePayForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Base Salary (₹)</label>
              <input type="text" value={`₹${Number(selectedTeacher.monthlySalary || 0).toLocaleString('en-IN')}`} disabled style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Amount Paid (₹)</label>
              <input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                required
                placeholder="Enter paid amount"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Payment Status</label>
              <select
                value={payForm.status}
                onChange={e => setPayForm({ ...payForm, status: e.target.value })}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Payment Mode</label>
              <select
                value={payForm.paymentMode}
                onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}
                disabled={payForm.status !== 'Paid'}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {payForm.status === 'Paid' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Date Paid</label>
                <input
                  type="date"
                  value={payForm.paidDate}
                  onChange={e => setPayForm({ ...payForm, paidDate: e.target.value })}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 1' }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Note / Ref No.</label>
              <input
                type="text"
                placeholder="e.g. Bank ref #12345"
                value={payForm.note}
                onChange={e => setPayForm({ ...payForm, note: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
                Save Payment
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowPayForm(false);
                  setSelectedTeacher(null);
                }}
                style={{ padding: '10px 20px', border: '1px solid var(--glass-border)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Search by teacher name or designation..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            maxWidth: '450px',
          }}
        />
      </div>

      {/* Main Table */}
      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '16px' }}>Teacher</th>
              <th style={{ padding: '16px' }}>Post</th>
              <th style={{ padding: '16px' }}>Class/Sec</th>
              <th style={{ padding: '16px' }}>Base Salary</th>
              <th style={{ padding: '16px' }}>Paid Amount</th>
              <th style={{ padding: '16px' }}>Mode</th>
              <th style={{ padding: '16px' }}>Date Paid</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading teacher salary information...
                </td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No teachers found. Add teachers in the Teachers Directory first.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => {
                const rec = teacher.salaryRecord;
                const isPaid = rec?.status === 'Paid';

                return (
                  <tr key={teacher._id} style={{ borderBottom: '1px solid var(--glass-border)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{teacher.email}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {teacher.post ? (
                        <span style={{
                          background: 'rgba(16,185,129,0.1)',
                          color: '#10b981',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {teacher.post}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {teacher.grade ? `${teacher.grade} - ${teacher.section}` : '—'}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      ₹{Number(teacher.monthlySalary || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 600, color: isPaid ? '#10b981' : 'inherit' }}>
                      {isPaid ? `₹${Number(rec.amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                      {isPaid ? (
                        <span style={{
                          background: 'rgba(99,102,241,0.08)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {rec.paymentMode}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {isPaid && rec.paidDate ? new Date(rec.paidDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className={`badge ${isPaid ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-block', width: '80px', textAlign: 'center' }}>
                        {rec?.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {!isPaid && (
                          <button
                            onClick={() => handleQuickPay(teacher)}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            ⚡ Quick Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenPayForm(teacher)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--primary)',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isPaid ? '✏️ Edit' : '📝 Custom'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
