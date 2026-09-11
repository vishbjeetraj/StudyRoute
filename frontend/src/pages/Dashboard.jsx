import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Clock, CheckCircle2, AlertTriangle, Route, ArrowRight, Play, RotateCw } from 'lucide-react';
import ProgressCard from '../components/ProgressCard';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { metrics, schedule } = useApp();
  const navigate = useNavigate();

  const todaySessions = metrics?.today_sessions || schedule?.sessions?.slice(0, 2) || [];
  const recentReroutes = metrics?.recent_reroutes || [];
  const deadlines = metrics?.upcoming_deadlines || [];

  return (
    <div style={{ padding: '2.5rem 0 5rem 0' }}>
      <div className="container">
        {/* Dashboard Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>Study Analytics & Health</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              Live metrics computed directly from your active graph schedule.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/schedule')}>
              <Calendar size={16} /> View Timetable
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/planner')}>
              <Route size={16} /> Update Plan
            </button>
          </div>
        </div>

        {/* Progress & Metrics Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <ProgressCard metrics={metrics} />
        </div>

        {/* 2-Column Section: Today's Focus & Upcoming Deadlines */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.75rem',
          marginBottom: '2.5rem',
        }}>
          {/* Today's Focus Card */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>Today's Priority Agenda</h3>
              <span className="badge badge-changed">SCHEDULED TODAY</span>
            </div>

            {todaySessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div>No more sessions scheduled for today!</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Take rest or review completed materials.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-accent)', fontWeight: 600 }}>
                        {session.subject} • {session.start_time} - {session.end_time}
                      </div>
                      <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        {session.topic_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Duration: {session.duration_minutes}m
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/session/${session.id}`)}
                    >
                      <Play size={13} /> Launch
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines & Exam Countdown */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>Exam & Milestone Countdown</h3>
              <span className="badge badge-medium">TARGET HORIZON</span>
            </div>

            {deadlines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <Calendar size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                <div>No explicit exam dates registered.</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Plan completion target: {schedule?.end_date || 'N/A'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {deadlines.map((dl, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.9rem' }}>{dl.title}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Target: {dl.date}</div>
                    </div>
                    <div style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: dl.days_left <= 7 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: dl.days_left <= 7 ? '#F87171' : '#818CF8',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                    }}>
                      {dl.days_left}d remaining
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Reroutes Log */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>Recent Schedule Recalculations</h3>
            <span className="badge badge-unchanged">REROUTE HISTORY</span>
          </div>

          {recentReroutes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No disruptions have occurred yet. If you miss a session or need more time, StudyRoute will log all recalculations here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentReroutes.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-attention" style={{ textTransform: 'uppercase' }}>
                        {r.type.replace('_', ' ')}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      {r.summary}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {r.moved} moved • {r.changed} changed • {r.new || 0} new
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
