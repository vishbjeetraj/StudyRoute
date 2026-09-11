import React from 'react';
import { Check, X, ArrowRight, Route, GitCompare, HelpCircle, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export default function RerouteResult({ rerouteData, onClose }) {
  if (!rerouteData) return null;

  const { old_plan, new_plan, diffs, explanation, moved_count, changed_count, unchanged_count, new_count } = rerouteData;

  const getDiffBadge = (diffType) => {
    switch (diffType) {
      case 'moved':
        return <span className="badge badge-moved">Moved</span>;
      case 'changed':
        return <span className="badge badge-changed">Changed</span>;
      case 'new':
        return <span className="badge badge-new">New</span>;
      default:
        return <span className="badge badge-unchanged">Unchanged</span>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        overflowY: 'auto',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          aria-label="Close diff modal"
        >
          <X size={22} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-ontrack">REROUTE COMPLETE</span>
          </div>
          <h3 style={{ fontSize: '1.65rem', color: '#FFFFFF' }}>New Study Route Calculated</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            The graph solver has accommodated your disruption and generated an updated schedule.
          </p>
        </div>

        {/* 4 Summary Metric Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: '#FBBF24', fontWeight: 600 }}>MOVED SESSIONS</div>
            <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 800 }}>{moved_count}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 600 }}>CHANGED SESSIONS</div>
            <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 800 }}>{changed_count}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>UNCHANGED</div>
            <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 800 }}>{unchanged_count}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: '#C084FC', fontWeight: 600 }}>NEW SESSIONS</div>
            <div style={{ fontSize: '1.5rem', color: '#FFFFFF', fontWeight: 800 }}>{new_count}</div>
          </div>
        </div>

        {/* Algorithmic Explanation Cards: What Changed, Why, What Stayed Same */}
        <div className="glass-card" style={{
          padding: '1.5rem',
          background: 'var(--bg-primary)',
          marginBottom: '2rem',
          borderLeft: '4px solid var(--accent-primary)',
        }}>
          <h4 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HelpCircle size={18} color="var(--accent-primary)" /> Algorithmic Reasoning
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <strong style={{ color: 'var(--accent-amber)' }}>What Changed: </strong>
              <span style={{ color: 'var(--text-secondary)' }}>{explanation.what_changed}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-blue)' }}>Why: </strong>
              <span style={{ color: 'var(--text-secondary)' }}>{explanation.why}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-emerald)' }}>What Stayed the Same: </strong>
              <span style={{ color: 'var(--text-secondary)' }}>{explanation.what_stayed_the_same}</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}>
          {/* Old Plan */}
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>PREVIOUS PLAN</h4>
              <span className="badge badge-unchanged">OLD</span>
            </div>
            <div style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 700, marginBottom: '0.25rem' }}>
              {old_plan.total_sessions} Sessions • {old_plan.total_hours} Hours
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Completed on: {old_plan.end_date}
            </div>
          </div>

          {/* New Plan */}
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-accent)' }}>NEW STUDY ROUTE</h4>
              <span className="badge badge-ontrack">OPTIMIZED</span>
            </div>
            <div style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 700, marginBottom: '0.25rem' }}>
              {new_plan.total_sessions} Sessions • {new_plan.total_hours} Hours
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Completed on: {new_plan.end_date} {new_plan.is_feasible ? '✓ Feasible' : '⚠ Tight runway'}
            </div>
          </div>
        </div>

        {/* Detailed Session Diffs Table */}
        <h4 style={{ fontSize: '1rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>Session Modification Breakdown</h4>
        <div style={{
          maxHeight: '260px',
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-primary)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 1rem' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem' }}>Subject & Topic</th>
                <th style={{ padding: '0.65rem 1rem' }}>Scheduled Date</th>
                <th style={{ padding: '0.65rem 1rem' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.65rem 1rem' }}>{getDiffBadge(d.diff_type)}</td>
                  <td style={{ padding: '0.65rem 1rem', color: '#FFFFFF', fontWeight: 500 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.subject}</div>
                    {d.topic_name}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                    {d.old_date && d.old_date !== d.new_date ? (
                      <div>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{d.old_date}</span>
                        {' → '}
                        <strong style={{ color: '#FBBF24' }}>{d.new_date}</strong>
                      </div>
                    ) : (
                      <span>{d.new_date || d.old_date}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                    {d.change_reason || 'Maintained'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
          <button className="btn btn-primary" onClick={onClose}>
            <CheckCircle2 size={16} /> Apply New Route & View Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
