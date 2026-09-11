import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Compass, Calendar, LayoutDashboard, Route, Menu, X, Sparkles, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { schedule, metrics } = useApp();
  const navigate = useNavigate();

  const getHealthBadge = () => {
    if (!metrics) return null;
    const h = metrics.plan_health;
    if (h === 'ON TRACK') return <span className="badge badge-ontrack"><Activity size={12} /> On Track</span>;
    if (h === 'NEEDS ATTENTION') return <span className="badge badge-attention"><Activity size={12} /> Needs Attention</span>;
    if (h === 'AT RISK') return <span className="badge badge-risk"><Activity size={12} /> At Risk</span>;
    return null;
  };

  return (
    <header className="glass-panel" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.25rem' }}>
        {/* Brand Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            background: 'var(--gradient-brand)',
            width: '2.4rem',
            height: '2.4rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Route size={22} color="#FFFFFF" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Study<span style={{ color: 'var(--text-accent)' }}>Route</span>
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em', marginTop: '-2px' }}>
              GOOGLE MAPS FOR STUDYING
            </div>
          </div>
        </NavLink>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.925rem',
            })}
          >
            <Compass size={17} /> Home
          </NavLink>

          <NavLink
            to="/planner"
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.925rem',
            })}
          >
            <Sparkles size={17} /> Planner
          </NavLink>

          <NavLink
            to="/schedule"
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.925rem',
            })}
          >
            <Calendar size={17} /> Schedule
          </NavLink>

          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.925rem',
            })}
          >
            <LayoutDashboard size={17} /> Dashboard
          </NavLink>
        </nav>

        {/* Right CTA & Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {getHealthBadge()}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/planner')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Route size={15} /> Create Study Plan
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <NavLink to="/" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-primary)' }}>Home</NavLink>
          <NavLink to="/planner" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-primary)' }}>Planner</NavLink>
          <NavLink to="/schedule" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-primary)' }}>Schedule</NavLink>
          <NavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-primary)' }}>Dashboard</NavLink>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
