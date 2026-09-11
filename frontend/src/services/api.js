const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getSampleSyllabus() {
    const res = await fetch(`${API_BASE}/syllabus/sample`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch sample syllabus');
    }
    return res.json();
  },

  async uploadSyllabus(file = null, useDemo = false) {
    if (useDemo) {
      const formData = new FormData();
      formData.append('use_demo', 'true');
      const res = await fetch(`${API_BASE}/syllabus/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to load demo syllabus');
      }
      return res.json();
    }

    if (!file) throw new Error('No PDF file provided');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_demo', 'false');

    const res = await fetch(`${API_BASE}/syllabus/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to extract syllabus from PDF');
    }
    return res.json();
  },

  async generateSchedule(syllabus, constraints, completedTopics = []) {
    const res = await fetch(`${API_BASE}/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        syllabus,
        constraints,
        completed_topics: completedTopics,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate study schedule');
    }
    return res.json();
  },

  async getSchedule() {
    const res = await fetch(`${API_BASE}/schedule`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch current schedule');
    }
    return res.json();
  },

  async updateSession(sessionId, status, actualMinutesSpent = null, notes = null) {
    const res = await fetch(`${API_BASE}/schedule/update-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        status,
        actual_minutes_spent: actualMinutesSpent,
        notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update session');
    }
    return res.json();
  },

  async reroute(disruptionPayload) {
    const res = await fetch(`${API_BASE}/disruption/reroute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(disruptionPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to reroute schedule');
    }
    return res.json();
  },

  async getDashboardMetrics() {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch dashboard metrics');
    }
    return res.json();
  },

  async askSyllabusQuestion(syllabus, question) {
    const res = await fetch(`${API_BASE}/syllabus/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syllabus, question }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get answer about syllabus');
    }
    return res.json();
  },
};
