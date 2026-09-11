import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Sparkles, Compass, AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, Cpu, Zap, Activity } from 'lucide-react';
import RouteVisualizer from '../components/RouteVisualizer';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '4.5rem 0 3.5rem 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '880px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <span className="badge badge-medium" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>
              <Zap size={13} color="#F59E0B" /> AI EXTRACTS. ALGORITHMS DECIDE.
            </span>
          </div>

          <h1 style={{ marginBottom: '1.5rem', lineHeight: 1.15 }}>
            Your Study Plan Should Adapt to Your <span style={{
              background: 'var(--gradient-brand)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Reality.</span>
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            marginBottom: '2.25rem',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 2.25rem auto',
          }}>
            StudyRoute automatically recalculates your study schedule when reality changes — so one missed session doesn’t destroy your entire plan.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/planner')}
              style={{ minWidth: '220px' }}
            >
              Create My Study Plan <ArrowRight size={18} />
            </button>
            <a
              href="#how-it-works"
              className="btn btn-secondary btn-lg"
            >
              See How It Works
            </a>
          </div>

          {/* Social Proof / Trust Badges */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" /> Zero Spreadsheet Chaos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="var(--accent-emerald)" /> Deterministic Graph Solver
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} color="var(--accent-emerald)" /> Instant Dynamic Reroutes
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Animated Route Visualizer Section */}
      <section style={{ padding: '1rem 0 4rem 0' }}>
        <div className="container">
          <RouteVisualizer />
        </div>
      </section>

      {/* Google Maps Analogy Section */}
      <section id="how-it-works" style={{ padding: '4rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem auto' }}>
            <span className="badge badge-changed" style={{ marginBottom: '0.5rem' }}>PRODUCT POSITIONING</span>
            <h2 style={{ fontSize: '2.1rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>
              Google Maps for Studying
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              When traffic backs up, Google Maps doesn't tell you to start your road trip from scratch. It recalculates the fastest remaining route. StudyRoute brings that exact intelligence to academic timetables.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.75rem',
          }}>
            {/* Old Way */}
            <div className="glass-card" style={{ padding: '2rem', borderTop: '4px solid #EF4444' }}>
              <div style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                The Fragile Way
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', marginBottom: '1rem' }}>Static Timetables Break</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li>❌ One missed session causes crippling schedule debt</li>
                <li>❌ Static calendars blindly shift all topics forward</li>
                <li>❌ Exam deadlines get missed without early warning</li>
                <li>❌ Prerequisite dependencies are ignored or broken</li>
              </ul>
            </div>

            {/* StudyRoute Way */}
            <div className="glass-card" style={{ padding: '2rem', borderTop: '4px solid var(--accent-primary)' }}>
              <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                The StudyRoute Way
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', marginBottom: '1rem' }}>Adaptive Schedule Rerouting</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li>✓ Completed sessions are locked and preserved</li>
                <li>✓ Python Directed Graph respects strict prerequisites</li>
                <li>✓ Multi-factor priority scoring pulls urgent topics earlier</li>
                <li>✓ Feasibility analyzer warns if deadline runway is tight</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Disruption Types Section */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
            <span className="badge badge-medium" style={{ marginBottom: '0.5rem' }}>ADAPTIVE RESILIENCE</span>
            <h2 style={{ fontSize: '2.1rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>
              Supported Reality Disruptions
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Life is unpredictable. StudyRoute provides purpose-built algorithmic handling for all 4 major study disruptions:
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}>
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ color: '#EF4444', marginBottom: '0.75rem' }}>
                <AlertTriangle size={28} />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>1. Missed Session</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Missed Wednesday's OOP block? Instead of blind delays, StudyRoute repacks remaining slots honoring available hours.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ color: '#F59E0B', marginBottom: '0.75rem' }}>
                <Cpu size={28} />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>2. Topic Took Longer</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Struggling with Binary Search Trees? Add 60 extra minutes. Downstream algorithms are postponed safely.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ color: '#3B82F6', marginBottom: '0.75rem' }}>
                <Compass size={28} />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>3. Changed Exam Date</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Exam moved forward from Oct 25 to Oct 20? Urgency scores escalate and relevant subject sessions are boosted forward.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ color: '#A855F7', marginBottom: '0.75rem' }}>
                <Sparkles size={28} />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>4. New Coursework</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Surprise programming lab assigned? Injected into the dependency graph and interleaved before the submission date.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/planner')}>
              Start With Demo Syllabus or Upload PDF <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
