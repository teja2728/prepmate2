import React from 'react';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function DailyChallengeCard({
  challenge,
  showSolution,
  onToggleSolution,
  onComplete,
  onSkip,
  onRefresh,
  busy,
}) {
  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-500">Category • Difficulty</div>
          <h2 className="text-xl font-semibold text-gray-900">
            {challenge?.challengeType || 'General'} • {challenge?.difficulty || 'Medium'}
          </h2>
        </div>
        <button
          onClick={onToggleSolution}
          className="btn-secondary flex items-center gap-2"
        >
          {showSolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showSolution ? 'Hide Solution' : 'Show Solution'}
        </button>
      </div>
      <div className="text-gray-800 whitespace-pre-wrap">{challenge?.question || 'No challenge found.'}</div>
      {showSolution && (
        <div className="mt-4 p-3 rounded bg-green-50 border text-green-800 whitespace-pre-wrap">
          <div className="text-sm font-semibold mb-1">Solution</div>
          {challenge?.answer || '—'}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <button
          disabled={busy || challenge?.status === 'completed'}
          onClick={onComplete}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {challenge?.status === 'completed' ? 'Completed' : 'Mark Completed'}
        </button>
        <button disabled={busy} onClick={onSkip} className="btn-secondary">Skip</button>
        <button disabled={busy} onClick={onRefresh} className="btn-secondary">Refresh</button>
      </div>
    </div>
  );
}
