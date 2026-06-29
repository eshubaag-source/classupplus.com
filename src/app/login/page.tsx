'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ViewMode = 'login' | 'register-admin' | 'register-teacher';

export default function LoginPage() {
  const [view, setView] = useState<ViewMode>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Admin Register State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminSchoolName, setAdminSchoolName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Teacher Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGrade, setRegGrade] = useState('');
  const [regSection, setRegSection] = useState('');
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const switchView = (newView: ViewMode) => {
    setView(newView);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Logged in successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        body: JSON.stringify({
          username: adminUsername,
          schoolName: adminSchoolName,
          email: adminEmail,
          mobileNumber: adminPhone,
          password: adminPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setSuccess('Admin account created successfully! You can now log in.');
        setView('login');
        setUsername(adminUsername);
        setPassword('');
        // Clear admin reg state
        setAdminUsername(''); setAdminSchoolName(''); setAdminEmail(''); setAdminPhone(''); setAdminPassword('');
      } else {
        const data = await res.json();
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          grade: regGrade,
          section: regSection,
          schoolName: regSchoolName,
          password: regPassword
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setSuccess('Teacher account created successfully! You can now log in.');
        setView('login');
        setUsername(regEmail);
        setPassword('');
        // Clear teacher reg state
        setRegName(''); setRegEmail(''); setRegPhone(''); setRegGrade(''); setRegSection(''); setRegSchoolName(''); setRegPassword('');
      } else {
        const data = await res.json();
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  const getTitle = () => {
    if (view === 'login') return 'Welcome Back';
    if (view === 'register-admin') return 'Create Admin Account';
    return 'Create Teacher Account';
  };

  const getSubtitle = () => {
    if (view === 'login') return 'Login as Admin or Teacher';
    if (view === 'register-admin') return 'Set up your school\'s admin account';
    return 'Join the ClassUpPlus platform';
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 8px',
    border: 'none',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',   
    borderRadius: '10px',
    transition: 'all 0.25s ease',
    letterSpacing: '0.01em',
  });

  return (
    <div className="mesh-bg">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div className="glass card" style={{ maxWidth: view === 'login' ? '420px' : '520px', width: '100%', transition: 'all 0.3s ease' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>{getTitle()}</h1>
            <p style={{ color: 'var(--text-muted)' }}>{getSubtitle()}</p>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '1.5rem',
            background: 'rgba(0,0,0,0.06)',
            padding: '4px',
            borderRadius: '14px',
          }}>
            <button onClick={() => switchView('login')} style={tabStyle(view === 'login')}>
              Sign In
            </button>
            <button onClick={() => switchView('register-admin')} style={tabStyle(view === 'register-admin')}>
              Admin
            </button>
            <button onClick={() => switchView('register-teacher')} style={tabStyle(view === 'register-teacher')}>
              Teacher
            </button>
          </div>

          
          {success && (
            <div className="badge badge-success" style={{ textAlign: 'center', padding: '10px', marginBottom: '1rem', display: 'block' }}>
              {success}
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Username or Email</label>
                <input
                  type="text"
                  placeholder='Admin username or Teacher email'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading} 
                  required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer', width: '100%' }}>
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          )}

          {view === 'register-admin' && (
            <form onSubmit={handleAdminRegister} className="responsive-grid-2" style={{ gap: '1rem' }}>
              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Username</label>
                <input type="text" placeholder="Choose a username" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>School Name</label>
                <input type="text" placeholder="E.g. Springfield Elementary" value={adminSchoolName} onChange={(e) => setAdminSchoolName(e.target.value)} disabled={loading} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Email Address</label>
                <input type="email" placeholder="admin@school.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} disabled={loading} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Phone Number</label>
                <input type="text" placeholder="+91 98765 43210" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Password</label>
                <input type="password" placeholder="Create a strong password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} disabled={loading} required />
              </div>

              <button type="submit" className="btn-primary form-full-width" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </form>
          )}

          {view === 'register-teacher' && (
            <form onSubmit={handleTeacherRegister} className="responsive-grid-2" style={{ gap: '1rem' }}>
              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Full Name</label>
                <input type="text" placeholder="Full Nam" value={regName} onChange={(e) => setRegName(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>School Name</label>
                <input type="text" placeholder="E.g. Springfield Elementary" value={regSchoolName} onChange={(e) => setRegSchoolName(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Email Address</label>
                <input type="email" placeholder="john.doe@school.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Phone Number</label>
                <input type="text" placeholder="+1 234 567 890" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} disabled={loading} required />
              </div>

              <div className="form-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Password</label>
                <input type="password" placeholder="Create a strong password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} required />
              </div>

              <button type="submit" className="btn-primary form-full-width" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
                {loading ? 'Creating Account...' : 'Create Teacher Account'}
              </button>
            </form>
          )}

          {/* Footer Links */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            {view === 'login' ? (
              <p style={{ color: 'var(--text-muted)' }}>
                Don't have an account? Use the <strong>Admin</strong> or <strong>Teacher</strong> tabs above to register.
              </p>
            ) : (
              <p>Already have an account? <button onClick={() => switchView('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Sign In here</button></p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
