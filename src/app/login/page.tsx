'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ViewMode = 'login' | 'register-admin' | 'register-teacher' | 'forgot-password' | 'reset-password';

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
  const [regQualification, setRegQualification] = useState('');
  const [regSubject, setRegSubject] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot/Reset Password State
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

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
          qualification: regQualification,
          subject: regSubject,
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
        setRegName(''); setRegEmail(''); setRegPhone(''); setRegGrade(''); setRegSection(''); setRegSchoolName(''); setRegQualification(''); setRegSubject(''); setRegPassword('');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ username: resetUsername }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) {
        let msg = data.message || 'Verification code sent.';
        if (data.serverOtp) {
          msg = `${msg} (For testing, OTP is ${data.serverOtp})`;
        }
        setSuccess(msg);
        setView('reset-password');
      } else {
        setError(data.message || 'Failed to send reset code.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ username: resetUsername, otp: resetOtp, newPassword }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Password reset successfully!');
        setUsername(resetUsername);
        setPassword('');
        setTimeout(() => {
          setView('login');
          setResetUsername('');
          setResetOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
          setSuccess('');
        }, 1500);
      } else {
        setError(data.message || 'Failed to reset password.');
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
    if (view === 'register-teacher') return 'Create Teacher Account';
    if (view === 'forgot-password') return 'Reset Password';
    if (view === 'reset-password') return 'Enter New Password';
    return '';
  };

  const getSubtitle = () => {
    if (view === 'login') return 'Login as Admin or Teacher';
    if (view === 'register-admin') return 'Set up your school\'s admin account';
    if (view === 'register-teacher') return 'Join the ClassUpPlus platform';
    if (view === 'forgot-password') return 'Receive a verification code to reset your password';
    if (view === 'reset-password') return 'Provide the verification code and set your new password';
    return '';
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
          {['login', 'register-admin', 'register-teacher'].includes(view) && (
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
          )}

          {/* Status Messages */}
          {error && (
            <div className="badge badge-warning" style={{ textAlign: 'center', padding: '10px', marginBottom: '1rem', display: 'block' }}>
              {error}
            </div>
          )}
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

              <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot-password');
                    setResetUsername(username);
                    setError('');
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer', width: '100%' }}>
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          )}

          {view === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Username or Email</label>
                <input
                  type="text"
                  placeholder='Admin username or Teacher email'
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer', width: '100%' }}>
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {view === 'reset-password' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Verification Code (OTP)</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer', width: '100%' }}>
                {loading ? 'Resetting password...' : 'Reset Password'}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Qualification</label>
                <input type="text" placeholder="E.g. M.Sc., B.Ed." value={regQualification} onChange={(e) => setRegQualification(e.target.value)} disabled={loading} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Subject</label>
                <input type="text" placeholder="E.g. Mathematics" value={regSubject} onChange={(e) => setRegSubject(e.target.value)} disabled={loading} />
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
            {['forgot-password', 'reset-password'].includes(view) ? (
              <p>
                <button
                  onClick={() => switchView('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Back to Sign In
                </button>
              </p>
            ) : view === 'login' ? (
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
