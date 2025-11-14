const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const ResumeImprovementRecord = require('../models/ResumeImprovementRecord');
const LLMLog = require('../models/LLMLog');
const ResumeRecord = require('../models/ResumeRecord');

// Helper: build plain text from parsedData if resumeText missing
function flattenParsedData(parsed) {
  if (!parsed || typeof parsed !== 'object') return '';
  const parts = [];
  if (parsed.name) parts.push(`Name: ${parsed.name}`);
  if (parsed.email) parts.push(`Email: ${parsed.email}`);
  if (Array.isArray(parsed.skills) && parsed.skills.length) parts.push(`Skills: ${parsed.skills.join(', ')}`);
  if (Array.isArray(parsed.experience)) {
    parsed.experience.forEach((e) => {
      const bullets = Array.isArray(e.bullets) ? e.bullets.map(b => `- ${b}`).join('\n') : '';
      parts.push(`Experience: ${[e.title, e.company].filter(Boolean).join(' @ ')}\n${bullets}`);
    });
  }
  if (Array.isArray(parsed.education)) {
    parsed.education.forEach((ed) => {
      parts.push(`Education: ${[ed.degree, ed.institution, ed.year].filter(Boolean).join(', ')}`);
    });
  }
  if (Array.isArray(parsed.projects)) {
    parsed.projects.forEach((p) => parts.push(`Project: ${p.name} - ${p.summary || ''}`));
  }
  return parts.join('\n');
}

