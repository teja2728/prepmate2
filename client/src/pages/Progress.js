import React, { useEffect, useMemo, useState } from 'react';
import { progressAPI } from '../services/api';
import toast from 'react-hot-toast';

const badgeForPct = (pct) => {
  if (pct >= 0.8) return { label: 'Advanced', cls: 'bg-green-100 text-green-800' };
  if (pct >= 0.4) return { label: 'Intermediate', cls: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Beginner', cls: 'bg-gray-100 text-gray-800' };
};

const Progress = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await progressAPI.getMine();
      setEntries(res.data.progress || []);
    } catch (e) {
      console.error('Failed to load progress', e);
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bySkill = useMemo(() => {
    const map = new Map();
    for (const p of entries) {
      const key = p.skillName;
      if (!map.has(key)) map.set(key, { total: 0, done: 0, items: [], skillTotal: p.skillTotal });
      const rec = map.get(key);
      rec.items.push(p);
      if (p.isCompleted) rec.done += 1;
      // Prefer stored skillTotal; fallback to count
      rec.total = p.skillTotal || rec.total;
    }
    // If no skillTotal, default to items length
    for (const rec of map.values()) {
      if (!rec.total) rec.total = rec.items.length;
    }
    return map;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (bySkill.size === 0) {
    return (
      <div className="text-center py-12 text-gray-500">No progress yet. Open and complete resources to see progress here.</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Skills Progress</h1>
        <p className="text-gray-600 mt-2">Track your completion across skills and resources</p>
      </div>

      <div className="space-y-6">
        {[...bySkill.entries()].map(([skill, rec]) => {
          const pct = rec.total > 0 ? rec.done / rec.total : 0;
          const pctLabel = Math.round(pct * 100);
          const badge = badgeForPct(pct);
          return (
            <div key={skill} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{skill}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${badge.cls}`}>{badge.label}</span>
              </div>
              <div className="mb-2 text-sm text-gray-700">{rec.done} of {rec.total} resources completed • {pctLabel}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2" style={{ width: `${pctLabel}%` }} />
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-700">
                {rec.items.slice(0, 5).map((it) => (
                  <li key={it._id}>
                    {it.isCompleted ? '✅' : '⬜'} {it.resourceLink || 'Skill milestone'} {it.isCompleted && it.completedAt ? `• ${new Date(it.completedAt).toLocaleDateString()}` : ''}
                  </li>
                ))}
                {rec.items.length > 5 && (
                  <li className="text-gray-500">+{rec.items.length - 5} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Progress;
