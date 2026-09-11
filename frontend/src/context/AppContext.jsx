import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

const STORAGE_KEY = 'studyroute_app_state_v1';

export const AppProvider = ({ children }) => {
  // Load saved state or default
  const savedState = (() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  })();

  const [syllabus, setSyllabus] = useState(savedState?.syllabus || null);
  const [schedule, setSchedule] = useState(savedState?.schedule || null);
  const [metrics, setMetrics] = useState(null);
  const [constraints, setConstraints] = useState(
    savedState?.constraints || {
      available_daily_hours: 3.0,
      preferred_time: 'afternoon',
      start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      rest_days: [6], // Sunday
      max_session_minutes: 90,
    }
  );
  const [rerouteDiff, setRerouteDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(savedState?.demoMode || false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          syllabus,
          schedule,
          constraints,
          demoMode,
        })
      );
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [syllabus, schedule, constraints, demoMode]);

  // Fetch initial schedule or metrics on load if available
  useEffect(() => {
    const initData = async () => {
      try {
        const met = await api.getDashboardMetrics().catch(() => null);
        if (met) setMetrics(met);
        if (!schedule) {
          const currentPlan = await api.getSchedule().catch(() => null);
          if (currentPlan) setSchedule(currentPlan);
        }
      } catch (err) {
        console.warn('Initial data fetch notice:', err.message);
      }
    };
    initData();
  }, []);

  const refreshMetrics = async () => {
    try {
      const met = await api.getDashboardMetrics();
      setMetrics(met);
    } catch (e) {
      // Local fallback calculation if backend temporarily down
      calculateLocalMetrics();
    }
  };

  const calculateLocalMetrics = () => {
    if (!schedule || !schedule.sessions) return;
    const completed = schedule.sessions.filter((s) => s.status === 'completed');
    const missed = schedule.sessions.filter((s) => s.status === 'missed');
    const upcoming = schedule.sessions.filter((s) => s.status === 'upcoming');
    const total = schedule.sessions.length;

    const studiedMins = completed.reduce((acc, s) => acc + (s.actual_minutes_spent || s.duration_minutes), 0);
    const remMins = upcoming.reduce((acc, s) => acc + s.duration_minutes, 0);

    const studiedHrs = +(studiedMins / 60).toFixed(1);
    const remHrs = +(remMins / 60).toFixed(1);
    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const health = !schedule.is_feasible || missed.length >= 3 ? 'AT RISK' : missed.length > 0 ? 'NEEDS ATTENTION' : 'ON TRACK';

    setMetrics({
      overall_progress_percentage: pct,
      plan_health: health,
      plan_health_reason: health === 'ON TRACK' ? 'All sessions on schedule.' : `${missed.length} session(s) require attention.`,
      current_streak_days: completed.length > 0 ? 1 : 0,
      total_hours_studied: studiedHrs,
      total_hours_remaining: remHrs,
      total_sessions_completed: completed.length,
      total_sessions_upcoming: upcoming.length,
      total_sessions_missed: missed.length,
      subject_progress: [],
      upcoming_deadlines: [],
      recent_reroutes: [],
      today_sessions: schedule.sessions.slice(0, 3),
    });
  };

  const loadDemoSyllabus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSampleSyllabus();
      setSyllabus(data);
      setDemoMode(true);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load demo syllabus');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const uploadPDF = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.uploadSyllabus(file, false);
      setSyllabus(data);
      setDemoMode(false);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to process PDF syllabus');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (customConstraints = null) => {
    setLoading(true);
    setError(null);
    const effectiveConstraints = customConstraints || constraints;
    try {
      const plan = await api.generateSchedule(syllabus, effectiveConstraints);
      setSchedule(plan);
      setConstraints(effectiveConstraints);
      await refreshMetrics();
      return plan;
    } catch (err) {
      setError(err.message || 'Failed to generate study plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (sessionId, status, actualMinutes = null, notes = null) => {
    try {
      const updatedPlan = await api.updateSession(sessionId, status, actualMinutes, notes);
      setSchedule(updatedPlan);
      await refreshMetrics();
      return updatedPlan;
    } catch (err) {
      // Local optimistic update
      if (schedule) {
        const copy = { ...schedule, sessions: [...schedule.sessions] };
        const target = copy.sessions.find((s) => s.id === sessionId);
        if (target) {
          target.status = status;
          if (actualMinutes !== null) target.actual_minutes_spent = actualMinutes;
          if (notes !== null) target.notes = notes;
          setSchedule(copy);
          calculateLocalMetrics();
        }
      }
    }
  };

  const applyDisruptionReroute = async (disruptionPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.reroute({
        ...disruptionPayload,
        current_plan: schedule,
        syllabus: syllabus,
      });
      setSchedule(response.new_plan);
      setRerouteDiff(response);
      await refreshMetrics();
      return response;
    } catch (err) {
      setError(err.message || 'Failed to reroute schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        syllabus,
        setSyllabus,
        schedule,
        setSchedule,
        metrics,
        constraints,
        setConstraints,
        rerouteDiff,
        setRerouteDiff,
        loading,
        error,
        setError,
        demoMode,
        loadDemoSyllabus,
        uploadPDF,
        generatePlan,
        updateSession,
        applyDisruptionReroute,
        refreshMetrics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
