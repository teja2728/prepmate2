import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resumeAPI, resumeImproverAPI } from '../services/api';
import { useGenerated } from '../contexts/GeneratedContext';
import ScoreRing from '../components/ResumeImprover/ScoreRing';

const ScoreBar = ({ score = 0 }) => {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">JD Match Score</span>
        <span className="text-gray-700 font-semibold">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const ConfidenceBadge = ({ value }) => {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  let cls = 'bg-gray-100 text-gray-800';
  if (v >= 90) cls = 'bg-green-100 text-green-800';
  else if (v >= 70) cls = 'bg-yellow-100 text-yellow-800';
  else cls = 'bg-red-100 text-red-800';
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{v}%</span>;
};

const ResumeImprover = () => {
  const { resumeId } = useParams();
  const generated = useGenerated();

  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [history, setHistory] = useState([]);
  const [hLoading, setHLoading] = useState(false);

  // Simple improved preview state (user-applied fixes)
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await resumeAPI.getById(resumeId);
        setResume(resp.data.resume);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load resume');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Hydrate from cache
    const cached = generated.get(resumeId);
    if (cached?.resumeImprovement) {
      setAnalysis(cached.resumeImprovement);
    }
  }, [resumeId, generated]);

  const regenerate = async () => {
    setGenerating(true);
    try {
      const a = await resumeImproverAPI.analyze({ resumeId });
      setAnalysis(a.data.analysis);
      setAnalysisId(a.data.recordId || null);
      setPreview(a.data.improvedMerged || '');
      generated.setResumeImprovement(resumeId, a.data.analysis);
      toast.success('Resume improvement ready');
    } catch (e) {
      if (e?.response?.status === 404) {
        toast.error('Please upload a resume first on the Resume Upload page.');
      } else if (e?.response?.status === 400) {
        toast.error('Please upload resume and JD first.');
      } else {
        toast.error('Failed to improve resume.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate when first entering and nothing cached
  useEffect(() => {
    if (!analysis && !generating) {
      regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  useEffect(() => {
    const run = async () => {
      setHLoading(true);
      try {
        const resp = await resumeImproverAPI.history();
        setHistory(resp.data.items || []);
      } catch {}
      setHLoading(false);
    };
    run();
  }, []);

  // Removed file upload flow; backend reads resume from DB automatically

  const downloadReport = async () => {
    try {
      if (!analysisId) return toast.error('Report unavailable');
      const resp = await resumeImproverAPI.report(analysisId);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PrepMate_Resume_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Failed to download report');
    }
  };

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const applyFix = (improvement) => {
    setPreview((prev) => (prev ? prev + '\n' + improvement : improvement));
    toast.success('Applied to preview');
  };

  const missingSkills = useMemo(() => analysis?.missingSkills || [], [analysis]);
  const recommendations = useMemo(() => analysis?.recommendations || [], [analysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Improver – AI-enhanced Professional Review</h1>
          <p className="text-gray-600 mt-2">
            Resume: {resume?.parsedData?.name || 'Unknown'} • Uploaded: {resume ? new Date(resume.createdAt).toLocaleDateString() : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={regenerate} disabled={generating} className="btn-primary disabled:opacity-50">
            {generating ? 'Regenerating…' : 'Regenerate Improvements'}
          </button>
          <Link to={`/results/${resumeId}`} className="btn-secondary">Back to Results</Link>
        </div>
      </div>

      <div className="mb-4 text-xs text-gray-500">Using your uploaded resume from Resume Upload page.</div>

      {/* Score */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
          <div className="col-span-2">
            <ScoreBar score={analysis?.keywordCoverage || 0} />
          </div>
          <ScoreRing label="ATS" value={analysis?.atsScore || 0} color="#3B82F6" />
          <ScoreRing label="Grammar" value={analysis?.grammarScore || 0} color="#10B981" />
          <ScoreRing label="Clarity" value={analysis?.clarityScore || 0} color="#F59E0B" />
          <ScoreRing label="Keywords" value={analysis?.keywordCoverage || 0} color="#8B5CF6" />
        </div>
      </div>

      {/* Summary & Missing Skills */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">JD Fit Summary</h3>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{analysis?.summary || 'Not available yet'}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Missing Keywords / Skills</h3>
          <div className="flex flex-wrap gap-2">
            {missingSkills.length === 0 ? (
              <span className="text-sm text-gray-600">None</span>
            ) : (
              missingSkills.map((s, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{s}</span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Improvement Recommendations</h3>
          <span className="text-xs text-gray-500">AI suggests concrete rewrites with confidence</span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-4">Section</th>
                <th className="py-2 pr-4">Issue</th>
                <th className="py-2 pr-4">AI Suggestion</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">No recommendations</td>
                </tr>
              ) : (
                recommendations.map((rec, idx) => (
                  <tr key={idx} className="border-b align-top">
                    <td className="py-3 pr-4 font-medium text-gray-900 whitespace-nowrap">{rec.section}</td>
                    <td className="py-3 pr-4 text-gray-700">{rec.issue}</td>
                    <td className="py-3 pr-4 text-gray-800 whitespace-pre-wrap">{rec.improvement}</td>
                    <td className="py-3 pr-4"><ConfidenceBadge value={rec.confidenceScore} /></td>
                    <td className="py-3 space-x-2 whitespace-nowrap">
                      <button onClick={() => applyFix(rec.improvement)} className="btn-secondary text-xs">Apply Fix</button>
                      <button onClick={() => onCopy(rec.improvement)} className="btn-secondary text-xs">Copy</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Before vs After Preview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Original Resume</h3>
          <div className="bg-gray-50 border rounded p-3 h-64 overflow-auto whitespace-pre-wrap text-sm text-gray-800">
            {resume?.resumeText || '—'}
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Improved Resume</h3>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => onCopy(preview || '')} className="btn-secondary text-xs">Copy All</button>
            <button onClick={downloadReport} className="btn-secondary text-xs">Download PDF</button>
          </div>
          <textarea
            className="input-field h-64 w-full resize-none"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            placeholder={'No improvements yet. Click Regenerate to create an improved version.'}
          />
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">History</h3>
          <span className="text-xs text-gray-500">Last 20 analyses</span>
        </div>
        {hLoading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(history || []).map((item) => (
              <div key={item._id} className="glass p-4 rounded-lg">
                <div className="text-sm text-gray-600">{new Date(item.createdAt).toLocaleString()}</div>
                <div className="mt-1 text-sm">Overall: {item.analysis?.overallScore ?? '-'}</div>
                <div className="mt-1 text-xs text-gray-600">ATS {item.analysis?.atsScore ?? '-'} • Grammar {item.analysis?.grammarScore ?? '-'} • Clarity {item.analysis?.clarityScore ?? '-'}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={async () => { try { const r = await resumeImproverAPI.report(item._id); const blob = new Blob([r.data], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `PrepMate_Resume_Report_${new Date(item.createdAt).toISOString().slice(0,10)}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);} catch {} }} className="btn-secondary text-xs">Download</button>
                  <button onClick={async () => { try { const d = await resumeImproverAPI.history(); const found = (d.data.items || []).find((x) => x._id === item._id); if (found) { setAnalysis(found.analysis); setAnalysisId(found._id); } } catch {} }} className="btn-secondary text-xs">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeImprover;
