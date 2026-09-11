import React from 'react';
import { Award, BookOpen, Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ProgressCard({ metrics }) {
  if (!metrics) return null;

  const {
    overall_progress_percentage,
    plan_health,
    plan_health_reason,
    current_streak_days,
    total_hours_studied,
    total_hours_remaining,
    total_sessions_completed,
    total_sessions_upcoming,
    total_sessions_missed,
    subject_progress = [],
  } = metrics;

  const getHealthBadge = () => {
    if (plan_health === 'ON TRACK') return <span className="badge badge-ontrack">Plan: On Track</span>;
    if (plan_health === 'NEEDS ATTENTION') return <span className="badge badge-attention">Plan: Needs Attention</span>;
    return <span className="badge badge-risk">Plan: At Risk</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top 4 Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {/* Progress % */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL PROGRESS</span>
            <TrendingUp size={16} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
            {overall_progress_percentage}%
          </div>
          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            background: 'var(--bg-primary)',
            borderRadius: '999px',
            marginTop: '0.75rem',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(overall_progress_percentage, 100)}%`,
              height: '100%',
              background: 'var(--gradient-brand)',
              borderRadius: '999px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Study Hours */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>HOURS STUDIED</span>
            <Clock size={16} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
            {total_hours_studied} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>hrs</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {total_hours_remaining} hrs remaining
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SESSIONS DONE</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
            {total_sessions_completed} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>sessions</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {total_sessions_upcoming} upcoming • {total_sessions_missed} missed
          </div>
        </div>

        {/* Streak */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>STUDY STREAK</span>
            <Award size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {current_streak_days} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>days 🔥</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {current_streak_days > 0 ? 'Consistency on target' : 'Complete today session to start streak'}
          </div>
        </div>
      </div>

      {/* Plan Health & Subject Progress Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Plan Health Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF' }}>Plan Health Assessment</h4>
            {getHealthBadge()}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            {plan_health_reason}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculated deterministically based on pace, missed session density, and upcoming exam runways.
          </div>
        </div>

        {/* Subject Progress Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '1rem' }}>Subject Mastery Breakdown</h4>
          {subject_progress.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No active subjects to display yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {subject_progress.map((s, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{s.subject}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {s.completed_hours} / {s.total_hours} hrs ({s.percentage}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'var(--bg-primary)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(s.percentage, 100)}%`,
                      height: '100%',
                      background: idx % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-cyan)',
                      borderRadius: '999px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
