import React from 'react';
import { BookOpen, Clock, GitFork, ArrowRight, ArrowLeft, Calendar, FileCheck, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SyllabusPreview({ onNext, onBack }) {
  const { syllabus } = useApp();

  if (!syllabus || !syllabus.subjects) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p>No syllabus loaded. Please go back and upload a syllabus or select Demo mode.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Upload
        </button>
      </div>
    );
  }

  // Calculate totals
  const allTopics = syllabus.subjects.flatMap((s) => s.topics);
  const totalHours = allTopics.reduce((acc, t) => acc + t.estimated_hours, 0);

  const getDifficultyBadge = (diff) => {
    const d = diff.toLowerCase();
    if (d === 'easy') return <span className="badge badge-easy">Easy</span>;
    if (d === 'hard') return <span className="badge badge-hard">Hard</span>;
    return <span className="badge badge-medium">Medium</span>;
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-medium" style={{ marginBottom: '0.5rem' }}>STEP 2: STRUCTURED SYLLABUS</span>
          <h2 style={{ fontSize: '1.85rem', color: '#FFFFFF' }}>Extracted Syllabus & Prerequisites</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            AI has structured {syllabus.subjects.length} subject(s), {allTopics.length} topics, and {totalHours.toFixed(1)} total study hours.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="btn btn-primary" onClick={onNext}>
            Configure Constraints <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Deadlines Banner if available */}
      {(syllabus.exam_dates?.length > 0 || syllabus.coursework_deadlines?.length > 0) && (
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--accent-primary)" /> Key Academic Deadlines Detected
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem' }}>
            {syllabus.exam_dates?.map((e, idx) => (
              <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{e.subject} Exam:</span> {e.exam_date}
              </div>
            ))}
            {syllabus.coursework_deadlines?.map((c, idx) => (
              <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{c.title}:</span> {c.deadline_date} ({c.estimated_hours}h)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {syllabus.subjects.map((subject, sIdx) => {
          const subjHours = subject.topics.reduce((acc, t) => acc + t.estimated_hours, 0);
          return (
            <div key={sIdx} className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '2.2rem',
                    height: '2.2rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                  }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>{subject.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {subject.topics.length} topics • {subjHours.toFixed(1)} estimated hours
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}>
                {subject.topics.map((topic) => (
                  <div
                    key={topic.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 600 }}>{topic.name}</h4>
                        {getDifficultyBadge(topic.difficulty)}
                      </div>
                      {topic.unit && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                          {topic.unit}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} color="#38BDF8" /> {topic.estimated_hours}h
                      </div>

                      {topic.prerequisites?.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#FBBF24', fontSize: '0.75rem' }} title={`Prerequisites: ${topic.prerequisites.join(', ')}`}>
                          <GitFork size={13} /> {topic.prerequisites.length} prereq{topic.prerequisites.length > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foundational</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Proceed to Study Constraints <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
