'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.role) setRole(data.role);
      });
  }, []);

  const getTitle = () => {
    if (role === 'admin') return 'Admin Portal';
    if (role === 'teacher') return 'Teacher Portal';
    return 'Dashboard';
  };

  const getSubtitle = () => {
    if (role === 'admin') return 'Manage your institution';
    if (role === 'teacher') return 'Manage your classes';
    return 'Welcome back';
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      } else {
        alert('Logout failed');
      }
    } catch (err) { }
  };

  return (
    <div className="mesh-bg">
      {/* Hamburger button — visible only on mobile */}
      <button
        className={`navigation__button${sidebarOpen ? ' navigation__button--open' : ''}`}
        type="button"
        aria-expanded={sidebarOpen}
        aria-controls="navigation__popup"
        aria-label="Toggle navigation"
        onClick={() => setSidebarOpen(prev => !prev)}
      >
        <span className="navigation__bar" />
        <span className="navigation__bar" />
        <span className="navigation__bar" />
      </button>

      {/* Overlay — closes sidebar when tapping outside on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside
          id="navigation__popup"
          className={`sidebar glass${sidebarOpen ? ' sidebar--open' : ''}`}
        >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="/classupplus.png" alt="ClassUpPlus Logo" style={{ height: '150px', objectFit: 'contain' }} />
            </div>
            <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>{getTitle()}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{getSubtitle()}</p>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <NavLink href="/dashboard" label="Overview" icon="📊" onNav={() => setSidebarOpen(false)} />

            {role === 'admin' && (
              <>
                <NavLink href="/dashboard/teachers" label="Teachers" icon="👨‍🏫" onNav={() => setSidebarOpen(false)} />
                <NavLink href="/dashboard/salary" label="Salary" icon="💸" onNav={() => setSidebarOpen(false)} />
              </>
            )}

            <NavLink href="/dashboard/students" label="Students" icon="👥" onNav={() => setSidebarOpen(false)} />
            <NavLink href="/dashboard/attendance" label="Attendance" icon="📅" onNav={() => setSidebarOpen(false)} />
            <NavLink href="/dashboard/classpaper" label="Class Paper" icon="📄" onNav={() => setSidebarOpen(false)} />

            {role === 'admin' && (
              <NavLink href="/dashboard/class-fees" label="Class Fees" icon="🏫" onNav={() => setSidebarOpen(false)} />
            )}

            <NavLink href="/dashboard/fees" label="Fees" icon="💰" onNav={() => setSidebarOpen(false)} />
            <NavLink href="/dashboard/vehicle-fees" label="Vehicle Fees" icon="🚍" onNav={() => setSidebarOpen(false)} />
            <NavLink href="/dashboard/notifications" label="Notifications" icon="💬" onNav={() => setSidebarOpen(false)} />
            <NavLink href="/dashboard/timetable" label="Timetable" icon="⏰" onNav={() => setSidebarOpen(false)} />

            {role === 'admin' && (
              <NavLink href="/dashboard/vehicles" label="Vehicles" icon="🚌" onNav={() => setSidebarOpen(false)} />
            )}

            <NavLink
              href="/dashboard/settings"
              label={role === 'teacher' ? 'My Profile' : 'Settings'}
              icon="⚙️"
              onNav={() => setSidebarOpen(false)}
            />
          </nav>

          <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                color: 'var(--foreground)',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>🚪</span> Logout
            </button>
          </footer>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  onNav,
}: {
  href: string;
  label: string;
  icon: string;
  onNav?: () => void;
}) {
  return (
    <Link
      href={href}
      className="nav-item"
      onClick={onNav}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        color: 'var(--foreground)',
        fontWeight: '500',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      {label}
    </Link>
  );
}
