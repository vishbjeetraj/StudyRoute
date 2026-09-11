import React, { useState, useEffect } from 'react';
import { Route, AlertTriangle, Cpu, CheckCircle2, ArrowRight, RotateCw, Play, Pause } from 'lucide-react';

export default function RouteVisualizer() {
  const [step, setStep] = useState(0); // 0: Original, 1: Disrupted, 2: Solving, 3: Rerouted
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const stepsInfo = [
    {
      title: "1. Deterministic Baseline Route",
      badge: "PLANNED ROUTE",
      badgeClass: "badge-ontrack",
      desc: "Topological graph sequence mapped to calendar slots according to topic prerequisites.",
    },
    {
      title: "2. Reality Disruption Detected",
      badge: "DISRUPTION: MISSED SESSION",
      badgeClass: "badge-risk",
      desc: "Wednesday session missed. Static schedules would fail or push every single future date blindly.",
    },
    {
      title: "3. Graph Solver Recalculating",
      badge: "ALGORITHM IN PROGRESS",
      badgeClass: "badge-changed",
      desc: "Python Directed Graph recomputes in-degrees, evaluates exam deadlines, and re-optimizes available hours.",
    },
    {
      title: "4. Optimal Rerouted Schedule",
      badge: "NEW ROUTE GENERATED",
      badgeClass: "badge-ontrack",
      desc: "Completed work strictly preserved. Remaining sessions repacked without overflowing target exam dates.",
    },
  ];

  return (
    <div className="glass-card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className={`badge ${stepsInfo[step].badgeClass}`}>{stepsInfo[step].badge}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Step {step + 1} of 4</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF' }}>{stepsInfo[step].title}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>{stepsInfo[step].desc}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setStep((step + 1) % 4)}
            title="Next Step"
          >
            <RotateCw size={14} /> Step
          </button>
        </div>
      </div>

      {/* Visual Roadmap Canvas */}
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '2rem 1.5rem',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        minHeight: '220px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Step Indicator Circles */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '850px',
          position: 'relative',
          zIndex: 2,
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          {/* Node 1: Java Basics */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: '1 1 140px',
          }}>
            <div style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
              marginBottom: '0.6rem',
              transition: 'all 0.3s ease',
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF' }}>Java Basics</div>
            <div style={{ fontSize: '0.725rem', color: '#10B981' }}>COMPLETED (Sep 12)</div>
          </div>

          <ArrowRight size={20} color="var(--text-muted)" style={{ display: 'none' }} className="node-arrow" />

          {/* Node 2: Java OOP */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: '1 1 140px',
          }}>
            <div style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              background: step === 1
                ? 'rgba(239, 68, 68, 0.25)'
                : step === 2
                ? 'rgba(245, 158, 11, 0.25)'
                : step === 3
                ? 'rgba(99, 102, 241, 0.25)'
                : 'rgba(59, 130, 246, 0.2)',
              border: `2px solid ${
                step === 1 ? '#EF4444' : step === 2 ? '#F59E0B' : step === 3 ? '#6366F1' : '#3B82F6'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: step === 1 ? '#F87171' : step === 2 ? '#FBBF24' : '#818CF8',
              boxShadow: step === 1 ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(99, 102, 241, 0.3)',
              marginBottom: '0.6rem',
              transition: 'all 0.4s ease',
              animation: step === 1 ? 'pulseGlow 1.5s infinite' : step === 2 ? 'spinSlow 6s linear infinite' : 'none',
            }}>
              {step === 1 ? <AlertTriangle size={22} /> : step === 2 ? <Cpu size={22} /> : <Route size={22} />}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF' }}>Classes & OOP</div>
            <div style={{
              fontSize: '0.725rem',
              color: step === 1 ? '#EF4444' : step === 3 ? '#818CF8' : 'var(--text-muted)',
              fontWeight: 500,
            }}>
              {step === 0 && 'Planned (Sep 14)'}
              {step === 1 && 'MISSED (Sep 14)'}
              {step === 2 && 'Graph Rerouting...'}
              {step === 3 && 'REROUTED (Sep 15)'}
            </div>
          </div>

          <ArrowRight size={20} color="var(--text-muted)" style={{ display: 'none' }} className="node-arrow" />

          {/* Node 3: Data Structures */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: '1 1 140px',
          }}>
            <div style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              background: step === 3 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.8)',
              border: `2px solid ${step === 3 ? '#3B82F6' : 'var(--border-subtle)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: step === 3 ? '#60A5FA' : 'var(--text-muted)',
              marginBottom: '0.6rem',
              transition: 'all 0.4s ease',
            }}>
              <Route size={20} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF' }}>Data Structures</div>
            <div style={{ fontSize: '0.725rem', color: step === 3 ? '#60A5FA' : 'var(--text-muted)' }}>
              {step === 3 ? 'Shifted (Sep 17)' : 'Planned (Sep 16)'}
            </div>
          </div>

          <ArrowRight size={20} color="var(--text-muted)" style={{ display: 'none' }} className="node-arrow" />

          {/* Node 4: Exam Target */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: '1 1 140px',
          }}>
            <div style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: '50%',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '2px solid #A855F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C084FC',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)',
              marginBottom: '0.6rem',
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF' }}>Target Exam</div>
            <div style={{ fontSize: '0.725rem', color: '#C084FC' }}>Oct 15 (ON TRACK)</div>
          </div>
        </div>
      </div>

      {/* Step Pills Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => { setStep(idx); setIsPlaying(false); }}
            style={{
              width: idx === step ? '2rem' : '0.65rem',
              height: '0.45rem',
              borderRadius: '9999px',
              background: idx === step ? 'var(--accent-primary)' : 'var(--border-subtle)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            aria-label={`Jump to step ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
