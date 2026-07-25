'use client';

import { last } from 'pdf-lib';
import { useState, useEffect } from 'react';

export default function FeesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [vehicleFees, setVehicleFees] = useState<any[]>([]);
  const [classFees, setClassFees] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [userRole, setUserRole] = useState<string>('admin');

  const [newFee, setNewFee] = useState({
    studentId: '',
    amount: '',
    utr: '',
    month: '',
    lastyear: '',
    lasyearamount: '',
    status: 'Pending',
    description: '',
    paidDate: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notifyFee, setNotifyFee] = useState<any>(null);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [notifyType, setNotifyType] = useState<'SMS' | 'WhatsApp' | 'Both'>('Both');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);

  // Derived: teacher users can only view records, not add/edit/reprint
  const isTeacher = userRole === 'teacher';


  useEffect(() => {
    setIsMounted(true);
    setNewFee(prev => ({
      ...prev,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    }));
    fetchData();
    // Fetch school name and role from profile
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.schoolName) setSchoolName(data.schoolName);
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => { });
  }, []);


  const fetchData = async () => {
    const [studentsRes, feesRes, classFeesRes, vehicleFeesRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/fees'),
      fetch('/api/class-fees'),
      fetch('/api/vehicle-fees'),
    ]);
    const studentsData = await studentsRes.json();
    const feesData = await feesRes.json();
    const classFeesData = classFeesRes.ok ? await classFeesRes.json() : [];
    const vehicleFeesData = vehicleFeesRes.ok ? await vehicleFeesRes.json() : [];
    setStudents(Array.isArray(studentsData) ? studentsData.filter(Boolean) : []);
    setFees(Array.isArray(feesData) ? feesData.filter(Boolean) : []);
    setClassFees(Array.isArray(classFeesData) ? classFeesData.filter(Boolean) : []);
    setVehicleFees(Array.isArray(vehicleFeesData) ? vehicleFeesData.filter(Boolean) : []);
  };

  const handleCheckboxChange = (feeId: string, checked: boolean) => {
    if (checked) {
      if (selectedIds.length >= 4) {
        alert('You can select a maximum of 4 students to fit onto one A4 receipt page.');
        return;
      }
      setSelectedIds([...selectedIds, feeId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== feeId));
    }
  };


  // Normalize grade for comparison: strips "Class " prefix, ordinals, and extra whitespace.
  // e.g. "Class 5", "class 5", "5", "5th" all normalize to "5"
  const normalizeGrade = (g: string) =>
    g.trim().toLowerCase().replace(/^class\s+/i, '').replace(/(th|st|nd|rd)$/i, '').trim();

  // Find the best matching class fee for a student.
  // Prefers grade + subject match; falls back to grade-only (general entry).
  const findClassFee = (student: any) => {
    if (!student?.grade) return null;
    const grade = normalizeGrade(student.grade);
    const subject = (student.subject || '').trim().toLowerCase();
    // exact match (grade + subject)
    let match = classFees.find(
      cf => normalizeGrade(cf.grade) === grade &&
        (cf.subject || '').trim().toLowerCase() === subject
    );
    // fallback: grade only (general entry with no subject)
    if (!match) {
      match = classFees.find(
        cf => normalizeGrade(cf.grade) === grade &&
          (cf.subject || '') === ''
      );
    }
    // fallback 2: first matching grade fee (e.g. if student subject is empty/unspecified, but a subject-specific fee exists)
    if (!match) {
      match = classFees.find(
        cf => normalizeGrade(cf.grade) === grade
      );
    }
    return match || null;
  };

  // Merge tuition + vehicle fees, tag each with a feeType for display
  const allFees = [
    ...fees.map(f => ({ ...f, feeType: 'School Fee' })),
    ...vehicleFees.map(f => ({ ...f, feeType: 'Vehicle Fee' })),
  ].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const filteredFees = allFees.filter(f => {
    if (!f) return false;
    const stName = typeof f.studentId === 'string'
      ? students.find(s => s && s._id === f.studentId)?.name
      : f.studentId?.name;
    const search = searchTerm.toLowerCase();
    return (stName || '').toLowerCase().includes(search) ||
      (f.month || '').toLowerCase().includes(search) ||
      (f.feeType || '').toLowerCase().includes(search);
  });

  // ── Daily totals (fees recorded/paid today) ──────────────────────────────
  const todayStr = new Date().toLocaleDateString();
  const todayFees = allFees.filter(f => {
    const d = f.paidDate ? new Date(f.paidDate) : f.createdAt ? new Date(f.createdAt) : null;
    return d && d.toLocaleDateString() === todayStr;
  });
  const todaySchoolTotal = todayFees.filter(f => f.feeType === 'School Fee').reduce((s, f) => s + Number(f.amount || 0), 0);
  const todayVehicleTotal = todayFees.filter(f => f.feeType === 'Vehicle Fee').reduce((s, f) => s + Number(f.amount || 0), 0);
  const todayGrandTotal = todaySchoolTotal + todayVehicleTotal;

  const handleOpenAddForm = () => {
    setNewFee({
      studentId: '',
      amount: '',
      utr: '',
      lastyear: '',
      lasyearamount: '',
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      status: 'Paid',
      description: '',
      paidDate: new Date().toISOString().split('T')[0]
    });
    setEditingFeeId(null);
    setShowAddForm(!showAddForm);
  };

  const handleEditClick = (fee: any) => {
    setNewFee({
      studentId: fee.studentId?._id || fee.studentId || '',
      amount: fee.amount.toString(),
      month: fee.month,
      utr: fee.utr,
      lastyear: fee.lastyear,
      lasyearamount: (fee.lasyearamount != null && fee.lasyearamount !== '') ? fee.lasyearamount.toString() : (fee.lastyearamount || ''),
      status: fee.status,
      description: fee.description || '',
      paidDate: fee.paidDate ? new Date(fee.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setEditingFeeId(fee._id);
    setShowAddForm(true);
    // Smooth scroll to top/form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!newFee.studentId) {
      alert('Please select a student.');
      return;
    }
    const parsedAmount = Number(newFee.amount || 0);
    const parsedLastYearAmount = Number(newFee.lasyearamount || 0);
    if (isNaN(parsedAmount) || parsedAmount < 0 || isNaN(parsedLastYearAmount) || parsedLastYearAmount < 0) {
      alert('Please enter valid, non-negative amounts.');
      return;
    }
    if (parsedAmount === 0 && parsedLastYearAmount === 0) {
      alert('Please enter a valid amount or last year fees amount greater than 0.');
      return;
    }
    if (!newFee.month) {
      alert('Please enter a month.');
      return;
    }

    const url = editingFeeId ? `/api/fees/${editingFeeId}` : '/api/fees';
    const method = editingFeeId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: JSON.stringify({ ...newFee, amount: parsedAmount }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setNewFee({
          studentId: '',
          amount: '',
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          status: 'Pending',
          utr: '',
          lastyear: '',
          lasyearamount: '',
          description: '',
          paidDate: new Date().toISOString().split('T')[0]
        });
        setEditingFeeId(null);
        setShowAddForm(true);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({ message: 'Unknown error' }));
        alert(`Error (${method} ${url} → ${res.status}): ${errData.message}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  if (!isMounted) return null;

  {
    notifyFee && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setNotifyFee(null); }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.3rem' }}>💬 Send Fee Alert</h2>
            <button onClick={() => setNotifyFee(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Channel</label>
            <select value={notifyType} onChange={e => setNotifyType(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)' }}>
              <option value="Both">📱🟢 SMS + WhatsApp</option>
              <option value="SMS">📱 SMS Only</option>
              <option value="WhatsApp">🟢 WhatsApp Only</option>
            </select>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message Preview</label>
            <textarea rows={4} value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--foreground)', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          {notifyResult && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: notifyResult?.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: notifyResult?.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.88rem', marginBottom: '14px' }}>
              {notifyResult?.success ? '✅' : '⚠️'} {notifyResult?.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setNotifyFee(null)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button
              disabled={notifySending || !notifyMsg.trim()}
              onClick={async () => {
                const studentId = typeof notifyFee.studentId === 'string' ? notifyFee.studentId : notifyFee.studentId?._id;
                if (!studentId) return;
                setNotifySending(true);
                setNotifyResult(null);
                try {
                  const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, type: notifyType, category: 'Fee', message: notifyMsg }) });
                  const data = await res.json();
                  setNotifyResult({ success: res.ok, message: res.ok ? 'Alert sent successfully!' : data.message || 'Failed.' });
                } catch (err: any) { setNotifyResult({ success: false, message: err.message }); }
                finally { setNotifySending(false); }
              }}
              style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, cursor: notifySending ? 'not-allowed' : 'pointer', opacity: notifySending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {notifySending ? '⏳ Sending…' : '📤 Send Alert'}
            </button>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor and record student fee payments.</p>
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
          {!isTeacher && selectedIds.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1.5px solid rgba(239, 68, 68, 0.2)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              Clear Selection ({selectedIds.length})
            </button>
          )}

          {/* Download/Print Button */}
          {selectedIds.length >= 2 && selectedIds.length <= 4 ? (
            <a
              href={`/api/fees/pdf?ids=${selectedIds.join(',')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              id="print-receipts-btn"
            >
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                🖨️ Print
              </button>
            </a>
          ) : (
            <a
              href="/api/fees/pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                ⬇️ Download Fees List
              </button>
            </a>
          )}
          {/* Add Record: hidden for teachers */}
          {!isTeacher && (
            <button className="btn-primary" onClick={handleOpenAddForm}>
              {showAddForm && !editingFeeId ? 'Cancel' : showAddForm && editingFeeId ? 'Cancel Edit' : '+ Record Payment'}
            </button>
          )}
        </div>
      </div>

      {/* ── Daily Summary Stat Cards ──────────────────────────────────── */}
      {!isTeacher && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.09), rgba(139,92,246,0.07))', border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>🏫 Today School Fees</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1', lineHeight: 1.1 }}>₹{todaySchoolTotal.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{todayFees.filter((f: any) => f.feeType === 'School Fee').length} records</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.07))', border: '1.5px solid rgba(16,185,129,0.22)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>💰 Today Grand Total</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>₹{todayGrandTotal.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{todayFees.length} total records today</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.07), rgba(220,38,38,0.06))', border: '1.5px solid rgba(239,68,68,0.17)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>📋 All-Time Collected</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>₹{allFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{allFees.length} total records</div>
          </div>
        </div>
      )}

      {/* ── Daily Total Modal ─────────────────────────────────────────── */}
      {showDailyModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDailyModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: 'var(--glass-bg, #fff)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border, #e5e7eb)', borderRadius: '24px', padding: '32px', maxWidth: '580px', width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📊 Daily Fee Summary</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowDailyModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: '4px' }}>✕</button>
            </div>

            {/* Summary Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderRadius: '12px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <span style={{ fontWeight: 600, color: '#6366f1' }}>🏫 School Fees Collected</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#6366f1' }}>₹{todaySchoolTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderRadius: '12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <span style={{ fontWeight: 600, color: '#d97706' }}>🚍 Transport Fees Collected</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#d97706' }}>₹{todayVehicleTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.08))', border: '1.5px solid rgba(16,185,129,0.28)' }}>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: '1.05rem' }}>💰 Grand Total Today</span>
                <span style={{ fontWeight: 900, fontSize: '1.45rem', color: '#059669' }}>₹{todayGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Today's Records Table */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Today's Records ({todayFees.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {todayFees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border, #e5e7eb)' }}>
                    No fees recorded today yet.
                  </div>
                ) : todayFees.map((f: any) => {
                  const sName = typeof f.studentId === 'string'
                    ? (students.find((s: any) => s._id === f.studentId)?.name ?? 'Unknown')
                    : (f.studentId?.name ?? 'Unknown');
                  const isVehicle = f.feeType === 'Vehicle Fee';
                  return (
                    <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 15px', borderRadius: '10px', background: isVehicle ? 'rgba(245,158,11,0.05)' : 'rgba(99,102,241,0.05)', border: `1px solid ${isVehicle ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)'}` }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sName}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {isVehicle ? '🚍' : '🏫'} {f.feeType} &nbsp;•&nbsp; {f.month}
                          {f.utr ? <span> &nbsp;•&nbsp; UTR: {f.utr}</span> : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isVehicle ? '#d97706' : '#6366f1' }}>₹{Number(f.amount || 0).toLocaleString()}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: '999px', fontWeight: 700, background: f.status === 'Paid' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.14)', color: f.status === 'Paid' ? '#059669' : '#d97706', whiteSpace: 'nowrap' }}>{f.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Download All Button */}
            <a href="/api/fees/pdf" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99,102,241,0.28)' }}>
                ⬇️ Download All Fees Data (PDF)
              </button>
            </a>
          </div>
        </div>
      )}

      {showAddForm && !isTeacher && (
        <div className="glass card" style={{ marginBottom: '2rem' }}>
          {/* School Name Banner */}
          {schoolName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              marginBottom: '1.5rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <span style={{ fontSize: '1.3rem' }}>🏫</span>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>School</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{schoolName}</div>
              </div>
            </div>
          )}
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--primary)' }}>
            {editingFeeId ? 'Edit Fee Record' : 'Record New Payment'}
          </h2>
          <form onSubmit={handleSubmit} className="responsive-grid-2">
            {/* School Name Input */}
            <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏫 School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="School name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.05)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.98rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Select Student</label>
              <select
                value={newFee.studentId}
                onChange={e => {
                  const sId = e.target.value;
                  const student = students.find(s => s._id === sId);
                  const cFee = student ? findClassFee(student) : null;
                  const defaultAmount = student && student.lastFeesAmount > 0
                    ? '0'
                    : (student?.schoolFees ? String(student.schoolFees) : (cFee?.amount != null ? String(cFee.amount) : ''));
                  const defaultLastYear = student?.lastFeesAmount ? String(student.lastFeesAmount) : '';
                  setNewFee({
                    ...newFee,
                    studentId: sId,
                    amount: defaultAmount,
                    lastyear: defaultLastYear,
                    lasyearamount: defaultLastYear
                  });
                }}
                required
              >
                <option value="">Choose a student...</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.fatherName && `(${s.fatherName})`} - ({s.rollNumber}) — {s.grade}{s.section ? `-${s.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {newFee.studentId && (() => {
              const student = students.find(s => s._id === newFee.studentId);
              if (!student?.grade) return null;
              const gradeNorm = normalizeGrade(student.grade);
              const matchingFees = classFees.filter(cf => normalizeGrade(cf.grade) === gradeNorm);
              if (matchingFees.length === 0) return (
                <div style={{
                  gridColumn: 'span 2',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#b45309',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>⚠️</span>
                  <span>No class fee configured for <strong>{student.grade}</strong>. Go to <strong>Class Fees</strong> to add one.</span>
                </div>
              );
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>Class Fee</label>
                  <select
                    onChange={e => setNewFee({ ...newFee, amount: e.target.value })}
                    style={{
                      borderColor: newFee.amount ? '#10b981' : undefined,
                      boxShadow: newFee.amount ? '0 0 0 2px rgba(16,185,129,0.15)' : undefined,
                    }}
                  >
                    <option value="">— Select fee type —</option>
                    {matchingFees.map(cf => (
                      <option key={cf._id} value={cf.amount.toString()}>
                        {cf.subject ? `${cf.subject} — ` : 'General — '}₹{cf.amount.toLocaleString()}
                        {cf.description ? ` (${cf.description})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={newFee.amount}
                onChange={e => setNewFee({ ...newFee, amount: e.target.value })}
                required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Month</label>
              <input type="text" value={newFee.month} onChange={e => setNewFee({ ...newFee, month: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>UTR <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span></label>
              <input type="text" placeholder="Enter UTR or 'N/A'" value={newFee.utr} onChange={e => setNewFee({ ...newFee, utr: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                Last year fee
                {(() => {
                  const student = students.find(s => s._id === newFee.studentId);
                  if (student && student.lastFeesAmount !== undefined) {
                    return (
                      <span style={{
                        fontSize: '0.8rem',
                        color: student.lastFeesAmount > 0 ? '#ef4444' : '#10b981',
                        fontWeight: 600,
                        background: student.lastFeesAmount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: student.lastFeesAmount > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)'
                      }}>
                        Last Year Amount: Rs. {student.lastFeesAmount}
                      </span>
                    );
                  }
                  return null;
                })()}
                {!!editingFeeId && (
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
                placeholder="lastyear amount"
                value={newFee.lastyear}
                onChange={e => setNewFee({ ...newFee, lastyear: e.target.value })}
                required
                readOnly={!!editingFeeId}
                style={{
                  ...(editingFeeId ? {
                    opacity: 0.6,
                    cursor: 'not-allowed',
                    background: 'rgba(0,0,0,0.03)',
                  } : {})
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Last year Fees Amount (₹)
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={newFee.lasyearamount}
                onChange={e => setNewFee({ ...newFee, lasyearamount: e.target.value })}
                required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Status</label>
              <select value={newFee.status} onChange={e => setNewFee({ ...newFee, status: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            {newFee.status === 'Paid' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Payment Date</label>
                <input
                  type="date"
                  value={newFee.paidDate}
                  onChange={e => setNewFee({ ...newFee, paidDate: e.target.value })}
                  required
                />
              </div>
            )}
            <button type="submit" className="btn-primary form-full-width">
              {editingFeeId ? 'Save Changes' : 'Record Transaction'}
            </button>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search by student name or month"
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
              {!isTeacher && <th style={{ padding: '16px', width: '60px', textAlign: 'center' }}>Select</th>}
              <th style={{ padding: '16px' }}>Student</th>
              <th style={{ padding: '16px' }}>Father Name</th>
              <th style={{ padding: '16px' }}>Type</th>
              <th style={{ padding: '16px' }}>For Month</th>
              <th style={{ padding: '16px' }}>Class Fee</th>
              <th style={{ padding: '16px' }}>Paid Amount</th>
              <th style={{ padding: '16px' }}>Balance</th>
              <th style={{ padding: '16px' }}>Utr</th>
              <th style={{ padding: '16px' }}>Last Year Fees</th>
              <th style={{ padding: '16px' }}>Last Year Fees Amount</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Date</th>
              {!isTeacher && <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredFees.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No fee records found.</td></tr>
            ) : (
              filteredFees.map((fee) => (
                <tr key={fee._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {!isTeacher && (
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(fee._id)}
                        disabled={!selectedIds.includes(fee._id) && selectedIds.length >= 4}
                        onChange={(e) => handleCheckboxChange(fee._id, e.target.checked)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </td>
                  )}
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{
                      typeof fee.studentId === 'string'
                        ? (students.find((s) => s._id === fee.studentId)?.name ?? 'Unknown')
                        : fee.studentId?.name ?? 'Unknown'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{
                      typeof fee.studentId === 'string'
                        ? (students.find((s) => s._id === fee.studentId)?.fatherName ?? '')
                        : fee.studentId?.fatherName ?? ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{
                      typeof fee.studentId === 'string'
                        ? (students.find((s) => s._id === fee.studentId)?.rollNumber ?? '')
                        : fee.studentId?.rollNumber ?? ''
                    }</div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7 }}>{(() => {
                      const st = typeof fee.studentId === 'string'
                        ? students.find(s => s._id === fee.studentId)
                        : fee.studentId;
                      if (!st?.grade) return '';
                      return `${st.grade}${st.section ? `-${st.section}` : ''}`;
                    })()}</div>
                  </td><td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {(() => {
                      const studentIdStr = typeof fee.studentId === 'string'
                        ? fee.studentId
                        : fee.studentId?._id;
                      const student = students.find(s => s._id === studentIdStr);
                      return student?.fatherName || fee.fatherName || "—";
                    })()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: fee.feeType === 'Vehicle Fee' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)',
                      color: fee.feeType === 'Vehicle Fee' ? '#b45309' : 'var(--primary)',
                    }}>
                      {fee.feeType === 'Vehicle Fee' ? '🚍' : '🏫'} {fee.feeType}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>{fee.month}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {(() => {
                      if (fee.feeType === 'Vehicle Fee') {
                        return fee.totalFees != null ? <span>₹{fee.totalFees}<span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.7 }}>Vehicle</span></span> : '—';
                      }
                      const studentIdStr = typeof fee.studentId === 'string'
                        ? fee.studentId
                        : fee.studentId?._id;
                      const student = students.find(s => s._id === studentIdStr);
                      const cFee = student ? findClassFee(student) : null;
                      const displayAmt = cFee?.amount ?? (fee.classFee != null && fee.classFee !== '' ? Number(fee.classFee) : null);

                      if (displayAmt == null) return '—';

                      return (
                        <span>
                          ₹{displayAmt}
                          {cFee?.subject && <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.7 }}>{cFee.subject}</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 700 }}>₹{fee.amount}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    {(() => {
                      let totalFee: number | null = null;
                      if (fee.feeType === 'Vehicle Fee') {
                        totalFee = fee.totalFees != null ? Number(fee.totalFees) : null;
                      } else {
                        if (fee.balance != null && fee.balance !== '' && fee.balance !== 0) {
                          const bal = Number(fee.balance);
                          return bal > 0
                            ? <span style={{ color: '#ef4444' }}>₹{bal}</span>
                            : <span style={{ color: '#10b981' }}>₹0</span>;
                        }

                        const studentIdStr = typeof fee.studentId === 'string'
                          ? fee.studentId
                          : fee.studentId?._id;
                        const student = students.find(s => s._id === studentIdStr);
                        const cFee = student ? findClassFee(student) : null;
                        totalFee = cFee?.amount ?? (fee.classFee != null && fee.classFee !== '' ? Number(fee.classFee) : null);
                      }

                      if (totalFee === null) return '—';
                      const balance = totalFee - Number(fee.amount);
                      return balance > 0
                        ? <span style={{ color: '#ef4444' }}>₹{balance}</span>
                        : <span style={{ color: '#10b981' }}>₹0</span>;
                    })()}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{fee.utr || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{fee.lastyear || fee.lastyeae || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    {fee.status === 'Paid'
                      ? (fee.lasyearamount || fee.lastyearamount || fee.lastyear || fee.lastyeae || '—')
                      : (fee.lasyearamount || fee.lastyearamount || '—')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${fee.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{fee.status}</span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : '—'}
                  </td>
                  {!isTeacher && (
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <a
                        href={`/api/fees/${fee._id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <button
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            marginRight: '8px',
                          }}
                        >
                          🖨️ Receipt
                        </button>
                      </a>
                      <button
                        onClick={() => {
                          setEditingFeeId(fee._id);
                          setNewFee({
                            studentId: typeof fee.studentId === 'string' ? fee.studentId : fee.studentId?._id || '',
                            amount: fee.amount.toString(),
                            month: fee.month,
                            utr: fee.utr,
                            lastyear: fee.lastyear || fee.lastyeae || '',
                            lasyearamount: (fee.lasyearamount != null && fee.lasyearamount !== '') ? fee.lasyearamount.toString() : (fee.lastyearamount || ''),
                            status: fee.status,
                            description: fee.description || '',
                            paidDate: fee.paidDate ? new Date(fee.paidDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                          });
                          setShowAddForm(true);
                        }}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