// POST /api/resume-improver/analyze
// Analyze resume using latest stored resume for the user (or by resumeId if provided)
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId } = req.body || {};

    // Fetch resume: by id or latest
    let resumeDoc;
    if (resumeId) {
      resumeDoc = await ResumeRecord.findOne({ _id: resumeId, userId });
    } else {
      resumeDoc = await ResumeRecord.findOne({ userId }).sort({ createdAt: -1 });
    }
    if (!resumeDoc) return res.status(404).json({ error: 'Resume not found' });

    let resumeText = typeof resumeDoc.resumeText === 'string' ? resumeDoc.resumeText : '';
    if (!resumeText || resumeText.trim().length < 10) {
      resumeText = flattenParsedData(resumeDoc.parsedData);
    }
    const jdText = typeof resumeDoc.jdText === 'string' ? resumeDoc.jdText : '';

    if (!resumeText || resumeText.trim().length === 0 || !jdText || jdText.trim().length === 0) {
      return res.status(400).json({ error: 'Resume or JD not found. Please upload both.' });
    }

    // Request explicit, structured JSON from Gemini
    const systemPrompt = 'Return ONLY valid JSON using exactly the keys shown. No markdown fences.';
    const userPrompt = `You are an AI Resume Evaluator. Given a resume and a job description (JD), analyze and return the following JSON:\n{
  "JD_Match_Score": <0-100>,
  "ATS_Score": <0-100>,
  "Grammar_Score": <0-100>,
  "Clarity_Score": <0-100>,
  "Keyword_Match_Percentage": <0-100>,
  "JD_Fit_Summary": "<short paragraph>",
  "Missing_Keywords": ["keyword1", "keyword2", ...],
  "Improvement_Recommendations": [
    {
      "Section": "<section name>",
      "Issue": "<short issue>",
      "AI_Suggestion": "<rewrite or fix>",
      "Confidence": "<low/medium/high>"
    }
  ],
  "Improved_Resume": "<AI rewritten resume text>"
}
Resume:\n${resumeText}\n\nJob Description:\n${jdText}`;

    const llm = await geminiService.generateContent(userPrompt, systemPrompt);
    if (!llm?.success || !llm?.data) {
      return res.status(500).json({ error: 'Resume improvement failed', details: llm?.error || 'No data from Gemini' });
    }

    // Parse robustly, starting with strict JSON extraction
    let parsed;
    try {
      let raw = llm.data;
      if (typeof raw !== 'string') {
        parsed = raw;
      } else {
        let text = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
        text = text.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
        text = text.replace(/,(\s*[}\]])/g, '$1');
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const candidate = start >= 0 && end >= start ? text.slice(start, end + 1) : text;
        parsed = JSON.parse(candidate);
      }
    } catch (e) {
      // Fallback: attempt strict variant
      try {
        const retry = await geminiService.generateResumeImprovementStrict(resumeText, jdText);
        if (!retry?.success || !retry?.data) throw new Error('Strict retry failed');
        let raw = retry.data;
        if (typeof raw !== 'string') parsed = raw; else {
          let text = raw.replace(/```json\s*/gi, '').replace(/```/g, '');
          text = text.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
          text = text.replace(/,(\s*[}\]])/g, '$1');
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          const candidate = start >= 0 && end >= start ? text.slice(start, end + 1) : text;
          parsed = JSON.parse(candidate);
        }
      } catch (err2) {
        return res.status(502).json({ error: 'Resume improvement failed', details: 'Invalid JSON from Gemini' });
      }
    }

    // Normalize output
    const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(+n) ? +n : 0));
    const analysisObj = parsed?.analysis || {};
    const jdMatchObj = parsed?.jdMatch || {};
    const improvedObj = parsed?.improvedResume || {};
    const recs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];

    // Map Gemini structured keys to our normalized analysis
    const num = (v) => (typeof v === 'number' ? v : Number(v));
    const toConfidenceScore = (c) => {
      const s = String(c || '').toLowerCase();
      if (s.includes('high')) return 90;
      if (s.includes('medium')) return 70;
      if (s.includes('low')) return 40;
      return clamp(num(c), 0, 100);
    };

    const g = parsed || {};
    const fromImprovementRecs = Array.isArray(g.Improvement_Recommendations) ? g.Improvement_Recommendations : [];

    const analysis = {
      overallScore: clamp(
        [num(g.ATS_Score), num(g.Grammar_Score), num(g.Clarity_Score), num(g.JD_Match_Score), num(g.Keyword_Match_Percentage)]
          .filter((x) => Number.isFinite(x))
          .reduce((a, b, _, arr) => a + b / arr.length, 0) || 72,
        0, 100
      ),
      atsScore: clamp(num(g.ATS_Score) || analysisObj?.atsScore || 0, 0, 100),
      grammarScore: clamp(num(g.Grammar_Score) || analysisObj?.grammarScore || 0, 0, 100),
      clarityScore: clamp(num(g.Clarity_Score) || analysisObj?.clarityScore || 0, 0, 100),
      keywordCoverage: clamp(num(g.Keyword_Match_Percentage) || num(g.JD_Match_Score) || jdMatchObj?.score || 0, 0, 100),
      summary: (g.JD_Fit_Summary && String(g.JD_Fit_Summary).trim()) || (analysisObj?.summary && String(analysisObj.summary).trim()) || 'Not available yet',
      missingSkills: Array.isArray(g.Missing_Keywords) ? g.Missing_Keywords : (Array.isArray(analysisObj?.missingSkills) ? analysisObj.missingSkills : []),
      recommendations: (fromImprovementRecs.length ? fromImprovementRecs : recs).map((r) => ({
        section: r?.Section || r?.section || r?.field || 'Summary',
        issue: r?.Issue || r?.issue || 'Unspecified issue',
        improvement: r?.AI_Suggestion || r?.improvement || r?.fix || 'No improvement text provided.',
        confidenceScore: toConfidenceScore(r?.Confidence ?? r?.confidence ?? r?.confidenceScore),
      })),
    };

    const improvedSummary = {
      original: String(improvedObj?.summary?.original || ''),
      improved: String(improvedObj?.summary?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(improvedObj?.summary?.confidence) || 0)),
    };
    const improvedSkills = Array.isArray(improvedObj?.skills) ? improvedObj.skills.map(s => ({
      original: String(s?.original || ''),
      improved: String(s?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(s?.confidence) || 0)),
    })) : [];
    const improvedExperience = Array.isArray(improvedObj?.experience) ? improvedObj.experience.map(e => ({
      title: String(e?.title || ''),
      originalDescription: String(e?.originalDescription || ''),
      improvedDescription: String(e?.improvedDescription || ''),
      confidence: Math.max(0, Math.min(1, Number(e?.confidence) || 0)),
    })) : [];
    const improvedEducation = Array.isArray(improvedObj?.education) ? improvedObj.education.map(ed => ({
      original: String(ed?.original || ''),
      improved: String(ed?.improved || ''),
      confidence: Math.max(0, Math.min(1, Number(ed?.confidence) || 0)),
    })) : [];

    const improvedResume = {
      summary: improvedSummary,
      skills: improvedSkills,
      experience: improvedExperience,
      education: improvedEducation,
    };

    const mergedTextParts = [];
    if (improvedSummary.improved) mergedTextParts.push('Summary\n' + improvedSummary.improved);
    if (improvedSkills.length) mergedTextParts.push('Skills\n' + improvedSkills.map(s => s.improved || s.original).filter(Boolean).join(', '));
    if (improvedExperience.length) mergedTextParts.push('Experience\n' + improvedExperience.map(e => `- ${e.title ? e.title + ': ' : ''}${e.improvedDescription || e.originalDescription}`).join('\n'));
    if (improvedEducation.length) mergedTextParts.push('Education\n' + improvedEducation.map(ed => `- ${ed.improved || ed.original}`).join('\n'));
    // If Gemini returned a direct improved resume string, prefer it
    let improvedMerged = mergedTextParts.join('\n\n');
    if (typeof g.Improved_Resume === 'string' && g.Improved_Resume.trim()) {
      improvedMerged = g.Improved_Resume.trim();
    }

    const record = await ResumeImprovementRecord.create({
      userId,
      resumeId: resumeDoc._id,
      jdText: jdText || '',
      analysis,
      jdMatch: { score: analysis.keywordCoverage || 0, missingSkills: analysis.missingSkills || [] },
      improvedResume,
      appliedFixes: [],
      improvedMerged,
    });

    try {
      await LLMLog.create({
        userId,
        endpoint: '/api/resume-improver/analyze',
        promptType: 'resume_improver',
        requestData: geminiService.sanitizeForLogging({ resumeId: String(resumeDoc._id), jdLen: jdText?.length || 0 }),
        responseData: { analysis, improvedResume },
        processingTime: llm?.processingTime || 0,
        success: true,
        geminiRequestId: llm?.requestId || null,
      });
    } catch (_) {}

    return res.json({ recordId: record._id, analysis, improvedMerged });
  } catch (err) {
    console.error('Resume improver analyze error:', err);
    return res.status(500).json({ error: 'Resume improvement failed', details: err?.message || 'Unknown error' });
  }
});

