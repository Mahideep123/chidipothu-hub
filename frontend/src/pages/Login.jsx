import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { passwordLogin } from '../api';
import { Building2, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await passwordLogin(password);
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Decorative orbs */}
      <div style={{
        position: 'fixed', top: '-120px', right: '-120px', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-80px', left: '-80px', width: '300px', height: '300px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,75,162,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '48px 36px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        animation: 'fadeIn 0.5s ease-out',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          }}>
            <Building2 size={32} color="white" />
          </div>
          <h1 style={{
            color: '#f1f5f9', fontFamily: "'Manrope', sans-serif",
            fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px',
            marginBottom: '6px',
          }}>
            ChidipothuHub
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', letterSpacing: '0.5px' }}>
            Property Management System
          </p>
        </div>

        {/* User badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '12px', padding: '14px 16px',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: '16px', fontWeight: 700, color: '#fff',
          }}>
            SC
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
              SRIDHAR CHIDIPOTHU
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
              Administrator
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <label style={{
            display: 'block', color: '#94a3b8', fontSize: '12px',
            fontWeight: 500, marginBottom: '8px', letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Password
          </label>
          <div style={{ position: 'relative', marginBottom: '28px' }}>
            <div style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: '#64748b', display: 'flex',
            }}>
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 44px 14px 40px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(148, 163, 184, 0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                display: 'flex', padding: '2px',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? 'rgba(99, 102, 241, 0.4)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(102, 126, 234, 0.3)',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.boxShadow = '0 6px 24px rgba(102, 126, 234, 0.45)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', color: '#475569', fontSize: '11px',
          marginTop: '28px', letterSpacing: '0.3px',
        }}>
          Secured access · Powered by ChidipothuHub
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
};

export default Login;
