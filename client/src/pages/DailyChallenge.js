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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="loading-spinner"></div>
          <p className="mt-3 text-gray-600">Loading your challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="section-title">Daily Challenge</h1>
          <p className="text-sm text-gray-600 mt-1">Stay consistent. Build your streak.</p>
        </div>
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>

      {/* Today's Challenge */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Category • Difficulty</div>
            <h2 className="text-xl font-semibold text-gray-900">
              {today?.challengeType || 'General'} • <span className="text-gray-700">{today?.difficulty || 'Medium'}</span>
            </h2>
          </div>
          <button onClick={() => setShowSolution((s) => !s)} className="btn-secondary btn-icon">
            {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showSolution ? 'Hide Solution' : 'Show Solution'}</span>
          </button>
        </div>
        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{today?.question || 'No challenge found.'}</div>
        {showSolution && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-gray-800 whitespace-pre-wrap">
            <div className="text-sm font-semibold mb-2 text-green-800">Solution</div>
            <div>{today?.answer || '—'}</div>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button disabled={submitting || today?.status === 'completed'} onClick={markCompleted} className={`btn-primary btn-icon ${submitting || today?.status === 'completed' ? 'btn-disabled' : ''}`}>
            <CheckCircle className="w-5 h-5" />
            <span>{today?.status === 'completed' ? 'Completed' : 'Mark Completed'}</span>
          </button>
          <button disabled={submitting} onClick={skipChallenge} className={`btn-secondary ${submitting ? 'btn-disabled' : ''}`}>Skip</button>
          <button disabled={submitting} onClick={refreshChallenge} className={`btn-primary ${submitting ? 'btn-disabled' : ''}`}>Refresh</button>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-blue-700" />
          <h3 className="text-lg font-semibold text-gray-900">Last 7 Days</h3>
        </div>
        <div className="divide-y">
          {history.length === 0 ? (
            <div className="py-6 text-gray-600 text-center">No history yet.</div>
          ) : (
            history.map((c) => (
              <div key={c._id} className="py-3 flex items-center justify-between hover:bg-gray-50 transition-colors px-2 -mx-2 rounded">
                <div className="flex-1">
                  <div className="text-xs text-gray-600 mb-1">
                    {new Date(c.date).toLocaleDateString()} • {c.challengeType || 'General'} • {c.difficulty || 'Medium'}
                  </div>
                  <div className="text-gray-800 line-clamp-2">{c.question}</div>
                </div>
                <div className="ml-4">
                  <span className={`badge ${c.status === 'completed' ? 'bg-green-100 text-green-800' : c.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
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
