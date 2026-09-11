import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, FileText, CheckCircle, Sparkles, AlertCircle, ArrowRight,
  Loader2, Cpu, BookOpen, Layers, GitFork, Lightbulb
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function UploadSyllabus({ onNext }) {
  const { uploadPDF, loadDemoSyllabus, loading, error, setError, syllabus } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progressStage, setProgressStage] = useState(0);
  const fileInputRef = useRef(null);

  const stages = [
    { title: 'PDF Ingestion', desc: 'Validating file format and structure' },
    { title: 'Text Extraction', desc: 'Reading document pages via PyMuPDF' },
    { title: 'AI Curriculum Analysis', desc: 'Understanding units, modules, and topics' },
    { title: 'Difficulty & Workload', desc: 'Evaluating study hours and complexity' },
    { title: 'Graph Prerequisite Mapping', desc: 'Establishing acyclic dependency chains' },
    { title: 'Syllabus Understood', desc: 'Synthesizing personalized study insights' },
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setProgressStage(0);
      interval = setInterval(() => {
        setProgressStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
      }, 700);
    } else {
      setProgressStage(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document (.pdf). Other formats are not supported.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('PDF file size must be less than 20MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    try {
      await uploadPDF(selectedFile);
      if (onNext) onNext();
    } catch (e) {
      // Error handled in AppContext
    }
  };

  const handleDemoClick = async () => {
    try {
      await loadDemoSyllabus();
      if (onNext) onNext();
    } catch (e) {
      // Error handled in AppContext
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="badge badge-medium" style={{ marginBottom: '0.5rem' }}>STEP 1: SYLLABUS INGESTION</span>
        <h2 style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '0.5rem', fontWeight: 800 }}>
          Upload Your Syllabus PDF
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto' }}>
          StudyRoute deeply understands your curriculum, extracts topics, evaluates difficulty, maps dependencies, and builds an intelligent study route.
        </p>
      </div>

      {syllabus && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C7D2FE' }}>
            <BookOpen size={16} color="var(--accent-primary)" />
            <span>Currently loaded: <strong>{syllabus.syllabus_title || syllabus.subjects[0]?.name}</strong> ({syllabus.subjects[0]?.topics?.length || 0} topics)</span>
          </div>
          <button
            onClick={onNext}
            style={{ background: 'none', border: 'none', color: '#38BDF8', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            View Current Insights <ArrowRight size={14} />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#FCA5A5',
          fontSize: '0.9rem',
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{error}</div>
        </div>
      )}

      {/* Drag & Drop Card */}
      <div
        className="glass-card"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
          background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-glass-card)',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          marginBottom: '1.5rem',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFile(e.target.files?.[0])}
          accept=".pdf"
          style={{ display: 'none' }}
        />

        <div style={{
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          color: 'var(--accent-primary)',
        }}>
          <UploadCloud size={36} />
        </div>

        {selectedFile ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#FFFFFF', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
              <FileText size={20} color="#38BDF8" /> {selectedFile.name}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
            </p>
          </div>
        ) : (
          <div>
            <h4 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '0.4rem' }}>
              Drop your syllabus PDF here, or <span style={{ color: 'var(--text-accent)' }}>browse files</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Supports academic PDFs up to 20MB (Single or multi-subject curricula)
            </p>
          </div>
        )}
      </div>

      {/* Animated 6-Stage Progress Pipeline during loading */}
      {loading && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Loader2 size={18} className="animate-spin-slow" color="var(--accent-primary)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              StudyRoute is Reading & Understanding Your Syllabus...
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stages.map((stage, idx) => {
              const isPassed = progressStage > idx;
              const isCurrent = progressStage === idx;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    color: isPassed ? '#10B981' : isCurrent ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '1.4rem',
                    height: '1.4rem',
                    borderRadius: '50%',
                    background: isPassed ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isPassed ? '#10B981' : isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)'
                  }}>
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <div>
                    <span style={{ fontWeight: isCurrent ? 600 : 500 }}>{stage.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>— {stage.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
        {selectedFile && (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleUploadSubmit}
            disabled={loading}
            style={{ minWidth: '220px' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin-slow" /> Analyzing Syllabus...
              </>
            ) : (
              <>
                Analyze & Understand Syllabus <ArrowRight size={18} />
              </>
            )}
          </button>
        )}

        <button
          className="btn btn-secondary btn-lg"
          onClick={handleDemoClick}
          disabled={loading}
          style={{
            borderColor: 'rgba(99, 102, 241, 0.4)',
            background: 'rgba(30, 41, 59, 0.8)',
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin-slow" />
          ) : (
            <Sparkles size={18} color="#818CF8" />
          )}
          Use Demo Syllabus (1-Click)
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Demo mode uses real University Computer Science courseware (Java, OOP, Data Structures & Spring APIs).
      </div>
    </div>
  );
}
