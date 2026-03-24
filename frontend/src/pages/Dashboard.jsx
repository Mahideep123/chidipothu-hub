import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { Building2, Home, Store, Leaf, Map, Warehouse, MapPin, Globe, Navigation, Flag } from 'lucide-react';

const STAT_CONFIG = [
  { key: 'total', label: 'Total Properties', icon: Building2, color: '#3b82f6', bg: '#dbeafe' },
  { key: 'House', label: 'Houses', icon: Home, color: '#10b981', bg: '#d1fae5' },
  { key: 'Shop', label: 'Shops', icon: Store, color: '#f59e0b', bg: '#fef3c7' },
  { key: 'Agriculture Land', label: 'Agriculture Land', icon: Leaf, color: '#10b981', bg: '#d1fae5' },
  { key: 'Site', label: 'Sites', icon: Map, color: '#8b5cf6', bg: '#e9d5ff' },
  { key: 'Commercial Godown', label: 'Commercial Godown', icon: Warehouse, color: '#ec4899', bg: '#fce7f3' },
];

const LOC_CONFIG = [
  { key: 'states', label: 'States', icon: Globe, color: '#3b82f6' },
  { key: 'districts', label: 'Districts', icon: MapPin, color: '#10b981' },
  { key: 'mandals', label: 'Mandals', icon: Navigation, color: '#ec4899' },
  { key: 'villages', label: 'Villages', icon: Flag, color: '#f59e0b' },
];

const card = { background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading dashboard...</div>;
  if (!data) return <div style={{ color: '#ef4444' }}>Failed to load data</div>;

  return (
    <div>
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#64748b', margin: '0 0 28px', fontSize: '15px' }}>Overview of your property portfolio</p>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {STAT_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
          const value = key === 'total' ? data.total : (data.by_type?.[key] ?? 0);
          return (
            <div key={key} style={{ ...card, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>{label}</p>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: "'Manrope',sans-serif" }}>{value}</p>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location cards */}
      <h2 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>
        Location Summary
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {LOC_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const items = data.locations?.[key] ?? [];
          return (
            <div key={key} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{label}</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color, margin: '0 0 10px', fontFamily: "'Manrope',sans-serif" }}>
                {items.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                {items.slice(0, 5).map((it, i) => (
                  <span key={i} style={{ fontSize: '13px', color: '#64748b' }}>{it.name || '—'}</span>
                ))}
                {items.length > 5 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>+{items.length - 5} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
