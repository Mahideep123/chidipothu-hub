import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, PlusCircle, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);


  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/properties', icon: Building2, label: 'Properties' },
    { path: '/add-property', icon: PlusCircle, label: 'Add Property' },
  ];

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      width: mobile ? '100%' : '260px',
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      height: mobile ? 'auto' : '100vh',
      position: mobile ? 'relative' : 'fixed',
      top: 0, left: 0,
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', padding: '0 8px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={20} color="white" />
        </div>
        <div>
          <div style={{ color: '#f1f5f9', fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: '16px' }}>
            ChidipothuHub
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>Property Manager</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} onClick={() => setMobileOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '10px', marginBottom: '4px',
              textDecoration: 'none', transition: 'all 0.2s',
              background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
              borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
              color: active ? '#a5b4fc' : '#94a3b8',
            }}>
              <Icon size={18} />
              <span style={{ fontSize: '14px', fontWeight: active ? 600 : 400 }}>{label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
      {/* Desktop sidebar */}
      <div style={{ width: '260px', flexShrink: 0, display: 'block' }}>
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: '#1e293b', padding: '12px 16px',
        alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-header">
        <span style={{ color: '#f1f5f9', fontFamily: "'Manrope',sans-serif", fontWeight: 700 }}>ChidipothuHub</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: '52px', left: 0, right: 0, zIndex: 150 }}>
          <Sidebar mobile />
        </div>
      )}

      {/* Main content */}
      <main style={{
        flex: 1, background: '#f5f7fa', minHeight: '100vh',
        padding: '32px', overflowX: 'hidden',
      }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          main { padding: 72px 16px 16px !important; }
        }
      `}</style>
    </div>
  );
}
