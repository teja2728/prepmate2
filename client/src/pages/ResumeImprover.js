import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { generateAPI, resumeAPI } from '../services/api';
import { useGenerated } from '../contexts/GeneratedContext';

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
  }, [resumeId]);

  const regenerate = async () => {
    setGenerating(true);
    try {
      const resp = await generateAPI.resumeImprover({ resumeId });
      console.log('Resume improver response', resp.data);
      setAnalysis(resp.data.analysis);
      // Persist full response in context for reloads
      generated.setResumeImprovement(resumeId, resp.data);
      // If backend provides merged improved resume text, hydrate preview
      const merged = resp.data?.simplified?.improvedResume || '';
      if (merged) setPreview(merged);
      toast.success('Resume improvement applied successfully');
    } catch (e) {
      console.error('AxiosError', e);
      alert('Failed to improve resume. Please check server logs.');
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
            {generating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <Link to={`/results/${resumeId}`} className="btn-secondary">Back to Results</Link>
        </div>
      </div>

      {/* Score */}
      <div className="card mb-6">
        <ScoreBar score={analysis?.overallScore || 0} />
      </div>

      {/* Summary & Missing Skills */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">JD Fit Summary</h3>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{analysis?.summary || 'No summary.'}</p>
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
          <div className="bg-green-50 border rounded p-3 h-64 overflow-auto whitespace-pre-wrap text-sm text-gray-800">
            {preview || 'No improvements yet. Click Regenerate to create an improved version.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeImprover;
