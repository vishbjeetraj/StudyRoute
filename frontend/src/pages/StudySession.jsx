import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, CheckCircle2, AlertTriangle, ArrowLeft, Clock, BookOpen, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function StudySession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schedule, updateSession } = useApp();

  const session = schedule?.sessions?.find((s) => s.id === id);

  const initialDurationSeconds = session ? session.duration_minutes * 60 : 3600;
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [notes, setNotes] = useState(session?.notes || '');
  const [completedNotification, setCompletedNotification] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining]);

  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h3>Session not found</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          The requested study session does not exist in the active plan.
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/schedule')}>
          <ArrowLeft size={16} /> Return to Schedule
        </button>
      </div>
    );
  }

  const elapsedSeconds = initialDurationSeconds - secondsRemaining;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / initialDurationSeconds) * 100));

  const formatTime = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(initialDurationSeconds);
  };

  const handleComplete = async () => {
    const minutesSpent = Math.max(1, Math.round(elapsedSeconds / 60));
    await updateSession(session.id, 'completed', minutesSpent, notes);
    setCompletedNotification(true);
    setTimeout(() => {
      navigate('/schedule');
    }, 1200);
  };

  const handleMarkMissed = async () => {
    await updateSession(session.id, 'missed', 0, notes);
    navigate('/schedule');
  };

  return (
    <div style={{ padding: '3rem 0 5rem 0' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        {/* Back Link */}
        <button
          onClick={() => navigate('/schedule')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Schedule
        </button>

        {completedNotification && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10B981',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            textAlign: 'center',
            color: '#34D399',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            ✓ Session completed! Updating your progress and route...
          </div>
        )}

        {/* Focused Timer Card */}
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          {/* Subject & Topic Title */}
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ color: 'var(--text-accent)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {session.subject}
            </span>
            <h2 style={{ fontSize: '1.85rem', color: '#FFFFFF', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
              {session.topic_name}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span>Duration: {session.duration_minutes}m</span>
              <span>•</span>
              <span>Difficulty: {session.difficulty.toUpperCase()}</span>
            </div>
          </div>

          {/* Large Countdown Display */}
          <div style={{
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            border: '8px solid var(--border-subtle)',
            borderTopColor: 'var(--accent-primary)',
            borderRightColor: progressPct > 50 ? 'var(--accent-cyan)' : 'var(--border-subtle)',
            borderBottomColor: progressPct > 75 ? 'var(--accent-emerald)' : 'var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2.5rem auto',
            background: 'var(--bg-primary)',
            boxShadow: isActive ? '0 0 30px rgba(99, 102, 241, 0.3)' : 'none',
            transition: 'box-shadow 0.3s ease',
          }}>
            <div style={{ fontSize: '3.25rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {formatTime(secondsRemaining)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {formatTime(elapsedSeconds)} elapsed ({progressPct}%)
            </div>
          </div>

          {/* Timer Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              title="Reset Timer"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', padding: 0 }}
            >
              <RotateCcw size={18} />
            </button>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleStartPause}
              style={{ minWidth: '150px', height: '3.25rem', borderRadius: 'var(--radius-full)' }}
            >
              {isActive ? (
                <>
                  <Pause size={18} /> Pause
                </>
              ) : (
                <>
                  <Play size={18} /> {elapsedSeconds > 0 ? 'Resume' : 'Start Focus'}
                </>
              )}
            </button>

            <button
              className="btn btn-success"
              onClick={handleComplete}
              title="Finish & Mark Complete"
              style={{ height: '3rem', padding: '0 1.25rem', borderRadius: 'var(--radius-full)' }}
            >
              <CheckCircle2 size={18} /> Finish
            </button>
          </div>

          {/* Session Notes */}
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <label htmlFor="study-notes" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <FileText size={14} /> Session Notes & Takeaways
            </label>
            <textarea
              id="study-notes"
              rows={3}
              placeholder="Record key breakthroughs, difficult questions, or formulas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Disruptive Actions */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Couldn't finish or need to reschedule?
            </span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleMarkMissed}
            >
              <AlertTriangle size={14} /> Mark as Missed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
