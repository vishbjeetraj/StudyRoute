import React, { useState } from 'react';
import {
  CheckCircle2, BookOpen, Clock, AlertTriangle, Sparkles, ArrowRight,
  ArrowLeft, Search, Filter, HelpCircle, Send, Loader2, Layers,
  Compass, ShieldAlert, Award, Calendar, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function SyllabusInsights({ onNext, onBack }) {
  const { syllabus } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyHoursEstimate, setDailyHoursEstimate] = useState(3.0);
  const [expandedTopicIds, setExpandedTopicIds] = useState(new Set());

  // Q&A State
  const [userQuestion, setUserQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  if (!syllabus || !syllabus.subjects || syllabus.subjects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No syllabus data loaded. Please upload a syllabus PDF or select Demo mode.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Upload
        </button>
      </div>
    );
  }

  const subject = syllabus.subjects[0];

  // Extra anti-boilerplate filter on the frontend to guarantee zero garbage topics
  const isJunkTopic = (name) => {
    if (!name) return true;
    const lower = name.toLowerCase();
    const junkTokens = [
      'this is a single', 'concatenated file', 'suitable for printing', 'saving as a pdf',
      'available as a concatenated', 'missing content pages', 'pm et', 'am et', '00-8-30',
      'click here', 'download pdf', 'all rights reserved', 'copyright'
    ];
    return junkTokens.some((tok) => lower.includes(tok));
  };

  const allTopics = syllabus.subjects.flatMap((s) => s.topics).filter((t) => !isJunkTopic(t.name));

  const analysis = syllabus.overall_analysis || {
    total_topics: allTopics.length,
    estimated_hours: allTopics.reduce((acc, t) => acc + t.estimated_hours, 0),
    easy_topics: allTopics.filter((t) => t.difficulty === 'easy').length,
    medium_topics: allTopics.filter((t) => t.difficulty === 'medium').length,
    hard_topics: allTopics.filter((t) => t.difficulty === 'hard').length,
  };

  const guidance = syllabus.study_guidance || {
    recommended_strategy: 'Start with foundational concepts before moving to complex modules.',
    high_priority_topics: allTopics.slice(0, 3).map((t) => t.name),
    topics_requiring_prerequisites: allTopics.filter((t) => t.prerequisites?.length > 0).map((t) => t.name).slice(0, 3),
    potentially_difficult_areas: allTopics.filter((t) => t.difficulty === 'hard').map((t) => t.name).slice(0, 3),
  };

  // Determine starting topics (topics with 0 prerequisites)
  const startingTopics = allTopics.filter((t) => !t.prerequisites || t.prerequisites.length === 0).slice(0, 4);

  // Time requirement calculation
  const estimatedDays = Math.max(1, Math.ceil(analysis.estimated_hours / (dailyHoursEstimate || 3)));

  // Filter topics
  const filteredTopics = allTopics.filter((topic) => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (topic.unit && topic.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'easy') return topic.difficulty === 'easy';
    if (activeFilter === 'medium') return topic.difficulty === 'medium';
    if (activeFilter === 'hard') return topic.difficulty === 'hard';
    if (activeFilter === 'high') return topic.importance === 'high';
    return true;
  });

  // Group filtered topics by unit
  const groupedByUnit = filteredTopics.reduce((acc, topic) => {
    const unitName = topic.unit || 'Core Curriculum';
    if (!acc[unitName]) acc[unitName] = [];
    acc[unitName].push(topic);
    return acc;
  }, {});

  const toggleTopicExpand = (id) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAskQuestion = async (qText) => {
    const questionToAsk = qText || userQuestion;
    if (!questionToAsk.trim() || qaLoading) return;

    setQaLoading(true);
    const newEntry = { question: questionToAsk, answer: '' };
    setChatHistory((prev) => [...prev, newEntry]);
    setUserQuestion('');

    try {
      const res = await api.askSyllabusQuestion(syllabus, questionToAsk);
      setChatHistory((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].answer = res.answer;
        return copy;
      });
    } catch (err) {
      setChatHistory((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].answer = `Failed to get an answer: ${err.message}`;
        return copy;
      });
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
      {/* 1. Header & Understanding Badge */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#10B981',
              color: '#FFFFFF',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.04em'
            }}>
              <CheckCircle2 size={16} /> SYLLABUS UNDERSTOOD ✓
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Deep Curriculum Analysis Complete
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onBack} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <ArrowLeft size={15} /> Upload Different PDF
            </button>
            <button className="btn btn-primary" onClick={onNext} style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
              Configure Route <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <h1 style={{ fontSize: '2.1rem', color: '#FFFFFF', marginBottom: '0.6rem', fontWeight: 800 }}>
          {syllabus.syllabus_title || `${subject.name} Syllabus`}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.025rem', lineHeight: 1.6, maxWidth: '850px' }}>
          {syllabus.summary || subject.summary || `StudyRoute analyzed this document. We structured ${analysis.total_topics} topics across ${analysis.estimated_hours} estimated hours.`}
        </p>
      </div>

      {/* 2. Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects / Units</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{Object.keys(groupedByUnit).length || syllabus.subjects.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subject.name}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Topics</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{analysis.total_topics}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Authentic curriculum topics</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Time</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{analysis.estimated_hours}h</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total curriculum workload</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficult Topics</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{analysis.hard_topics}</div>
            <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem', marginTop: '2px' }}>
              <span style={{ color: '#10B981' }}>{analysis.easy_topics} Easy</span> •
              <span style={{ color: '#EAB308' }}> {analysis.medium_topics} Med</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dual Insights Grid: "What Should I Study First?" & "How Much Time Do I Need?" */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* What Should I Study First? */}
        <div className="glass-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Compass size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 700 }}>What Should I Study First?</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Our graph algorithm evaluated the prerequisite topology of {subject.name}. Start with these zero-prerequisite foundational topics:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {startingTopics.map((topic, idx) => (
              <div key={topic.id} style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '1.6rem',
                  height: '1.6rem',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>{topic.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topic.unit || 'Foundational'} • {topic.estimated_hours}h</div>
                </div>
                <span className={`badge badge-${topic.difficulty}`}>{topic.difficulty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How Much Time Do I Need? */}
        <div className="glass-card" style={{ padding: '1.75rem', borderLeft: '4px solid #38BDF8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Calendar size={20} color="#38BDF8" />
            <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 700 }}>How Much Time Do I Need?</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Total curriculum requires <strong>{analysis.estimated_hours} hours</strong>. Calculate your study timeline based on daily availability:
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Daily Study Availability:</span>
              <span style={{ color: '#38BDF8', fontWeight: 700 }}>{dailyHoursEstimate} hours / day</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={dailyHoursEstimate}
              onChange={(e) => setDailyHoursEstimate(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38BDF8' }}
            />
          </div>

          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            fontSize: '0.875rem',
            color: '#FFFFFF'
          }}>
            At <strong>{dailyHoursEstimate} hours/day</strong>, you will cover this entire syllabus in approximately <strong>{estimatedDays} study days</strong> (excluding scheduled rest days).
          </div>
        </div>
      </div>

      {/* 4. StudyRoute Recommendations Banner */}
      <div className="glass-card" style={{
        padding: '1.5rem 1.75rem',
        marginBottom: '2.5rem',
        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <h4 style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 700 }}>StudyRoute Recommendations</h4>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {guidance.recommended_strategy}
        </p>
        {guidance.potentially_difficult_areas?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#F87171', fontWeight: 600 }}>High Focus Topics:</span>
            {guidance.potentially_difficult_areas.map((topicName, idx) => (
              <span key={idx} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {topicName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Topic Breakdown — Compact, Expandable, Grouped by Unit */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', fontWeight: 700 }}>Topic Breakdown</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Curriculum breakdown grouped by unit. Click any topic to view its concise description and exam rationale.
            </p>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            {['all', 'easy', 'medium', 'hard', 'high'].map((filt) => (
              <button
                key={filt}
                onClick={() => setActiveFilter(filt)}
                style={{
                  background: activeFilter === filt ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: activeFilter === filt ? '#FFFFFF' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontWeight: activeFilter === filt ? 600 : 500
                }}
              >
                {filt === 'high' ? 'High Priority' : filt}
              </button>
            ))}
          </div>
        </div>

        {/* Units Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(groupedByUnit).map(([unitName, topicsInUnit], uIdx) => (
            <div key={uIdx} className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={17} color="var(--accent-primary)" />
                  <h4 style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {unitName}
                  </h4>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {topicsInUnit.length} topic{topicsInUnit.length > 1 ? 's' : ''} • {topicsInUnit.reduce((acc, t) => acc + t.estimated_hours, 0)}h
                </span>
              </div>

              {/* Compact Topic Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topicsInUnit.map((topic, tIdx) => {
                  const isExpanded = expandedTopicIds.has(topic.id);
                  return (
                    <div
                      key={topic.id}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Compact Clickable Row Header */}
                      <div
                        onClick={() => toggleTopicExpand(topic.id)}
                        style={{
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '1.4rem' }}>
                            {tIdx + 1}.
                          </span>
                          <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#FFFFFF' }}>
                            {topic.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge badge-${topic.difficulty}`}>{topic.difficulty}</span>
                          <span style={{ fontSize: '0.8rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={12} /> {topic.estimated_hours}h
                          </span>
                          {topic.importance === 'high' && (
                            <span style={{ fontSize: '0.7rem', color: '#C084FC', background: 'rgba(192, 132, 252, 0.12)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              High
                            </span>
                          )}
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            aria-label="Expand topic details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Explanation Details */}
                      {isExpanded && (
                        <div style={{
                          padding: '0.75rem 1rem 1rem 2.4rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ marginBottom: '0.5rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                            <strong style={{ color: '#FFFFFF' }}>What it is: </strong>
                            {topic.description || `Core academic concept in ${unitName}.`}
                          </div>
                          {topic.why_it_matters && (
                            <div style={{ marginBottom: '0.5rem', color: '#93C5FD', lineHeight: 1.5 }}>
                              <strong style={{ color: '#BFDBFE' }}>Why it matters: </strong>
                              {topic.why_it_matters}
                            </div>
                          )}
                          {topic.prerequisites?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FBBF24', fontSize: '0.775rem' }}>
                              <span>Prerequisites:</span>
                              {topic.prerequisites.map((pId, idx) => (
                                <span key={idx} style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                                  {pId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. "Ask About Your Syllabus" Assistant */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <HelpCircle size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 700 }}>Ask About Your Syllabus</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Ask any question regarding {subject.name}. Our assistant provides guidance grounded strictly within your uploaded syllabus.
        </p>

        {/* Quick Question Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            'What should I study first?',
            'Which topics are most difficult?',
            'How many hours will I need?',
            'What are the key prerequisites?'
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(promptText)}
              disabled={qaLoading}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#C7D2FE',
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.775rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Q&A Chat Display */}
        {chatHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            {chatHistory.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.4rem' }}>
                  Q: {item.question}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#E2E8F0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {item.answer ? item.answer : <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Loader2 size={14} className="animate-spin-slow" /> Analyzing syllabus...</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            type="text"
            placeholder={`Ask a question about ${subject.name}...`}
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAskQuestion(); }}
            disabled={qaLoading}
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleAskQuestion()}
            disabled={qaLoading || !userQuestion.trim()}
            style={{ minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {qaLoading ? <Loader2 size={16} className="animate-spin-slow" /> : <Send size={16} />}
            Ask
          </button>
        </div>
      </div>

      {/* 7. Bottom Navigation CTAs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button className="btn btn-secondary btn-lg" onClick={onBack}>
          <ArrowLeft size={18} /> Upload Different PDF
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Proceed to Study Constraints <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
