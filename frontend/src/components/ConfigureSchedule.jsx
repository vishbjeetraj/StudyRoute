import React, { useState } from 'react';
import { Settings, Calendar, Clock, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ConfigureSchedule({ onNext, onBack }) {
  const { constraints, setConstraints, generatePlan, loading, error, syllabus } = useApp();

  const [dailyHours, setDailyHours] = useState(constraints.available_daily_hours || 3.0);
  const [preferredTime, setPreferredTime] = useState(constraints.preferred_time || 'afternoon');
  const [startDate, setStartDate] = useState(constraints.start_date || new Date().toISOString().split('T')[0]);
  const [restDays, setRestDays] = useState(constraints.rest_days || [6]); // Sunday = 6
  const [maxSessionMins, setMaxSessionMins] = useState(constraints.max_session_minutes || 90);

  const daysOfWeek = [
    { label: 'Mon', val: 0 },
    { label: 'Tue', val: 1 },
    { label: 'Wed', val: 2 },
    { label: 'Thu', val: 3 },
    { label: 'Fri', val: 4 },
    { label: 'Sat', val: 5 },
    { label: 'Sun', val: 6 },
  ];

  const toggleRestDay = (val) => {
    if (restDays.includes(val)) {
      setRestDays(restDays.filter((d) => d !== val));
    } else {
      setRestDays([...restDays, val]);
    }
  };

  // Real-time feasibility estimation
  const totalSyllabusHours = syllabus?.subjects
    ? syllabus.subjects.flatMap((s) => s.topics).reduce((acc, t) => acc + t.estimated_hours, 0)
    : 30;

  const activeDaysPerWeek = 7 - restDays.length;
  const weeklyStudyCapacity = activeDaysPerWeek * dailyHours;
  const estimatedWeeksNeeded = weeklyStudyCapacity > 0 ? (totalSyllabusHours / weeklyStudyCapacity).toFixed(1) : '∞';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newConstraints = {
      available_daily_hours: parseFloat(dailyHours),
      preferred_time: preferredTime,
      start_date: startDate,
      rest_days: restDays,
      max_session_minutes: parseInt(maxSessionMins, 10),
    };
    try {
      await generatePlan(newConstraints);
      if (onNext) onNext();
    } catch (err) {
      // Error handled in AppContext
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="badge badge-medium" style={{ marginBottom: '0.5rem' }}>STEP 3: GRAPH CONSTRAINTS</span>
        <h2 style={{ fontSize: '1.85rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>
          Configure Your Study Reality
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Define your availability. The deterministic Python graph scheduler builds an optimal study timeline around these constraints.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#FCA5A5',
          fontSize: '0.9rem',
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
          {/* Daily Available Hours */}
          <div>
            <label htmlFor="daily-hours">Daily Available Study Hours: <strong style={{ color: '#FFFFFF' }}>{dailyHours} hrs</strong></label>
            <input
              id="daily-hours"
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={dailyHours}
              onChange={(e) => setDailyHours(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', marginBottom: '0.25rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>1 hr/day (Casual)</span>
              <span>4 hrs/day (Intensive)</span>
              <span>8 hrs/day (Bootcamp)</span>
            </div>
          </div>

          {/* Preferred Study Time */}
          <div>
            <label htmlFor="preferred-time">Preferred Study Time Slot</label>
            <select
              id="preferred-time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            >
              <option value="morning">Morning (Starts 09:00 AM)</option>
              <option value="afternoon">Afternoon (Starts 02:00 PM)</option>
              <option value="evening">Evening (Starts 06:00 PM)</option>
              <option value="flexible">Flexible (Midday 10:00 AM)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start-date">Plan Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          {/* Max Session Length */}
          <div>
            <label htmlFor="max-session-chunk">Max Continuous Session Chunk</label>
            <select
              id="max-session-chunk"
              value={maxSessionMins}
              onChange={(e) => setMaxSessionMins(e.target.value)}
            >
              <option value={45}>45 minutes (Pomodoro style)</option>
              <option value={60}>60 minutes (Standard lecture)</option>
              <option value={90}>90 minutes (Deep work block)</option>
              <option value={120}>120 minutes (Intensive workshop)</option>
            </select>
          </div>
        </div>

        {/* Rest Days Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ marginBottom: '0.6rem' }}>Designated Rest Days (No study sessions will be scheduled)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {daysOfWeek.map((day) => {
              const isSelected = restDays.includes(day.val);
              return (
                <button
                  key={day.val}
                  type="button"
                  onClick={() => toggleRestDay(day.val)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-tertiary)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {day.label} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Feasibility Card */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ESTIMATED PACE ANALYSIS</div>
            <div style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 600 }}>
              {weeklyStudyCapacity} hours / week capacity • ~{estimatedWeeksNeeded} weeks to complete syllabus
            </div>
          </div>
          {activeDaysPerWeek === 0 ? (
            <span className="badge badge-risk">0 STUDY DAYS SELECTED</span>
          ) : weeklyStudyCapacity < 5 ? (
            <span className="badge badge-attention">TIGHT STUDY PACE</span>
          ) : (
            <span className="badge badge-ontrack">BALANCED SCHEDULE</span>
          )}
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={loading}>
            <ArrowLeft size={16} /> Back
          </button>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || activeDaysPerWeek === 0}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin-slow" /> Running Graph Solver...
              </>
            ) : (
              <>
                Generate Deterministic Plan <Sparkles size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
