'use client';
import React, { useEffect, useState } from 'react';

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  fatherName?: string;
  lastFeesAmount?: number;
}

interface VehicleFee {
  _id: string;
  studentId?: string | { _id: string; name: string; rollNumber?: string };
  fatherName?: any;
  amount: number;
  month: string;
  status: string;
  city?: string;
  utr: string;
  lastyear: string;
  lasyearamount?: string | number;
  lastyearamount?: string | number;
  lastyeae?: string | number;
  busNumber?: string;
  totalFees?: number;
  description?: string;
  category?: string;
  paidDate?: string;
  createdAt?: string;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  city: string;
  totalFees: number;
  driverNumber?: string;
}

type NotifyResult = { success?: boolean; message?: string };

export default function VehicleFeesPage() {
  const [fees, setFees] = useState<VehicleFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [userRole, setUserRole] = useState<string>('admin');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notifyFee, setNotifyFee] = useState<any>(null);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [notifyType, setNotifyType] = useState<'SMS' | 'WhatsApp' | 'Both'>('Both');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<NotifyResult | null>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);

  // Derived: teacher users can only view records, not add/edit/reprint
  const isTeacher = userRole === 'teacher';

  // New state for adding fees
  const [newFee, setNewFee] = useState({
    studentId: '',
    fatherName: '',
    amount: '',
    month: '',
    status: 'Pending',
    city: '',
    utr: '',
    lastyear: '',
    lasyearamount: '',
    busNumber: '',
    totalFees: '',
    discount: '',
    description: '',
    paidDate: new Date().toISOString().split('T')[0]
  });
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch all required data on mount
  useEffect(() => {
    setNewFee(prev => ({
      ...prev,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      status: 'Paid',
      description: '',
      paidDate: new Date().toISOString().split('T')[0]
    }));
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, feesRes, vehiclesRes] = await Promise.all([
        fetch('/api/students', { headers: { 'Accept': 'application/json' } }),
        fetch('/api/vehicle-fees', { headers: { 'Accept': 'application/json' } }),
        fetch('/api/vehicles', { headers: { 'Accept': 'application/json' } })
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      const feesData = feesRes.ok ? await feesRes.json() : [];
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];

      setStudents(Array.isArray(studentsData) ? studentsData.filter(Boolean) : []);
      setFees(Array.isArray(feesData) ? feesData.filter(Boolean).filter((f: any) => f.category?.toLowerCase() === 'vehicle') : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  // ── Daily totals (vehicle fees recorded/paid today) ──────────────────────
  const todayStr = new Date().toLocaleDateString();
  const todayFees = fees.filter((f: any) => {
    const d = f.paidDate ? new Date(f.paidDate) : f.createdAt ? new Date(f.createdAt) : null;
    return d && d.toLocaleDateString() === todayStr;
  });
  const todayVehicleTotal = todayFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
  const allTimeTotal = fees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);


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


  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.schoolName) setSchoolName(data.schoolName);
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => { });
  }, []);


  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const payload = {
      studentId: newFee.studentId,
      fatherName: newFee.fatherName,
      amount: parsedAmount,
      month: newFee.month,
      city: newFee.city,
      utr: newFee.utr,
      lastyear: newFee.lastyear,
      lasyearamount: newFee.lasyearamount !== '' ? Number(newFee.lasyearamount) : undefined,
      busNumber: newFee.busNumber,
      totalFees: newFee.totalFees !== '' ? Number(newFee.totalFees) : undefined,
      discount: newFee.discount !== '' ? Number(newFee.discount) : 0,
      description: newFee.description,
      status: newFee.status,
      category: 'vehicle',
      paidDate: newFee.status === 'Paid' ? newFee.paidDate : undefined,
    };
    try {
      if (editingFeeId) {
        // Edit existing fee using query param id
        const res = await fetch(`/api/vehicle-fees?id=${editingFeeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updatedFee: VehicleFee = await res.json();
          setFees((prev) => prev.map((f) => (f._id === editingFeeId ? updatedFee : f)));
          setEditingFeeId(null);
        } else {
          // Read response as text first, then attempt JSON parse for a friendly message
          const raw = await res.text();
          let errMsg = 'Failed to update fee.';
          try {
            const errJson = JSON.parse(raw);
            errMsg = errJson.message || JSON.stringify(errJson);
          } catch {
            errMsg = raw || errMsg;
          }
          alert('Error: ' + errMsg);
          return;
        }
      } else {
        // Create new fee
        const res = await fetch('/api/vehicle-fees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const raw = await res.text();
          let errMsg = 'Failed to create fee.';
          try {
            const errJson = JSON.parse(raw);
            errMsg = errJson.message || JSON.stringify(errJson);
          } catch {
            errMsg = raw || errMsg;
          }
          alert('Error: ' + errMsg);
          return;
        }
        const createdFee: VehicleFee = await res.json();
        setFees((prev) => [...prev, createdFee]);
      }
      // Reset form
      setNewFee({ studentId: '', fatherName: '', amount: '', utr: '', lastyear: '', lasyearamount: '', month: '', status: 'Pending', city: '', busNumber: '', totalFees: '', discount: '', description: '', paidDate: new Date().toISOString().split('T')[0] });
      setShowAddForm(false);
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  // Delete handler using query param (JSON file API)
  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete student "${name}"? This will also delete all their attendance and fee records.`)) {
      try {
        const res = await fetch(`/api/vehicle-fees?id=${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          // optional: show success toast
          setFees((prev) => prev.filter((f) => f._id !== id));
        } else {
          // Read response as text first, then attempt JSON parse for a friendly message
          const raw = await res.text();
          let errMsg = 'Failed to delete.';
          try {
            const errJson = JSON.parse(raw);
            errMsg = errJson.message || JSON.stringify(errJson);
          } catch {
            errMsg = raw || errMsg;
          }
          alert(`Error deleting fee: ${errMsg}`);
        }
      } catch (err: any) {
        alert('Network error: ' + err.message);
      }
    }
  };

  const filteredFees = fees.filter(fee => {
    if (!fee) return false;
    const studentName = typeof fee.studentId === 'string'
      ? (students.find((s) => s && s._id === fee.studentId)?.name?.toLowerCase() ?? '')
      : (fee.studentId as any)?.name?.toLowerCase() ?? '';
    return studentName.includes(searchTerm.toLowerCase()) ||
      (fee.month || '').toLowerCase().includes(searchTerm.toLowerCase());
  });


  if (!isMounted) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Fees Management</h1>
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
              href={`/api/vehicle-fees/pdf?ids=${selectedIds.join(',')}`}
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
              href="/api/vehicle-fees/pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                ⬇️ Download Fees List
              </button>
            </a>
          )}
          {!isTeacher && (
            <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>Add Record</button>
          )}
        </div>
      </div>
      {/* ── Daily Summary Stat Cards ──────────────────────────────────── */}
      {!isTeacher && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.07))', border: '1.5px solid rgba(245,158,11,0.22)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>🚍 Today Transport Fees</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>₹{todayVehicleTotal.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{todayFees.filter((f: any) => f.feeType === 'Vehicle Fee').length} records</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.07))', border: '1.5px solid rgba(16,185,129,0.22)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>💰 Today Grand Total</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>₹{todayVehicleTotal.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{todayFees.length} total records today</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.07), rgba(220,38,38,0.06))', border: '1.5px solid rgba(239,68,68,0.17)', borderRadius: '16px', padding: '18px 22px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>📋 All-Time Collected</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>₹{fees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{fees.length} total records</div>
          </div>
        </div>
      )}

      {showAddForm && !isTeacher && (
        <div className="glass card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--primary)' }}>
            {editingFeeId ? 'Edit Payment' : 'Record New Payment'}
          </h2>
          <form onSubmit={handleAddFee} className="responsive-grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Select Student</label>
              <select
                value={newFee.studentId}
                onChange={(e) => {
                  const selectedStudent = students.find((s) => s._id === e.target.value);
                  const defaultLastYear = selectedStudent?.lastFeesAmount ? String(selectedStudent.lastFeesAmount) : '';
                  setNewFee({
                    ...newFee,
                    studentId: e.target.value,
                    fatherName: selectedStudent?.fatherName || '',
                    lastyear: defaultLastYear,
                    lasyearamount: defaultLastYear
                  });
                }}
                required
              >
                <option value="">Choose a student...</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {(s.fatherName)} ({s.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Select Route / Vehicle (Auto-fills details)</label>
              <select
                onChange={(e) => {
                  const selected = vehicles.find(v => v._id === e.target.value);
                  if (selected) {
                    setNewFee({
                      ...newFee,
                      city: selected.city,
                      busNumber: selected.vehicleNumber,
                      totalFees: selected.totalFees.toString(),
                      amount: selected.totalFees.toString()
                    });
                  }
                }}
              >
                <option value="">-- Choose a predefined vehicle route --</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.city} - {v.vehicleNumber} {v.driverNumber ? `(📞 ${v.driverNumber})` : ''} - ₹{v.totalFees}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>City</label>
              <input
                type="text"
                placeholder="e.g. Jaipur"
                value={newFee.city}
                onChange={(e) => setNewFee({ ...newFee, city: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Bus Number</label>
              <input
                type="text"
                placeholder="e.g. RJ-01-AB-1234"
                value={newFee.busNumber}
                onChange={(e) => setNewFee({ ...newFee, busNumber: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Last year fees
                {!!editingFeeId && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}>
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="lastyear amount"
                value={newFee.lastyear}
                onChange={e => setNewFee({ ...newFee, lastyear: e.target.value })}
                required
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
              <label>Last Year Fees Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={newFee.lasyearamount}
                onChange={e => setNewFee({ ...newFee, lasyearamount: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Amount Paid</label>
              <input
                type="number"
                placeholder="500"
                value={newFee.amount}
                onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Discount (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span></label>
              <input
                type="number"
                placeholder="Enter discount"
                value={newFee.discount}
                onChange={(e) => setNewFee({ ...newFee, discount: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Total Route Fees</label>
              <input
                type="number"
                placeholder="Monthly fee for this bus route"
                value={newFee.totalFees}
                onChange={(e) => setNewFee({ ...newFee, totalFees: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Month</label>
              <input
                type="text"
                value={newFee.month}
                onChange={(e) => setNewFee({ ...newFee, month: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>UTR</label>
              <input
                type="text"
                placeholder='Enter utr'
                value={newFee.utr}
                onChange={(e) => setNewFee({ ...newFee, utr: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Status</label>
              <select
                value={newFee.status}
                onChange={(e) => setNewFee({ ...newFee, status: e.target.value })}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
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
              Record Transaction
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
              <th style={{ padding: '16px' }}>City</th>
              <th style={{ padding: '16px' }}>Bus No.</th>
              <th style={{ padding: '16px' }}>Driver Contact</th>
              <th style={{ padding: '16px' }}>UTR</th>
              <th style={{ padding: '16px' }}>For Month</th>
              <th style={{ padding: '16px' }}>Last Year Fees</th>
              <th style={{ padding: '16px' }}>Last Year Fees Paid</th>
              <th style={{ padding: '16px' }}>Total Fees</th>
              <th style={{ padding: '16px' }}>Discount</th>
              <th style={{ padding: '16px' }}>Amount Paid</th>
              <th style={{ padding: '16px' }}>Balance</th>
              <th style={{ padding: '16px' }}>Status</th>
              <th style={{ padding: '16px' }}>Date</th>
              {!isTeacher && <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredFees.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No fee records found.
                </td>
              </tr>
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
                        : fee.studentId?.name ?? 'Unknown'
                    }</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{
                      typeof fee.studentId === 'string'
                        ? (students.find((s) => s._id === fee.studentId)?.rollNumber ?? '')
                        : fee.studentId?.rollNumber ?? ''
                    }</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {typeof fee.fatherName === 'string' ? fee.fatherName : (fee.fatherName?.name || fee.fatherName?.fatherName || fee.fatherName?._id || '—')}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{fee.city || '—'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{fee.busNumber || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    {vehicles.find(v => v.vehicleNumber === fee.busNumber)?.driverNumber ? `📞 ${vehicles.find(v => v.vehicleNumber === fee.busNumber)?.driverNumber}` : '—'}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 700 }}>{fee.utr || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 700 }}>{fee.month || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 700 }}>{fee.lastyear != null && fee.lastyear !== '' ? fee.lastyear : '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    {fee.status === 'Paid'
                      ? ((fee.lasyearamount != null && fee.lasyearamount !== '') ? fee.lasyearamount : (fee.lastyearamount != null && fee.lastyearamount !== '' ? fee.lastyearamount : (fee.lastyear != null && fee.lastyear !== '' ? fee.lastyear : (fee.lastyeae != null && fee.lastyeae !== '' ? fee.lastyeae : '—'))))
                      : ((fee.lasyearamount != null && fee.lasyearamount !== '') ? fee.lasyearamount : (fee.lastyearamount != null && fee.lastyearamount !== '' ? fee.lastyearamount : '—'))}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#6366f1' }}>{`₹${fee.totalFees ?? 0}`}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#d97706' }}>
                    {(fee as any).discount ? `₹${(fee as any).discount}` : '—'}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 700 }}>₹{fee.amount}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#ef4444' }}>
                    {(() => {
                      const discountAmt = (fee as any).discount ? Number((fee as any).discount) : 0;
                      const balance = (fee.totalFees ?? 0) - fee.amount - discountAmt;
                      return balance > 0 ? `₹${balance}` : '₹0';
                    })()}
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
                        href={`/api/vehicle-fees/${fee._id}/pdf`}
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
                            fatherName: typeof fee.fatherName === 'string' ? fee.fatherName : fee.fatherName?._id || '',
                            amount: fee.amount.toString(),
                            month: fee.month,
                            status: fee.status,
                            utr: fee.utr,
                            lastyear: fee.lastyear,
                            lasyearamount: (fee.lasyearamount != null && fee.lasyearamount !== '') ? fee.lasyearamount.toString() : '',
                            city: fee.city || '',
                            busNumber: fee.busNumber || '',
                            totalFees: fee.totalFees != null ? fee.totalFees.toString() : '',
                            discount: (fee as any).discount != null ? (fee as any).discount.toString() : '',
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
                          fontSize: '0.87rem',
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

      {/* Notify Modal */}
      {notifyFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setNotifyFee(null); }}>
          <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem' }}>💬 Send Vehicle Fee Alert</h2>
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
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: notifyResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: notifyResult.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.88rem', marginBottom: '14px' }}>
                {notifyResult.success ? '✅' : '⚠️'} {notifyResult.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setNotifyFee(null)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={notifySending || !notifyMsg.trim()}
                onClick={async () => {
                  const studentId = typeof notifyFee.studentId === 'string' ? notifyFee.studentId : (notifyFee.studentId as any)?._id;
                  if (!studentId) return;
                  setNotifySending(true);
                  setNotifyResult(null);
                  try {
                    const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, type: notifyType, category: 'VehicleFee', message: notifyMsg }) });
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
      )}
    </div>
  );
}
