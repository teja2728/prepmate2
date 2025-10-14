import React, { useEffect, useState } from 'react';
import { challengesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, History, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const DailyChallenge = () => {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [{ data: t }, { data: h }] = await Promise.all([
        challengesAPI.today(),
        challengesAPI.history(7),
      ]);
      setToday(t.challenge);
      setHistory(h.history || []);
    } catch (e) {
      console.error('Failed to load daily challenge', e);
      toast.error('Failed to load daily challenge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markCompleted = async () => {
    if (!today?._id) return;
    setSubmitting(true);
    try {
      await challengesAPI.submit({ challengeId: today._id, status: 'completed' });
      toast.success('Marked as completed');
      await load();
    } catch (e) {
      console.error('Submit error', e);
      toast.error('Could not update challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const skipChallenge = async () => {
    if (!today?._id) return;
    setSubmitting(true);
    try {
      await challengesAPI.submit({ challengeId: today._id, status: 'skipped' });
      toast('Challenge skipped');
      await load();
    } catch (e) {
      console.error('Skip error', e);
      toast.error('Could not skip challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshChallenge = async () => {
    setSubmitting(true);
    try {
      const { data } = await challengesAPI.refresh();
      setToday(data.challenge);
      toast.success('New challenge generated');
      // refresh history as well
      const { data: h } = await challengesAPI.history(7);
      setHistory(h.history || []);
    } catch (e) {
      console.error('Refresh error', e);
      toast.error('Could not refresh challenge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Challenge</h1>
          <p className="text-gray-600 mt-2">Stay consistent. Build your streak.</p>
        </div>
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>

      {/* Today's Challenge */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-500">Category • Difficulty</div>
            <h2 className="text-xl font-semibold text-gray-900">
              {today?.challengeType || 'General'} • {today?.difficulty || 'Medium'}
            </h2>
          </div>
          <button
            onClick={() => setShowSolution((s) => !s)}
            className="btn-secondary flex items-center gap-2"
          >
            {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSolution ? 'Hide Solution' : 'Show Solution'}
          </button>
        </div>
        <div className="text-gray-800 whitespace-pre-wrap">{today?.question || 'No challenge found.'}</div>
        {showSolution && (
          <div className="mt-4 p-3 rounded bg-green-50 border text-green-800 whitespace-pre-wrap">
            <div className="text-sm font-semibold mb-1">Solution</div>
            {today?.answer || '—'}
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button
            disabled={submitting || today?.status === 'completed'}
            onClick={markCompleted}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {today?.status === 'completed' ? 'Completed' : 'Mark Completed'}
          </button>
          <button
            disabled={submitting}
            onClick={skipChallenge}
            className="btn-secondary"
          >
            Skip
          </button>
          <button
            disabled={submitting}
            onClick={refreshChallenge}
            className="btn-secondary"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4" />
          <h3 className="text-lg font-semibold text-gray-900">Last 7 Days</h3>
        </div>
        <div className="divide-y">
          {history.length === 0 ? (
            <div className="py-4 text-gray-600">No history yet.</div>
          ) : (
            history.map((c) => (
              <div key={c._id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">
                    {new Date(c.date).toLocaleDateString()} • {c.challengeType || 'General'} • {c.difficulty || 'Medium'}
                  </div>
                  <div className="text-gray-800 line-clamp-2">{c.question}</div>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : c.status === 'skipped'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyChallenge;
