'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function StatCard({
  title,
  value,
  icon,
  color,
  href,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  href: string;
  subtitle?: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="glass card"
        style={{
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '14px',
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</p>
          {subtitle && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{subtitle}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceToday: 0,
    totalFees: 0,
    totalVehicleFees: 0,
    paidVehicleFees: 0,
    pendingVehicleFees: 0,
    totalTeachers: 0,
    totalVehicles: 0,
  });
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [vehicleFeesData, setVehicleFeesData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    setIsMounted(true);

    // Fetch profile for school/teacher name
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.role) setRole(data.role);
        if (data?.schoolName) setSchoolName(data.schoolName);
        if (data?.name) setTeacherName(data.name);
      })
      .catch(() => { });

    // Fetch initial stats & activities
    const fetchStats = async () => {
      try {
        const [students, attendance, fees, vehicleFees, teachers, vehicles] = await Promise.all([
          fetch('/api/students', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
          fetch(`/api/attendance?date=${new Date().toISOString().split('T')[0]}`, { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
          fetch('/api/fees', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
          fetch('/api/vehicle-fees', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
          fetch('/api/teachers', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
          fetch('/api/vehicles', { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []),
        ]);

        const paidFees = Array.isArray(fees)
          ? fees.reduce((acc: number, f: any) => acc + (String(f.status).trim().toLowerCase() === 'paid' ? (Number(f.amount) || 0) : 0), 0)
          : 0;
        const paidVehicleFees = Array.isArray(vehicleFees)
          ? vehicleFees.reduce((acc: number, f: any) => acc + (String(f.status).trim().toLowerCase() === 'paid' ? (Number(f.amount) || 0) : 0), 0)
          : 0;
        const pendingVehicleFees = Array.isArray(vehicleFees)
          ? vehicleFees.reduce((acc: number, f: any) => acc + (String(f.status).trim().toLowerCase() === 'pending' ? (Number(f.amount) || 0) : 0), 0)
          : 0;
        const totalAllVehicleFees = Array.isArray(vehicleFees)
          ? vehicleFees.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0)
          : 0;

        setStats({
          totalStudents: Array.isArray(students) ? students.length : 0,
          attendanceToday: Array.isArray(attendance) ? attendance.filter((a: any) => a.status === 'Present').length : 0,
          totalFees: paidFees + paidVehicleFees,
          totalVehicleFees: totalAllVehicleFees,
          paidVehicleFees: paidVehicleFees,
          pendingVehicleFees: pendingVehicleFees,
          totalTeachers: Array.isArray(teachers) ? teachers.length : 0,
          totalVehicles: Array.isArray(vehicles) ? vehicles.length : 0,
        });

        setStudentsData(Array.isArray(students) ? students : []);
        setVehicleFeesData(Array.isArray(vehicleFees) ? vehicleFees : []);
        const studentActivities = (Array.isArray(students) ? students.filter(Boolean) : []).map((s: any) => ({
          id: s._id,
          title: 'New Student Registered',
          description: `${s.name} (Roll: ${s.rollNumber}) was added to Grade ${s.grade}`,
          date: new Date(s.createdAt || Date.now()),
          icon: '👤',
          color: '#6366f1'
        }));

        const feeActivities = (Array.isArray(fees) ? fees.filter(Boolean) : []).map((f: any) => ({
          id: f._id,
          title: `Fee Transaction - ${f.status}`,
          description: `₹${f.amount} recorded for ${f.studentId?.name || 'Unknown'} (${f.month || ''})`,
          date: new Date(f.createdAt || Date.now()),
          icon: f.status === 'Paid' ? '💰' : '⏳',
          color: f.status === 'Paid' ? '#10b981' : '#f59e0b'
        }));

        const combined = [...studentActivities, ...feeActivities]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        setActivities(combined);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isMounted) return null;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">
          Welcome back, {role === 'teacher' ? (teacherName || 'Teacher') : (schoolName || 'Admin')}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Here&apos;s what&apos;s happening in your school today.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '40px' }}>
        <StatCard title="Total Students" value={stats.totalStudents} icon="👥" color="#6366f1" href="/dashboard/students" />
        {role === 'admin' && (
          <StatCard title="Total Teachers" value={stats.totalTeachers} icon="👩‍🏫" color="#ec4899" href="/dashboard/teachers" />
        )}
        {role === 'admin' && (
          <StatCard title="Total Vehicles" value={stats.totalVehicles} icon="🚌" color="#8b5cf6" href="/dashboard/vehicles" />
        )}
        <StatCard title="Attendance Today" value={stats.attendanceToday} icon="✅" color="#10b981" href="/dashboard/attendance" />
        {role === 'admin' && (
          <StatCard title="Fees Collected" value={`₹${stats.totalFees}`} icon="💰" color="#f59e0b" href="/dashboard/fees" />
        )}
        {role === 'admin' && (
          <StatCard title="Total Vehicle Fees" value={`₹${stats.totalVehicleFees}`} icon="🚍" color="#4f46e5" href="/dashboard/vehicle-fees" subtitle={`₹${stats.paidVehicleFees} Paid · ₹${stats.pendingVehicleFees} Pending`} />
        )}
      </div>

      <div className="content-grid">
        {/* Left: Recent Registered Students */}
        <div className="glass card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Recent Registered Students</h3>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
                <tr>
                  <th style={{ padding: '16px' }}>Name</th>
                  <th style={{ padding: '16px' }}>Father</th>
                  <th style={{ padding: '16px' }}>Roll</th>
                  <th style={{ padding: '16px' }}>Class</th>
                  <th style={{ padding: '16px' }}>Section</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.slice(0, 5).map(student => (
                  <tr key={student._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{student.name}</td>
                    <td style={{ padding: '16px', fontWeight: 600, color: 'black' }}>{student.fatherName}</td>
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
                  </tr>
                ))}
                {studentsData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No students registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
