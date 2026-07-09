'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({
    role: '',
    username: '',
    schoolName: '',
    email: '',
    mobileNumber: '',
    name: '',
    phone: '',
    grade: '',
    section: '',
    aadhaarNumber: '',
    qualification: '',
    subject: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioSmsNumber: '',
    twilioWhatsappNumber: '',
    smsEnabled: true,
    whatsappEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [original, setOriginal] = useState<any>({});

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setOriginal(data);
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);

    let changed = false;
    if (updated.role === 'admin') {
      changed = updated.schoolName !== original.schoolName ||
        updated.email !== original.email ||
        updated.mobileNumber !== original.mobileNumber ||
        updated.twilioAccountSid !== original.twilioAccountSid ||
        updated.twilioAuthToken !== original.twilioAuthToken ||
        updated.twilioSmsNumber !== original.twilioSmsNumber ||
        updated.twilioWhatsappNumber !== original.twilioWhatsappNumber ||
        updated.smsEnabled !== original.smsEnabled ||
        updated.whatsappEnabled !== original.whatsappEnabled;
    } else {
      changed = updated.name !== original.name ||
        updated.email !== original.email ||
        updated.phone !== original.phone ||
        updated.grade !== original.grade ||
        updated.section !== original.section ||
        updated.schoolName !== original.schoolName ||
        updated.aadhaarNumber !== original.aadhaarNumber ||
        updated.qualification !== original.qualification ||
        updated.subject !== original.subject;
    }

    setHasChanges(changed);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const bodyData = profile.role === 'admin' ? {
        schoolName: profile.schoolName,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
        twilioAccountSid: profile.twilioAccountSid,
        twilioAuthToken: profile.twilioAuthToken,
        twilioSmsNumber: profile.twilioSmsNumber,
        twilioWhatsappNumber: profile.twilioWhatsappNumber,
        smsEnabled: profile.smsEnabled,
        whatsappEnabled: profile.whatsappEnabled,
      } : {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        grade: profile.grade,
        section: profile.section,
        schoolName: profile.schoolName,
        aadhaarNumber: profile.aadhaarNumber,
        qualification: profile.qualification,
        subject: profile.subject,
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setOriginal(data);
        setSaveStatus('success');
        setHasChanges(false);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setProfile(original);
    setHasChanges(false);
    setSaveStatus('idle');
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to log out this device?')) return;
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s._id !== sessionId));
        // If they deleted their current session, they will likely get redirected or get a 401 on next action.
        // We could also do a hard reload here if they deleted the current session.
      } else {
        alert('Failed to log out device.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    }
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setPwStatus({ type: 'error', message: 'All password fields are required' });
      return;
    }
    if (passwords.new.length < 6) {
      setPwStatus({ type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPwStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setPwSaving(true);
    setPwStatus({ type: 'idle', message: '' });
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwStatus({ type: 'success', message: 'Password changed successfully!' });
        setPasswords({ current: '', new: '', confirm: '' });
        setTimeout(() => setPwStatus({ type: 'idle', message: '' }), 4000);
      } else {
        setPwStatus({ type: 'error', message: data.message || 'Failed to change password' });
      }
    } catch {
      setPwStatus({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setPwSaving(false);
    }
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: '', color: 'transparent', width: '0%' };
    if (pw.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: '#f59e0b', width: '40%' };
    if (score <= 2) return { label: 'Fair', color: '#eab308', width: '60%' };
    if (score <= 3) return { label: 'Good', color: '#22c55e', width: '80%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const parseDeviceName = (ua: string): string => {
    if (!ua) return 'Unknown Device';
    // Detect OS
    let os = 'Unknown OS';
    if (/Android/i.test(ua)) {
      const match = ua.match(/Android ([\d.]+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
    } else if (/Windows NT/i.test(ua)) {
      os = 'Windows';
    } else if (/Mac OS X/i.test(ua)) {
      os = 'macOS';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
    }
    // Detect browser
    let browser = 'Browser';
    if (/Edg\//i.test(ua)) {
      browser = 'Edge';
    } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
      browser = 'Opera';
    } else if (/Firefox\//i.test(ua)) {
      browser = 'Firefox';
    } else if (/SamsungBrowser/i.test(ua)) {
      browser = 'Samsung Browser';
    } else if (/Chrome\//i.test(ua)) {
      browser = /Mobile/i.test(ua) ? 'Chrome Mobile' : 'Chrome';
    } else if (/Safari\//i.test(ua)) {
      browser = 'Safari';
    }
    return `${browser} on ${os}`;
  };

  const getInitials = () => {
    if (profile.role === 'admin' && profile.schoolName) {
      return profile.schoolName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }
    if (profile.role === 'teacher' && profile.name) {
      return profile.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }
    return profile.username ? profile.username[0].toUpperCase() : 'U';
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Settings' : 'My Profile'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isAdmin ? 'Manage your school profile and account preferences.' : 'View and update your personal details and contact info.'}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass card" style={{
        padding: '32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative gradient orb */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '32px',
          position: 'relative',
        }}>
          {/* Avatar */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}>
            {getInitials()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
              {isAdmin ? (profile.schoolName || 'Your School') : (profile.name || 'Teacher')}
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }} />
              Logged in as <strong style={{ color: 'var(--primary)' }}>{profile.username}</strong>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)',
          marginBottom: '32px',
        }} />

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {isAdmin ? (
            <>
              <div className="responsive-grid-2">
                {/* Username */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    👤 Username
                  </label>
                  <input
                    type="text"
                    value={profile.username || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'rgba(0,0,0,0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                {/* School Name */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    🏫 School Name
                  </label>
                  <input
                    type="text"
                    value={profile.schoolName || ''}
                    onChange={(e) => handleChange('schoolName', e.target.value)}
                    placeholder="Enter your school name"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>

              {/* Email & Mobile side by side */}
              <div className="responsive-grid-2">
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    ✉️ Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="admin@school.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    📱 Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={profile.mobileNumber || ''}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Teacher Fields */}
              <div className="responsive-grid-2">
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    👨‍🏫 Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    🏫 School Name
                  </label>
                  <input
                    type="text"
                    value={profile.schoolName || ''}
                    onChange={(e) => handleChange('schoolName', e.target.value)}
                    placeholder="Enter your school name"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    ✉️ Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="teacher@school.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    📱 Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    📚 Assigned Class
                  </label>
                  <input
                    type="text"
                    value={profile.grade || ''}
                    onChange={(e) => handleChange('grade', e.target.value)}
                    placeholder="e.g. 10th"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    🏷️ Section
                  </label>
                  <input
                    type="text"
                    value={profile.section || ''}
                    onChange={(e) => handleChange('section', e.target.value)}
                    placeholder="e.g. A"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    🪪 Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={profile.aadhaarNumber || ''}
                    onChange={(e) => handleChange('aadhaarNumber', e.target.value)}
                    placeholder="1234-5678-9012"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    🎓 Qualification
                  </label>
                  <input
                    type="text"
                    value={profile.qualification || ''}
                    onChange={(e) => handleChange('qualification', e.target.value)}
                    placeholder="e.g. M.Sc., B.Ed."
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    📖 Subject
                  </label>
                  <input
                    type="text"
                    value={profile.subject || ''}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="e.g. Mathematics"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '1rem',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* Account Info Card */}
      <div className="glass card" style={{
        padding: '24px 32px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔒 Account Information
        </h3>
        <div className="responsive-grid-2">
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.1)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              ROLE
            </div>
            <div style={{ fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize' }}>{profile.role || 'Admin'}</div>
          </div>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              STATUS
            </div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Active Devices Card */}
      <div className="glass card" style={{
        padding: '24px 32px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📱 Active Devices
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          You are currently logged in on {sessions.length} device{sessions.length === 1 ? '' : 's'}.
        </p>

        {sessionsLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((session) => (
              <div key={session._id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid var(--glass-border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)' }}>
                    {parseDeviceName(session.userAgent)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    IP: {session.ipAddress} • Last active: {new Date(session.lastActive).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(session._id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                >
                  Log Out
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="glass card" style={{
        padding: '24px 32px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔑 Change Password
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Current Password */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="settings-current-password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => { setPasswords({ ...passwords, current: e.target.value }); setPwStatus({ type: 'idle', message: '' }); }}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  fontSize: '1rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  color: 'var(--foreground)',
                  transition: 'all 0.2s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                }}
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="settings-new-password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => { setPasswords({ ...passwords, new: e.target.value }); setPwStatus({ type: 'idle', message: '' }); }}
                placeholder="Enter new password (min 6 characters)"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  fontSize: '1rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  color: 'var(--foreground)',
                  transition: 'all 0.2s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                }}
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Password Strength Bar */}
            {passwords.new && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  height: '4px',
                  borderRadius: '4px',
                  background: 'var(--glass-border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: getPasswordStrength(passwords.new).width,
                    background: getPasswordStrength(passwords.new).color,
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                  }} />
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: getPasswordStrength(passwords.new).color,
                  fontWeight: 600,
                  marginTop: '4px',
                  textAlign: 'right',
                }}>
                  {getPasswordStrength(passwords.new).label}
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="settings-confirm-password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => { setPasswords({ ...passwords, confirm: e.target.value }); setPwStatus({ type: 'idle', message: '' }); }}
                placeholder="Re-enter new password"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  fontSize: '1rem',
                  background: 'var(--glass-bg)',
                  border: passwords.confirm && passwords.new !== passwords.confirm
                    ? '1px solid #ef4444'
                    : passwords.confirm && passwords.new === passwords.confirm
                      ? '1px solid #10b981'
                      : '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  color: 'var(--foreground)',
                  transition: 'all 0.2s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                }}
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </button>
            </div>
            {passwords.confirm && passwords.new !== passwords.confirm && (
              <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px', fontWeight: 500 }}>
                Passwords do not match
              </div>
            )}
            {passwords.confirm && passwords.new === passwords.confirm && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Passwords match
              </div>
            )}
          </div>
        </div>

        {/* Password Status & Button */}
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
          {pwStatus.type !== 'idle' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: pwStatus.type === 'success' ? '#10b981' : '#ef4444',
              fontWeight: 600,
              fontSize: '0.9rem',
              marginRight: 'auto',
              animation: 'fadeIn 0.3s ease',
            }}>
              {pwStatus.type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : '⚠️'}
              {pwStatus.message}
            </div>
          )}

          <button
            id="settings-change-password-btn"
            onClick={handlePasswordChange}
            disabled={pwSaving || !passwords.current || !passwords.new || !passwords.confirm}
            style={{
              borderRadius: '12px',
              padding: '12px 28px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: 'white',
              fontWeight: 600,
              opacity: pwSaving || !passwords.current || !passwords.new || !passwords.confirm ? 0.5 : 1,
              cursor: pwSaving || !passwords.current || !passwords.new || !passwords.confirm ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
            }}
          >
            {pwSaving ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                Updating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Update Password
              </>
            )}
          </button>
        </div>
      </div>

      {/* Twilio SMS & WhatsApp Settings — Admin only */}
      {isAdmin && (
        <div className="glass card" style={{ padding: '24px 32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 SMS &amp; WhatsApp Settings
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Connect your Twilio account to send real SMS &amp; WhatsApp messages. Leave blank to use <strong>Simulation Mode</strong> (messages logged but not sent).
          </p>

          {/* Enable toggles */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => {
                  const val = !profile.smsEnabled;
                  setProfile({ ...profile, smsEnabled: val });
                  setHasChanges(true);
                  setSaveStatus('idle');
                }}
                style={{
                  width: '48px', height: '26px', borderRadius: '13px',
                  background: profile.smsEnabled ? 'var(--primary)' : 'var(--glass-border)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.25s ease',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px',
                  left: profile.smsEnabled ? '24px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.25s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📱 SMS Enabled</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => {
                  const val = !profile.whatsappEnabled;
                  setProfile({ ...profile, whatsappEnabled: val });
                  setHasChanges(true);
                  setSaveStatus('idle');
                }}
                style={{
                  width: '48px', height: '26px', borderRadius: '13px',
                  background: profile.whatsappEnabled ? '#25D366' : 'var(--glass-border)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.25s ease',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px',
                  left: profile.whatsappEnabled ? '24px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.25s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>🟢 WhatsApp Enabled</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Account SID */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔑 Twilio Account SID
              </label>
              <input
                type="text"
                value={profile.twilioAccountSid || ''}
                onChange={(e) => handleChange('twilioAccountSid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={{ width: '100%', padding: '14px 16px', fontSize: '0.9rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'monospace' }}
              />
            </div>

            {/* Auth Token */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔐 Auth Token
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showTwilioToken ? 'text' : 'password'}
                  value={profile.twilioAuthToken || ''}
                  onChange={(e) => handleChange('twilioAuthToken', e.target.value)}
                  placeholder="Your Twilio Auth Token"
                  style={{ width: '100%', padding: '14px 48px 14px 16px', fontSize: '0.9rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'monospace' }}
                />
                <button type="button" onClick={() => setShowTwilioToken(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                  {showTwilioToken ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* SMS Number */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📱 Twilio SMS Number
              </label>
              <input
                type="text"
                value={profile.twilioSmsNumber || ''}
                onChange={(e) => handleChange('twilioSmsNumber', e.target.value)}
                placeholder="+1234567890"
                style={{ width: '100%', padding: '14px 16px', fontSize: '0.9rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'monospace' }}
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🟢 Twilio WhatsApp Number
              </label>
              <input
                type="text"
                value={profile.twilioWhatsappNumber || ''}
                onChange={(e) => handleChange('twilioWhatsappNumber', e.target.value)}
                placeholder="+14155238886"
                style={{ width: '100%', padding: '14px 16px', fontSize: '0.9rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            💡 <strong>Tip:</strong> In Simulation Mode (no credentials), messages are logged to the Notifications page. For real messages, enter Twilio credentials above and click <em>Save Changes</em>.
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'flex-end',
      }}>
        {/* Save Status Message */}
        {saveStatus === 'success' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10b981',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginRight: 'auto',
            animation: 'fadeIn 0.3s ease',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Profile updated successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginRight: 'auto',
            animation: 'fadeIn 0.3s ease',
          }}>
            ⚠️ Failed to save. Please try again.
          </div>
        )}

        {hasChanges && (
          <button
            onClick={handleReset}
            className="btn-ghost"
            style={{
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '0.9rem',
            }}
          >
            Discard
          </button>
        )}

        <button
          id="settings-save-btn"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="btn-primary"
          style={{
            borderRadius: '12px',
            padding: '12px 32px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: !hasChanges || isSaving ? 0.5 : 1,
            cursor: !hasChanges || isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {isSaving ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Changes
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

