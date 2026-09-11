import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, AlertTriangle, Play, Flame, Filter, Zap, ArrowRight, RotateCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function StudySchedule({ onOpenDisruption }) {
  const { schedule, updateSession, setSchedule } = useApp();
  const [viewMode, setViewMode] = useState('all'); // 'all', 'upcoming', 'completed', 'missed'
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const navigate = useNavigate();

  if (!schedule || !schedule.sessions || schedule.sessions.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', maxWidth: '640px', margin: '2rem auto' }}>
        <Calendar size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>No Active Study Schedule</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Upload a syllabus and configure your availability to generate your deterministic schedule.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/planner')}>
          Create Study Plan <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const subjects = ['ALL', ...Array.from(new Set(schedule.sessions.map((s) => s.subject)))];

  const filteredSessions = schedule.sessions.filter((s) => {
    if (viewMode !== 'all' && s.status !== viewMode) return false;
    if (subjectFilter !== 'ALL' && s.subject !== subjectFilter) return false;
    return true;
  });

  const handleStartSession = (session) => {
    navigate(`/session/${session.id}`);
  };

  const handleMarkComplete = async (e, session) => {
    e.stopPropagation();
    await updateSession(session.id, 'completed', session.duration_minutes);
  };

  const handleMarkMissed = async (e, session) => {
    e.stopPropagation();
    await updateSession(session.id, 'missed');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-ontrack">Completed</span>;
      case 'missed':
        return <span className="badge badge-risk">Missed</span>;
      case 'in_progress':
        return <span className="badge badge-changed">In Progress</span>;
      default:
        return <span className="badge badge-unchanged">Upcoming</span>;
    }
  };

  const getDifficultyBadge = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return <span className="badge badge-easy">Easy</span>;
    if (d === 'hard') return <span className="badge badge-hard">Hard</span>;
    return <span className="badge badge-medium">Medium</span>;
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Reroute Alert Banner */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.75rem',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'var(--accent-primary)',
            width: '2.4rem',
            height: '2.4rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem' }}>
              Did Reality Disrupt Your Study Plan?
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Missed a session? Spent longer on a topic? Exam moved? Recalculate your route algorithmically.
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={onOpenDisruption}
          style={{ whiteSpace: 'nowrap' }}
        >
          <RotateCw size={16} /> Open Disruption Panel
        </button>
      </div>

      {/* Plan Header Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>Study Route Timetable</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {schedule.total_sessions} scheduled sessions • {schedule.total_hours} total study hours • Starts {schedule.start_date} → Ends {schedule.end_date}
          </p>
        </div>

        {/* View & Subject Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
            {['all', 'upcoming', 'completed', 'missed'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewMode === mode ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === mode ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: viewMode === mode ? 600 : 500,
                  fontSize: '0.8rem',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feasibility Warning if present */}
      {!schedule.is_feasible && schedule.feasibility_message && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#FCA5A5',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>{schedule.feasibility_message}</div>
        </div>
      )}

      {/* Sessions Timeline List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              borderLeft: session.status === 'completed'
                ? '4px solid #10B981'
                : session.status === 'missed'
                ? '4px solid #EF4444'
                : '4px solid var(--accent-primary)',
            }}
          >
            {/* Left: Date & Time */}
            <div style={{ minWidth: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FFFFFF', fontWeight: 600, fontSize: '0.95rem' }}>
                <Calendar size={15} color="var(--accent-primary)" /> {session.date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                <Clock size={13} /> {session.start_time} - {session.end_time}
              </div>
            </div>

            {/* Middle: Subject & Topic Details */}
            <div style={{ flex: '1 1 260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {session.subject}
                </span>
                {getDifficultyBadge(session.difficulty)}
                {getStatusBadge(session.status)}
              </div>
              <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 600 }}>{session.topic_name}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Duration: {session.duration_minutes} mins {session.actual_minutes_spent ? `(Spent: ${session.actual_minutes_spent}m)` : ''}
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {session.status !== 'completed' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStartSession(session)}
                  title="Launch active study session timer"
                >
                  <Play size={14} /> Start
                </button>
              )}

              {session.status !== 'completed' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={(e) => handleMarkComplete(e, session)}
                  title="Mark this session completed"
                >
                  <CheckCircle size={14} /> Complete
                </button>
              )}

              {session.status !== 'missed' && session.status !== 'completed' && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleMarkMissed(e, session)}
                  title="Mark as missed"
                >
                  <AlertTriangle size={14} /> Miss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
