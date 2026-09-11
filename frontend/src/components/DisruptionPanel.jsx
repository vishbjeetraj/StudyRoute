import React, { useState } from 'react';
import { X, RotateCw, AlertTriangle, Clock, Calendar, PlusCircle, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DisruptionPanel({ isOpen, onClose, onRerouteSuccess }) {
  const { schedule, syllabus, applyDisruptionReroute, loading, error, setError } = useApp();

  const [activeTab, setActiveTab] = useState('missed_session');

  // Form states
  // 1. Missed Session
  const [selectedSessionId, setSelectedSessionId] = useState(
    schedule?.sessions?.find((s) => s.status !== 'completed')?.id || ''
  );

  // 2. Topic Took Longer
  const [targetTopicId, setTargetTopicId] = useState(
    syllabus?.subjects?.[0]?.topics?.[0]?.id || ''
  );
  const [extraMinutes, setExtraMinutes] = useState(60);

  // 3. Changed Exam Date
  const [targetSubject, setTargetSubject] = useState(
    syllabus?.subjects?.[0]?.name || ''
  );
  const [newExamDate, setNewExamDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // 4. New Coursework
  const [cwSubject, setCwSubject] = useState(syllabus?.subjects?.[0]?.name || 'Computer Science');
  const [cwTopicName, setCwTopicName] = useState('');
  const [cwHours, setCwHours] = useState(3.0);
  const [cwDifficulty, setCwDifficulty] = useState('medium');
  const [cwDeadline, setCwDeadline] = useState(
    new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]
  );
  const [cwPrereq, setCwPrereq] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    let payload = {
      disruption_type: activeTab,
    };

    if (activeTab === 'missed_session') {
      payload.session_id = selectedSessionId || schedule?.sessions?.[0]?.id;
    } else if (activeTab === 'topic_took_longer') {
      payload.topic_id = targetTopicId;
      payload.extra_minutes = parseInt(extraMinutes, 10);
    } else if (activeTab === 'changed_exam_date') {
      payload.subject = targetSubject;
      payload.new_exam_date = newExamDate;
    } else if (activeTab === 'new_coursework') {
      if (!cwTopicName.trim()) {
        setError('Please provide a title for the new coursework.');
        return;
      }
      payload.subject = cwSubject;
      payload.new_topic_name = cwTopicName;
      payload.estimated_hours = parseFloat(cwHours);
      payload.difficulty = cwDifficulty;
      payload.deadline_date = cwDeadline;
      payload.prerequisites = cwPrereq ? [cwPrereq] : [];
    }

    try {
      const result = await applyDisruptionReroute(payload);
      if (onRerouteSuccess) onRerouteSuccess(result);
      onClose();
    } catch (err) {
      // Error in context
    }
  };

  const tabs = [
    { id: 'missed_session', label: 'Missed Session', icon: AlertTriangle, color: '#EF4444' },
    { id: 'topic_took_longer', label: 'Topic Took Longer', icon: Clock, color: '#F59E0B' },
    { id: 'changed_exam_date', label: 'Changed Exam Date', icon: Calendar, color: '#3B82F6' },
    { id: 'new_coursework', label: 'New Coursework', icon: PlusCircle, color: '#A855F7' },
  ];

  const allTopics = syllabus?.subjects ? syllabus.subjects.flatMap((s) => s.topics) : [];
  const subjects = syllabus?.subjects ? syllabus.subjects.map((s) => s.name) : [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(11, 15, 25, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
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
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-attention">GPS REROUTE ENGINE</span>
          </div>
          <h3 style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>Report a Reality Disruption</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            When life changes, don't abandon your study plan. StudyRoute's deterministic graph scheduler will recalculate the remaining journey.
          </p>
        </div>

        {/* Disruption Type Selector Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.65rem',
          marginBottom: '1.75rem',
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={20} color={tab.color} />
                <span style={{ fontSize: '0.775rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Form Content */}
        <form onSubmit={handleSubmit}>
          {/* TAB 1: Missed Session */}
          {activeTab === 'missed_session' && (
            <div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                Select which scheduled study session was missed. Completed sessions will remain locked, and unfinished sessions will be repacked.
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="missed-session-select">Select Missed Session</label>
                <select
                  id="missed-session-select"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  {schedule?.sessions?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} • {s.subject}: {s.topic_name} ({s.duration_minutes}m) [{s.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: Topic Took Longer */}
          {activeTab === 'topic_took_longer' && (
            <div>
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                Did a concept need extra reinforcement? Enter the additional minutes needed. StudyRoute will expand the topic and postpone downstream prerequisites.
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="target-topic-select">Select Topic That Took Longer</label>
                <select
                  id="target-topic-select"
                  value={targetTopicId}
                  onChange={(e) => setTargetTopicId(e.target.value)}
                >
                  {allTopics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Currently {t.estimated_hours}h)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="extra-mins-select">Additional Minutes Needed</label>
                <select
                  id="extra-mins-select"
                  value={extraMinutes}
                  onChange={(e) => setExtraMinutes(e.target.value)}
                >
                  <option value={30}>+30 minutes (Quick review)</option>
                  <option value={60}>+60 minutes (1 extra session)</option>
                  <option value={90}>+90 minutes (Deep dive)</option>
                  <option value={120}>+120 minutes (2 full sessions)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: Changed Exam Date */}
          {activeTab === 'changed_exam_date' && (
            <div>
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                Exam moved earlier or later? StudyRoute will boost the priority weights of all topics for that subject to ensure syllabus mastery before the deadline.
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="target-subject-select">Target Subject</label>
                <select
                  id="target-subject-select"
                  value={targetSubject}
                  onChange={(e) => setTargetSubject(e.target.value)}
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="new-exam-date-input">New Revised Exam Date</label>
                <input
                  id="new-exam-date-input"
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* TAB 4: New Coursework Added */}
          {activeTab === 'new_coursework' && (
            <div>
              <div style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                Add a new assignment or lab project. It will be dynamically injected into the topic dependency graph and slotted before its deadline.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor="cw-title-input">Coursework Title</label>
                  <input
                    id="cw-title-input"
                    type="text"
                    placeholder="e.g. Distributed Cache Project"
                    value={cwTopicName}
                    onChange={(e) => setCwTopicName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cw-subject-select">Subject</label>
                  <select
                    id="cw-subject-select"
                    value={cwSubject}
                    onChange={(e) => setCwSubject(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor="cw-hours-input">Estimated Hours</label>
                  <input
                    id="cw-hours-input"
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    value={cwHours}
                    onChange={(e) => setCwHours(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="cw-difficulty-select">Difficulty</label>
                  <select
                    id="cw-difficulty-select"
                    value={cwDifficulty}
                    onChange={(e) => setCwDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label htmlFor="cw-deadline-input">Submission Deadline Date</label>
                  <input
                    id="cw-deadline-input"
                    type="date"
                    value={cwDeadline}
                    onChange={(e) => setCwDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="cw-prereq-select">Prerequisite Topic</label>
                  <select
                    id="cw-prereq-select"
                    value={cwPrereq}
                    onChange={(e) => setCwPrereq(e.target.value)}
                  >
                    <option value="">None (Can start immediately)</option>
                    {allTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin-slow" /> Recalculating Route...
                </>
              ) : (
                <>
                  <RotateCw size={16} /> Reroute My Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
