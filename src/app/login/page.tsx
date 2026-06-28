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

  // OTP State
  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<'email' | 'phone'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

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
        if (data.otpRequired) {
          setIsOtpRequired(true);
          setTempToken(data.tempToken);
          setMaskedEmail(data.maskedEmail);
          setMaskedPhone(data.maskedPhone);
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (method: 'email' | 'phone') => {
    setLoading(true);
    setError('');
    setSuccess('');
    setDevOtp('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ tempToken, method }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setOtpDeliveryMethod(method);
        setOtpSent(true);
        setSuccess(data.message);
        if (data.serverOtp) {
          setDevOtp(data.serverOtp);
        }
        setResendTimer(60);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ tempToken, otp: otpCode }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Logged in successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError(data.message || 'OTP verification failed.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpRequired(false);
    setTempToken('');
    setMaskedEmail('');
    setMaskedPhone('');
    setOtpSent(false);
    setOtpCode('');
    setDevOtp('');
    setError('');
    setSuccess('');
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
    if (isOtpRequired) return 'Security Verification';
    if (view === 'login') return 'Welcome Back';
    if (view === 'register-admin') return 'Create Admin Account';
    return 'Create Teacher Account';
  };

  const getSubtitle = () => {
    if (isOtpRequired) return otpSent ? 'Enter the verification code sent to your device' : 'Select how you want to receive your verification code';
    if (view === 'login') return 'Login as Admin or Teacher';
    if (view === 'register-admin') return 'Set up your school\'s admin account';
    return 'Join the  ClassUpPlus platform';
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
          {!isOtpRequired && (
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

    
          {success && (
            <div className="badge badge-success" style={{ textAlign: 'center', padding: '10px', marginBottom: '1rem', display: 'block' }}>
              {success}
            </div>
          )}

          {isOtpRequired ? (
            <div>
              {/* Dev Helper Alert */}
              {devOtp && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255, 193, 7, 0.15)',
                  border: '1px dashed #ffc107',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  color: '#b27b00',
                  textAlign: 'center',
                  fontWeight: 500
                }}>
                </div>
              )}

              {!otpSent ? (
                /* STEP 2a: CHOOSE OTP METHOD */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Choose one of the secure contact methods below to receive your one-time verification code:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Email Option Card */}
                    <button
                      type="button"
                      disabled={loading || !maskedEmail || maskedEmail === 'Not configured'}
                      onClick={() => handleSendOtp('email')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                        padding: '16px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.7)',
                        cursor: (!maskedEmail || maskedEmail === 'Not configured') ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        opacity: (!maskedEmail || maskedEmail === 'Not configured') ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (maskedEmail && maskedEmail !== 'Not configured') {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <strong style={{ fontSize: '1rem', color: 'var(--text-dark)' }}>📧 Send OTP to Email</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{maskedEmail}</span>
                    </button>

                    {/* Phone Option Card */}
                    <button
                      type="button"
                      disabled={loading || !maskedPhone || maskedPhone === 'Not configured'}
                      onClick={() => handleSendOtp('phone')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                        padding: '16px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.7)',
                        cursor: (!maskedPhone || maskedPhone === 'Not configured') ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        opacity: (!maskedPhone || maskedPhone === 'Not configured') ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (maskedPhone && maskedPhone !== 'Not configured') {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <strong style={{ fontSize: '1rem', color: 'var(--text-dark)' }}>📱 Send OTP to Phone</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{maskedPhone}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      alignSelf: 'center',
                      marginTop: '0.5rem'
                    }}
                  >
                    Back to credentials
                  </button>
                </div>
              ) : (
                /* STEP 2b: ENTER & VERIFY OTP */
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      One-Time Code (Sent to {otpDeliveryMethod === 'email' ? 'Email' : 'Phone'})
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      style={{
                        letterSpacing: '0.5em',
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      required
                      autoFocus
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', cursor: 'pointer', width: '100%' }}>
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {resendTimer > 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Resend code in {resendTimer}s
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handleSendOtp(otpDeliveryMethod)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'underline'
                          }}
                        >
                          Resend Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'underline'
                          }}
                        >
                          Change Option
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Back to credentials
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Standard views (Sign In, Admin Reg, Teacher Reg) */
            <>
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
            </>
          )}

          {/* Footer Links */}
          {!isOtpRequired && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
              {view === 'login' ? (
                <p style={{ color: 'var(--text-muted)' }}>
                  Don't have an account? Use the <strong>Admin</strong> or <strong>Teacher</strong> tabs above to register.
                </p>
              ) : (
                <p>Already have an account? <button onClick={() => switchView('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Sign In here</button></p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
