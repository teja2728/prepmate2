import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { progressAPI, resourcesAPI, challengesAPI, resumeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bell, Settings, User as UserIcon, Flame, Bookmark, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import PerformanceGraph from '../components/PerformanceGraph';

const CircleProgress = ({ percent = 0 }) => {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 32;
  const stroke = 8;
  const normalized = radius - stroke / 2;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="block">
      <circle cx="40" cy="40" r={normalized} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle cx="40" cy="40" r={normalized} stroke="url(#grad)" strokeWidth={stroke} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm fill-gray-800">{pct}%</text>
    </svg>
  );
};

const Progress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [latestResumeId, setLatestResumeId] = useState(null);
  const [showCompletion, setShowCompletion] = useState(true);
  const [showChallenges, setShowChallenges] = useState(true);
  const resumeJobFitData = useMemo(() => ([
    { week: 'Week 1', resume: 68, jobFit: 60 },
    { week: 'Week 2', resume: 72, jobFit: 64 },
    { week: 'Week 3', resume: 75, jobFit: 69 },
    { week: 'Week 4', resume: 80, jobFit: 73 },
    { week: 'Week 5', resume: 84, jobFit: 77 },
    { week: 'Week 6', resume: 87, jobFit: 80 },
  ]), []);
  const resumeScore = resumeJobFitData[resumeJobFitData.length - 1]?.resume || 0;
  const jobFitScore = resumeJobFitData[resumeJobFitData.length - 1]?.jobFit || 0;
  const [insights, setInsights] = useState([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pg, saved, hist, resumes] = await Promise.all([
        progressAPI.getMine(),
        resourcesAPI.getSaved().catch(() => ({ data: { resources: [] } })),
        challengesAPI.history(30).catch(() => ({ data: { history: [] } })),
        resumeAPI.getAll().catch(() => ({ data: { resumes: [] } })),
      ]);
      setEntries(pg.data.progress || []);
      setSavedCount((saved.data.resources || []).length);
      setHistory(hist.data.history || []);
      const latest = (resumes.data.resumes || [])[0]?.id || null;
      setLatestResumeId(latest);
      setStreak(() => {
        const days = new Set((hist.data.history || []).filter(h => h.status === 'completed').map(h => new Date(h.createdAt).toDateString()));
        let s = 0;
        for (let i = 0; i < 60; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toDateString();
          if (days.has(key)) s += 1; else break;
        }
        return s;
      });
    } catch (e) {
      console.error('Failed to load dashboard', e);
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const bySkill = useMemo(() => {
    const map = new Map();
    for (const p of entries) {
      const key = p.skillName;
      if (!map.has(key)) map.set(key, { total: 0, done: 0, items: [], skillTotal: p.skillTotal });
      const rec = map.get(key);
      rec.items.push(p);
      if (p.isCompleted) rec.done += 1;
      rec.total = p.skillTotal || rec.total;
    }
    for (const rec of map.values()) {
      if (!rec.total) rec.total = rec.items.length;
    }
    return map;
  }, [entries]);

  const overallPct = useMemo(() => {
    if (bySkill.size === 0) return 0;
    let done = 0, total = 0;
    for (const [, rec] of bySkill.entries()) { done += rec.done; total += rec.total; }
    if (!total) return 0;
    return Math.round((done / total) * 100);
  }, [bySkill]);

  const skillsList = useMemo(() => {
    const now = new Date();
    const last7 = new Date(now); last7.setDate(last7.getDate() - 7);
    const prev7 = new Date(now); prev7.setDate(prev7.getDate() - 14);
    const arr = Array.from(bySkill.entries()).map(([skill, rec]) => {
      const pct = rec.total ? Math.round((rec.done / rec.total) * 100) : 0;
      const done7 = rec.items.filter(it => it.isCompleted && it.completedAt && new Date(it.completedAt) >= last7).length;
      const donePrev7 = rec.items.filter(it => it.isCompleted && it.completedAt && new Date(it.completedAt) >= prev7 && new Date(it.completedAt) < last7).length;
      const delta = Math.max(0, (done7 - donePrev7));
      return { skill, pct, done: rec.done, total: rec.total, delta };
    });
    return arr.sort((a, b) => a.pct - b.pct);
  }, [bySkill]);

  useEffect(() => {
    const payload = {
      overallProgressPct: overallPct,
      streak,
      savedResourcesCount: savedCount,
      skills: skillsList,
      resumeScore,
      jobFitScore,
    };
    (async () => {
      try {
        const res = await api.post('/api/gemini/analyze-progress', payload);
        setInsights(res.data?.insights || []);
      } catch (_) {
        setInsights([
          `You’ve improved ${Math.max(0, resumeScore - 75)}% in resume score over the last 6 weeks.`,
          `Job fit is trending to ${jobFitScore}%. Consider strengthening project keywords.`,
          `Maintain your ${streak}-day streak to keep momentum.`,
        ]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallPct, streak, savedCount, resumeScore, jobFitScore, skillsList]);

  const handleDownloadAnalysis = async () => {
    try {
      const elem = document.getElementById('progress-dashboard');
      if (!elem) return toast.error('Dashboard not found');
      const html2canvasMod = await import('html2canvas');
      const html2canvas = html2canvasMod.default || html2canvasMod;
      const jsPDFMod = await import('jspdf');
      const JsPdf = jsPDFMod.default || jsPDFMod.jsPDF;
      const canvas = await html2canvas(elem, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new JsPdf('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        // Scale to fit one page height
        const scale = (pageHeight - margin * 2) / imgHeight;
        const scaledWidth = imgWidth * scale;
        const x = (pageWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', x, margin, scaledWidth, pageHeight - margin * 2);
      }

      const safeName = (user?.name || 'Student').replace(/\s+/g, '_');
      pdf.save(`PrepMate_Progress_Report_${safeName}.pdf`);
    } catch (e) {
      console.error('PDF export error', e);
      toast.error('Please install: npm install jspdf html2canvas');
    }
  };

  const totalPossible = useMemo(() => {
    let total = 0;
    for (const [, rec] of bySkill.entries()) total += rec.total;
    return total;
  }, [bySkill]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toDateString();
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return { d, key, label };
    });

    const completedSet = entries
      .filter(e => e.isCompleted && e.completedAt)
      .map(e => new Date(e.completedAt));

    const challengesByDay = (history || []).reduce((acc, h) => {
      const k = new Date(h.createdAt).toDateString();
      if (!acc[k]) acc[k] = { completed: 0 };
      if (h.status === 'completed') acc[k].completed += 1;
      return acc;
    }, {});

    let cumulative = 0;
    const sortedCompleted = completedSet.sort((a,b) => a - b);
    let idx = 0;
    const total = totalPossible || 0;

    return days.map(({ d, key, label }) => {
      while (idx < sortedCompleted.length && sortedCompleted[idx] <= d) { cumulative += 1; idx += 1; }
      const completion = total ? Math.round((cumulative / total) * 100) : 0;
      const challenges = challengesByDay[key]?.completed || 0;
      return { label, Completion: completion, Challenges: challenges };
    });
  }, [entries, history, totalPossible]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="loading-spinner"></div>
          <p className="mt-3 text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="max-w-7xl mx-auto space-y-6" id="progress-dashboard">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-gray-500">Home {'>'} Progress</div>
            <h1 className="section-title">Progress Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary btn-icon"><Bell className="w-4 h-4" /><span>Alerts</span></button>
            <button className="btn-secondary btn-icon"><Settings className="w-4 h-4" /><span>Settings</span></button>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-800">Profile</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <motion.button whileHover={{ y: -2 }} onClick={() => navigate('/progress')} className="card bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Overall Progress</div>
                <div className="text-xl font-semibold text-gray-900">{overallPct}%</div>
              </div>
              <CircleProgress percent={overallPct} />
            </div>
          </motion.button>

          <motion.button whileHover={{ y: -2 }} onClick={() => navigate('/daily-challenge')} className="card bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Challenges Completed</div>
                <div className="text-xl font-semibold text-gray-900">{(history || []).filter(h => h.status === 'completed').length}</div>
              </div>
              <BarChart2 className="w-8 h-8 text-emerald-600" />
            </div>
          </motion.button>

          <motion.button whileHover={{ y: -2 }} onClick={() => navigate('/saved-resources')} className="card bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Resources Bookmarked</div>
                <div className="text-xl font-semibold text-gray-900">{savedCount}</div>
              </div>
              <Bookmark className="w-8 h-8 text-yellow-600" />
            </div>
          </motion.button>

          <motion.button whileHover={{ y: -2 }} onClick={() => navigate('/daily-challenge')} className="card bg-gradient-to-br from-red-500/10 to-pink-500/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Daily Streak</div>
                <div className="text-xl font-semibold text-gray-900">{streak} days</div>
              </div>
              <Flame className="w-8 h-8 text-red-600" />
            </div>
          </motion.button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Performance Over Time</div>
                  <div className="text-sm text-gray-600">Completion rate and challenges completed</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={showCompletion} onChange={(e) => setShowCompletion(e.target.checked)} />
                    <span className="text-gray-700">Completion %</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={showChallenges} onChange={(e) => setShowChallenges(e.target.checked)} />
                    <span className="text-gray-700">Challenges</span>
                  </label>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {showCompletion && (
                      <Line yAxisId="left" type="monotone" dataKey="Completion" name="Completion %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    )}
                    {showChallenges && (
                      <Bar yAxisId="right" dataKey="Challenges" name="Challenges Completed" fill="#f97316" radius={[6,6,0,0]} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <PerformanceGraph data={resumeJobFitData} title="Performance Over Time" subtitle="Track your weekly improvement in Resume and Job Fit scores." />
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="text-lg font-semibold text-gray-900 mb-4">Resume & Job Analysis</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20">
                    <PieChart width={80} height={80}>
                      <Pie data={[{ name: 'p', value: resumeScore }, { name: 'r', value: Math.max(0, 100 - resumeScore) }]} cx={40} cy={40} innerRadius={26} outerRadius={36} startAngle={90} endAngle={-270} dataKey="value">
                        <Cell fill="#3B82F6" />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                    </PieChart>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Resume Analysis Score</div>
                    <div className="text-xl font-semibold text-gray-900">{resumeScore}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20">
                    <PieChart width={80} height={80}>
                      <Pie data={[{ name: 'p', value: jobFitScore }, { name: 'r', value: Math.max(0, 100 - jobFitScore) }]} cx={40} cy={40} innerRadius={26} outerRadius={36} startAngle={90} endAngle={-270} dataKey="value">
                        <Cell fill="#8B5CF6" />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                    </PieChart>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Job Fit Score</div>
                    <div className="text-xl font-semibold text-gray-900">{jobFitScore}%</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                {insights.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {insights.slice(0,3).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4">
                <button className="btn-primary text-sm" onClick={handleDownloadAnalysis}>Download Analysis</button>
              </div>
            </div>

            <div className="card">
              <div className="text-lg font-semibold text-gray-900 mb-3">Skill Progress Breakdown</div>
              <div className="space-y-3">
                {skillsList.map((s) => (
                  <div key={s.skill} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-900">{s.skill}</div>
                      <div className="text-sm text-gray-600">{s.pct}%</div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 group-hover:opacity-90"
                        style={{ width: `${s.pct}%` }}
                        title={`Improved by ${s.delta} since last week`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-900">Activity Tracker</div>
            <button
              className="btn-primary text-sm"
              onClick={() => {
                const weakest = skillsList[0];
                if (weakest && latestResumeId) navigate(`/results/${latestResumeId}`); else navigate('/daily-challenge');
              }}
            >Next Recommended Task</button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const key = d.toDateString();
              const done = (history || []).some(h => h.status === 'completed' && new Date(h.createdAt).toDateString() === key);
              return (
                <div key={i} className="flex flex-col items-center text-xs text-gray-500 min-w-[3rem]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? '✓' : '•'}
                  </div>
                  <div className="mt-1">{d.toLocaleDateString(undefined, { day: '2-digit' })}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
