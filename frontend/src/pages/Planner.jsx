import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadSyllabus from '../components/UploadSyllabus';
import SyllabusInsights from '../components/SyllabusInsights';
import ConfigureSchedule from '../components/ConfigureSchedule';
import { useApp } from '../context/AppContext';

export default function Planner() {
  const { syllabus } = useApp();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleFinishConfiguration = () => {
    navigate('/schedule');
  };

  const steps = [
    { num: 1, label: 'Upload Syllabus', desc: 'PDF Ingestion' },
    { num: 2, label: 'AI Insights', desc: 'Understanding' },
    { num: 3, label: 'Constraints', desc: 'Study Route' },
  ];

  const handleStepClick = (idx) => {
    if (idx === 0) {
      setStep(0);
    } else if (idx === 1 && syllabus) {
      setStep(1);
    } else if (idx === 2 && syllabus) {
      setStep(2);
    }
  };

  return (
    <div style={{ padding: '3rem 0 5rem 0' }}>
      <div className="container">
        {/* Clickable Step Progress Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          maxWidth: '580px',
          margin: '0 auto 3rem auto',
        }}>
          {steps.map((s, idx) => {
            const isActive = step === idx;
            const isDone = step > idx;
            const canClick = idx === 0 || !!syllabus;

            return (
              <React.Fragment key={idx}>
                <div
                  onClick={() => canClick && handleStepClick(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: canClick ? 'pointer' : 'not-allowed',
                    opacity: canClick ? 1 : 0.5,
                    transition: 'opacity var(--transition-fast)'
                  }}
                  title={canClick ? `Go to ${s.label}` : 'Upload syllabus first'}
                >
                  <div style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '50%',
                    background: isDone ? '#10B981' : isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `1px solid ${isActive ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                    color: isDone || isActive ? '#FFFFFF' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none',
                    transition: 'all var(--transition-normal)'
                  }}>
                    {isDone ? '✓' : s.num}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                      display: 'block',
                      lineHeight: 1.2
                    }}>
                      {s.label}
                    </span>
                  </div>
                </div>
                {idx < 2 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: isDone ? '#10B981' : 'var(--border-subtle)',
                    transition: 'background var(--transition-normal)'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Views */}
        {step === 0 && <UploadSyllabus onNext={() => setStep(1)} />}
        {step === 1 && <SyllabusInsights onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <ConfigureSchedule onNext={handleFinishConfiguration} onBack={() => setStep(1)} />}
      </div>
    </div>
  );
}