// GET /api/resume-improver/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const items = await ResumeImprovementRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('analysis createdAt');
    res.json({ items });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error?.message || 'Unknown error' });
  }
});

// GET /api/resume-improver/report/:id
router.get('/report/:id', authMiddleware, async (req, res) => {
  try {
    const PDFDocument = (() => { try { return require('pdfkit'); } catch { return null; } })();
    if (!PDFDocument) {
      return res.status(501).json({ error: 'PDF generation not available. Please install pdfkit on the server.' });
    }
    const record = await ResumeImprovementRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) return res.status(404).json({ error: 'Report not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PrepMate_Resume_Report_${new Date(record.createdAt).toISOString().slice(0,10)}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    // Header
    doc.fillColor('#111827').fontSize(20).text('PrepMate - Resume Analysis Report', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6B7280').text(`Date: ${new Date(record.createdAt).toLocaleString()}`);
    doc.moveDown();

    // Scores
    const a = record.analysis || {};
    doc.fontSize(12).fillColor('#111827').text('Scores', { underline: true });
    doc.moveDown(0.25);
    doc.fontSize(11).text(`Overall: ${a.overallScore ?? '-'}  ATS: ${a.atsScore ?? '-'}  Grammar: ${a.grammarScore ?? '-'}  Clarity: ${a.clarityScore ?? '-'}  Keyword Coverage: ${a.keywordCoverage ?? '-'}`);
    doc.moveDown();

    // Summary
    doc.fontSize(12).fillColor('#111827').text('Summary', { underline: true });
    doc.moveDown(0.25);
    doc.fontSize(11).fillColor('#111827').text(a.summary || '-', { align: 'left' });
    doc.moveDown();

    // Missing Skills
    doc.fontSize(12).fillColor('#111827').text('Missing Skills', { underline: true });
    doc.moveDown(0.25);
    const ms = (a.missingSkills || []).join(', ') || '-';
    doc.fontSize(11).text(ms);
    doc.moveDown();

    // Recommendations
    doc.fontSize(12).fillColor('#111827').text('Recommendations', { underline: true });
    doc.moveDown(0.25);
    (a.recommendations || []).forEach((r, idx) => {
      doc.fontSize(11).text(`${idx + 1}. [${r.section}] ${r.improvement} (Confidence: ${r.confidenceScore ?? '-'}%)`);
      if (r.issue) doc.fillColor('#6B7280').fontSize(10).text(`Issue: ${r.issue}`);
      doc.moveDown(0.4);
      doc.fillColor('#111827');
    });

    // Footer
    doc.moveDown();
    doc.fontSize(10).fillColor('#6B7280').text('Generated by PrepMate via Gemini', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error?.message || 'Unknown error' });
  }
});

module.exports = router;
