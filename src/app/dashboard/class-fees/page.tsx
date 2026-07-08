'use client';
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassFee {
  _id: string;
  grade: string;
  subject?: string;
  amount: number;
  description?: string;
  createdAt?: string;
}

const emptyForm = {
  grade: '',
  subject: '',
  amount: '',
  description: '',
};

export default function ClassFeesPage() {
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchClassFees();
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.schoolName) setSchoolName(data.schoolName); })
      .catch(() => { });
  }, []);

  const fetchClassFees = async () => {
    try {
      const res = await fetch('/api/class-fees', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setClassFees(Array.isArray(data) ? data : []);
        setFetchError(null);
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch class fees' }));
        setFetchError(err.message);
      }
    } catch (e: any) {
      setFetchError('Network error: ' + e.message);
    }
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (cf: ClassFee) => {
    setForm({
      grade: cf.grade,
      subject: cf.subject || '',
      amount: cf.amount.toString(),
      description: cf.description || '',
    });
    setEditingId(cf._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      grade: form.grade,
      subject: form.subject || '',
      amount: Number(form.amount),
      description: form.description,
    };

    const url = editingId ? `/api/class-fees?id=${editingId}` : '/api/class-fees';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchClassFees();
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
      } else {
        const err = await res.json().catch(() => ({ message: 'Request failed' }));
        alert('Error: ' + err.message);
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  const handleDelete = async (id: string, grade: string) => {
    if (!confirm(`Delete fee for "${grade}"?`)) return;
    try {
      const res = await fetch(`/api/class-fees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClassFees(prev => prev.filter(cf => cf._id !== id));
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to delete' }));
        alert('Error: ' + err.message);
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  const handleDownloadPDF = () => {
    if (classFees.length === 0) {
      alert("No class fees data to download.");
      return;
    }

    const doc = new jsPDF();
    const title = "Class Fees Data";
    
    doc.setFontSize(16);
    doc.text(schoolName || "School Name Not Available", 14, 20);
    
    doc.setFontSize(12);
    doc.text(title, 14, 30);
    
    const headers = [["Class / Grade", "Subject", "Fees Amount", "Notes"]];
    const data = classFees.map(cf => [
      cf.grade,
      cf.subject || '-',
      `Rs. ${cf.amount}`,
      cf.description || '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: data,
    });

    doc.save('class_fees_data.pdf');
  };

  const filtered = classFees.filter(cf =>
    cf.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isMounted) return null;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Fees</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure default school fee amounts for each class/grade.</p>
          {schoolName && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px',
              padding: '6px 14px', borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(99,102,241,0.25)', fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--primary)',
            }}>
              🏫 {schoolName}
            </div>
          )}
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={handleDownloadPDF} style={{ background: '#ef4444' }}>
            📄 Download PDF
          </button>
          <button className="btn-primary" onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : handleOpenAdd}>
            {showForm ? (editingId ? 'Cancel Edit' : 'Cancel') : '+ Add Class Fee'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>🏫</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Classes Configured</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{classFees.length}</div>
          </div>
        </div>
        <div className="glass card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>💰</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Monthly Fees</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              ₹{classFees.reduce((acc, cf) => acc + (cf.amount || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--primary)' }}>
            {editingId ? '✏️ Edit Class Fee' : '🏫 Add New Class Fee'}
          </h2>
          <form onSubmit={handleSubmit} className="responsive-grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Class / Grade</label>
              <select
                value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value, subject: '' })}
                required
                style={{
                  padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid var(--glass-border)',
                  background: 'var(--glass-bg)', color: 'var(--text)',
                  fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                <option value="">— Select Class —</option>
                {['Nursary', 'L.K.G', 'U.K.G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                  <option key={g} value={`Class ${g}`}>Class {g}</option>
                ))}
                <option value="Other">Other / Custom</option>
              </select>
              {form.grade === 'Other' && (
                <input
                  type="text"
                  placeholder="e.g. LKG, UKG, Nursery"
                  onChange={e => setForm({ ...form, grade: e.target.value })}
                  style={{ marginTop: '6px' }}
                  autoFocus
                />
              )}
            </div>
            {/* Subject dropdown — only for Class 11 / 12 */}
            {['Class 11', 'Class 12'].includes(form.grade) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject / Stream</label>
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    border: '1.5px solid var(--glass-border)',
                    background: 'var(--glass-bg)', color: 'var(--text)',
                    fontSize: '0.95rem', cursor: 'pointer',
                  }}
                >
                  <option value="">— General / All Streams —</option>
                  <optgroup label="── Science Stream ──">
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Biology</option>
                    <option>Mathematics</option>
                    <option>Computer Science</option>
                    <option>Agriculture</option>
                    <option>Informatics Practices</option>
                  </optgroup>
                  <optgroup label="── Commerce Stream ──">
                    <option>Accountancy</option>
                    <option>Business Studies</option>
                    <option>Economics</option>
                    <option>Entrepreneurship</option>
                  </optgroup>
                  <optgroup label="── Arts / Humanities ──">
                    <option>Arts</option>
                    <option>History</option>
                    <option>Political Science</option>
                    <option>Geography</option>
                    <option>Sociology</option>
                    <option>Psychology</option>
                    <option>Philosophy</option>
                    <option>Fine Arts</option>
                    <option>Home Science</option>
                  </optgroup>
                  <optgroup label="── Common / Language ──">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Sanskrit</option>
                    <option>Physical Education</option>
                  </optgroup>
                </select>
              </div>
            )}


            <div className="form-full-width" style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Monthly Fee Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                min={0}
                style={{ fontSize: '1rem' }}
              />
            </div>

            <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notes (Optional)</label>
              <input
                type="text"
                placeholder="Any special notes for this class fee..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary form-full-width">
              {editingId ? 'Save Changes' : 'Add Class Fee'}
            </button>
          </form>
        </div>
      )}

      {/* Fetch error banner */}
      {fetchError && (
        <div style={{
          marginBottom: '1rem',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#dc2626',
          fontSize: '0.9rem',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <span>⚠️</span>
          <span>{fetchError}</span>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by class or grade..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem' }}
        />
      </div>

      {/* Table */}
      <div className="glass table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
            <tr>
              <th style={{ padding: '16px' }}>Class / Grade</th>
              <th style={{ padding: '16px' }}>Subject</th>
              <th style={{ padding: '16px' }}>Fees Amount</th>
              <th style={{ padding: '16px' }}>Notes</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {classFees.length === 0 ? 'No class fees configured yet. Click "+ Add Class Fee" to get started.' : 'No results found.'}
                </td>
              </tr>
            ) : (
              filtered.map(cf => (
                <tr key={cf._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 600 }}>🏫 {cf.grade}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {cf.subject || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                    ₹{cf.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {cf.description || '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(cf)}
                      style={{
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                        border: 'none', padding: '6px 12px', borderRadius: '6px',
                        fontSize: '0.875rem', cursor: 'pointer', marginRight: '8px',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cf._id, cf.grade)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        border: 'none', padding: '6px 12px', borderRadius: '6px',
                        fontSize: '0.875rem', cursor: 'pointer',
                      }}
                    >
                      🗑️ Delete
                    </button>
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
