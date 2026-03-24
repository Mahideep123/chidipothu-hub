import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const DEFAULT_USER = 'CHIDIPOTHU SRIDHAR';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLogin = async () => {
    if (!password) { toast.error('Please enter password'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/password-login`, { password });
      localStorage.setItem('ch_token', res.data.token);
      localStorage.setItem('ch_user', res.data.user || DEFAULT_USER);
      toast.success('Welcome, ' + (res.data.user || DEFAULT_USER) + '!');
      onLogin();
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error(err.response?.data?.detail || 'Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', sans-serif", padding: '20px',
    }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .shake { animation: shake 0.5s ease; }
      `}</style>

      <div className={shake ? 'shake' : ''} style={{
        background: '#fff', borderRadius: '20px', padding: '44px 40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Lock icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            Chidipothu Hub
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Property Management System</p>
        </div>

        {/* Username shown by default, not editable */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            User Name
          </label>
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: 600, letterSpacing: '0.3px' }}>{DEFAULT_USER}</span>
          </div>
        </div>

        {/* Password input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your password"
              autoFocus
              style={{
                width: '100%', padding: '13px 44px 13px 42px', borderRadius: '10px',
                border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', color: '#1e293b', transition: 'border-color 0.2s',
                fontFamily: "'Inter', sans-serif",
              }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            {/* Show/hide toggle */}
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                padding: '4px', display: 'flex', alignItems: 'center',
              }}
            >
              {showPass ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Access button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s', letterSpacing: '0.3px',
          }}
        >
          {loading ? 'Checking...' : 'Access Property Hub'}
        </button>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '20px', marginBottom: 0 }}>
          Secure access to your property management system
        </p>
      </div>
    </div>
  );
}
