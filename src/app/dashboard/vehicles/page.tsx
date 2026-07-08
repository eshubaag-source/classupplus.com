'use client';
import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  city: string; 
  totalFees: number;
  driverNumber?: string;
  description?: string;
  createdAt?: string;
}

const emptyForm = {
  vehicleNumber: '',
  city: '',
  totalFees: '',
  driverNumber: '',
  description: '',
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    setIsMounted(true);
    fetchVehicles();
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.schoolName) setSchoolName(data.schoolName); })
      .catch(() => { });
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data: Vehicle[] = await res.json();
        setVehicles(data);
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch' }));
        alert(err.message);
      }
    } catch (e: any) {
      console.error('Failed to fetch vehicles', e);
    }
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (v: Vehicle) => {
    setForm({
      vehicleNumber: v.vehicleNumber,
      city: v.city,
      totalFees: v.totalFees.toString(),
      driverNumber: v.driverNumber || '',
      description: v.description || '',
    });
    setEditingId(v._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      vehicleNumber: form.vehicleNumber,
      city: form.city,
      totalFees: Number(form.totalFees),
      driverNumber: form.driverNumber,
      description: form.description,
    };

    const url = editingId ? `/api/vehicles?id=${editingId}` : '/api/vehicles';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchVehicles();
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

  const handleDelete = async (id: string, vehicleNumber: string) => {
    if (!confirm(`Delete vehicle "${vehicleNumber}"?`)) return;
    try {
      const res = await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v._id !== id));
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to delete' }));
        alert('Error: ' + err.message);
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  const handleDownloadPDF = () => {
    if (vehicles.length === 0) {
      alert("No vehicles data to download.");
      return;
    }

    const doc = new jsPDF();
    const title = "Vehicles Data";
    
    doc.setFontSize(16);
    doc.text(schoolName || "School Name Not Available", 14, 20);
    
    doc.setFontSize(12);
    doc.text(title, 14, 30);
    
    const headers = [["Bus Number", "City", "Driver Contact", "Total Fees", "Notes"]];
    const data = vehicles.map(v => [
      v.vehicleNumber,
      v.city,
      v.driverNumber || '-',
      `Rs. ${v.totalFees}`,
      v.description || '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: data,
    });

    doc.save('vehicles_data.pdf');
  };

  const filtered = vehicles.filter(v =>
    v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.driverNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isMounted) return null;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your school bus fleet — city, bus number, and route fees.</p>
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
            {showForm ? (editingId ? 'Cancel Edit' : 'Cancel') : '+ Add Vehicle'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>🚌</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Vehicles</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{vehicles.length}</div>
          </div>
        </div>
        <div className="glass card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>🏙️</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Cities Covered</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              {new Set(vehicles.map(v => v.city)).size}
            </div>
          </div>
        </div>
        <div className="glass card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>💰</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Monthly Fees</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              ₹{vehicles.reduce((acc, v) => acc + (v.totalFees || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--primary)' }}>
            {editingId ? '✏️ Edit Vehicle' : '🚌 Add New Vehicle'}
          </h2>
          <form onSubmit={handleSubmit} className="responsive-grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bus / Vehicle Number</label>
              <input
                type="text"
                placeholder="e.g. RJ-01-AB-1234"
                value={form.vehicleNumber}
                onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>City / Route Area</label>
              <input
                type="text"
                placeholder="e.g. Jaipur"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Fees (₹)</label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={form.totalFees}
                onChange={e => setForm({ ...form, totalFees: e.target.value })}
                required
                min={0}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Driver Contact</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={form.driverNumber}
                onChange={e => setForm({ ...form, driverNumber: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notes (Optional)</label>
              <input
                type="text"
                placeholder="Driver name, route stops, etc."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary form-full-width">
              {editingId ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by bus number or city..."
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
              <th style={{ padding: '16px' }}>Bus Number</th>
              <th style={{ padding: '16px' }}>City</th>
              <th style={{ padding: '16px' }}>Driver Contact</th>
              <th style={{ padding: '16px' }}>Total Fees</th>
              <th style={{ padding: '16px' }}>Notes</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {vehicles.length === 0 ? 'No vehicles added yet. Click "+ Add Vehicle" to get started.' : 'No results found.'}
                </td>
              </tr>
            ) : (
              filtered.map(v => (
                <tr key={v._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(99,102,241,0.08)', color: 'var(--primary)',
                      padding: '4px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem',
                    }}>
                      🚌 {v.vehicleNumber}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>🏙️ {v.city}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>📞 {v.driverNumber || '—'}</td>
                  <td style={{ padding: '16px', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                    ₹{v.totalFees.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {v.description || '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(v)}
                      style={{
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                        border: 'none', padding: '6px 12px', borderRadius: '6px',
                        fontSize: '0.875rem', cursor: 'pointer', marginRight: '8px',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v._id, v.vehicleNumber)}
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
