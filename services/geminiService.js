 const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.modelName = 'gemini-2.5-flash';
  }

  async generateDailyChallengeFromProfile(profile) {
    try {
      const skillsStr = Array.isArray(profile?.skills) ? profile.skills.join(', ') : '';
      const systemPrompt = `Return ONLY valid JSON with keys: {"challengeType":"coding|aptitude|sql|interview","difficulty":"Easy|Medium|Hard","question":"","answer":""}`;
      const userPrompt = `Generate a placement preparation challenge for a user based on their resume and target job.\nResume: ${profile?.resumeText || ''}\nJob Description: ${profile?.jdText || ''}\nSkills: ${skillsStr}\nExperience: ${profile?.experienceLevel || 'Fresher'}\nReturn output as valid JSON with fields: challengeType, difficulty, question, answer.`;
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: { maxOutputTokens: 512, temperature: 0.5 },
      });
      let text = '';
      if (result?.response?.text) text = result.response.text();
      else if (typeof result?.output_text === 'string') text = result.output_text;
      else if (typeof result === 'string') text = result; else text = JSON.stringify(result);
      if (text.includes('```')) text = text.replace(/```json\s*/gi, '').replace(/```/g, '');
      let json;
      try { json = JSON.parse(text); }
      catch {
        const match = text.match(/\{[\s\S]*\}/);
        json = match ? JSON.parse(match[0]) : null;
      }
      if (!json || !json.question) {
        return { success: false, error: 'Invalid JSON' };
      }
      return { success: true, data: json };
    } catch (error) {
      console.error('Gemini Daily Challenge From Profile Error:', error);
      return { success: false, error: error.message };
    }
  }

  async generateDailyChallenge(user) {
    try {
      const skills = Array.isArray(user?.skills) && user.skills.length ? user.skills.slice(0, 3).join(', ') : 'coding or aptitude or SQL';
      const systemPrompt = `Return ONLY valid JSON with keys: {"challengeType":"coding|aptitude|sql|interview","difficulty":"Easy|Medium|Hard","question":"","answer":""}`;
      const userPrompt = `Generate one short daily practice challenge for a placement student in ${skills}. Include a clear question and its concise solution. Keep under 2-3 sentences. Provide a difficulty level.`;
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: { maxOutputTokens: 512, temperature: 0.5 },
      });
      let text = '';
      if (result?.response?.text) text = result.response.text();
      else if (typeof result?.output_text === 'string') text = result.output_text;
      else if (typeof result === 'string') text = result; else text = JSON.stringify(result);
      if (text.includes('```')) text = text.replace(/```json\s*/gi, '').replace(/```/g, '');
      let json;
      try { json = JSON.parse(text); }
      catch {
        const match = text.match(/\{[\s\S]*\}/);
        json = match ? JSON.parse(match[0]) : null;
      }
      if (!json || !json.question) {
        return {
          success: true,
          data: { challengeType: 'general', difficulty: 'Medium', question: 'Solve a simple logic puzzle of your choice.', answer: 'Discuss approach and verify with examples.' }
        };
      }
      return { success: true, data: json };
    } catch (error) {
      console.error('Gemini Daily Challenge Error:', error);
      return { success: false, error: error.message };
    }
  }

  async generateResumeImprovementStrict(resumeText, jdText) {
    try {
      const startTime = Date.now();
      const systemPrompt = `You are a professional resume improvement assistant. Return ONLY valid JSON with this exact schema and no markdown:
{
  "summary": "",
  "overallScore": 0,
  "recommendations": [
    { "section": "", "current": "", "improved": "", "confidence": 0.0, "reason": "" }
  ],
  "improvedResume": ""
}`;
      const userPrompt = `Compare RESUME vs JD. Identify weak phrasing/misalignment and rewrite professionally. Maintain formatting and only output JSON as above.\n\nRESUME:\n${resumeText}\n\nJD:\n${jdText}`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
      });

      let text = '';
      if (result?.response?.text) text = result.response.text();
      else if (typeof result?.output_text === 'string') text = result.output_text;
      else if (typeof result === 'string') text = result; else text = JSON.stringify(result);
      if (text.includes('```')) text = text.replace(/```json\s*/gi, '').replace(/```/g, '');
      const processingTime = Date.now() - startTime;
      return { success: true, data: text, processingTime, requestId: this.generateRequestId() };
    } catch (error) {
      console.error('Gemini Resume Improvement Strict Error:', error);
      return { success: false, error: error.message, processingTime: 0 };
    }
  }

  async generateResumeImprovement(resumeText, jdText) {
    try {
      const startTime = Date.now();
      const systemPrompt = `You are an expert resume reviewer trained in ATS optimization and technical hiring. Return ONLY valid JSON (no markdown, no commentary) with this exact schema:
{
  "analysis": { "summary": "", "overallScore": 0 },
  "jdMatch": { "score": 0, "missingSkills": [""] },
  "improvedResume": {
    "summary": { "original": "", "improved": "", "confidence": 0.0 },
    "skills": [ { "original": "", "improved": "", "confidence": 0.0 } ],
    "experience": [ { "title": "", "originalDescription": "", "improvedDescription": "", "confidence": 0.0 } ],
    "education": [ { "original": "", "improved": "", "confidence": 0.0 } ]
  },
  "recommendations": [ { "field": "Summary|Skills|Projects|Experience|Education", "issue": "", "fix": "", "confidence": 0.0 } ]
}`;
      const userPrompt = `Compare the provided RESUME and JOB DESCRIPTION. Analyze alignment, missing elements, phrasing, and formatting. Suggest improved, professional versions for weak areas. Keep tone recruiter-level, concise, Spelling mistakes, vocabulary mistakes, grammar mistakes, and ATS-friendly.\n\nRESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jdText}`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.5,
        }
      });

      let text = '';
      if (result?.response?.text) text = result.response.text();
      else if (typeof result?.output_text === 'string') text = result.output_text;
      else if (typeof result === 'string') text = result; else text = JSON.stringify(result);

      if (text.includes('```')) text = text.replace(/```json\s*/gi, '').replace(/```/g, '');

      const processingTime = Date.now() - startTime;
      return { success: true, data: text, processingTime, requestId: this.generateRequestId() };
    } catch (error) {
      console.error('Gemini Resume Improvement Error:', error);
      return { success: false, error: error.message, processingTime: 0 };
    }
  }

  async generateContent(prompt, systemPrompt = null) {
    try {
      const startTime = Date.now();
      
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
      }
      const result = await this.ai.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.6,
          topK: 40,
          topP: 0.9,
        },
      });

      let text = '';
      if (result && typeof result === 'object') {
        if (result.response && typeof result.response.text === 'function') {
          text = result.response.text();
        } else if (typeof result.output_text === 'string') {
          text = result.output_text;
        } else if (typeof result.text === 'string') {
          text = result.text;
        } else {
          text = JSON.stringify(result);
        }
      } else if (typeof result === 'string') {
        text = result;
      }
      
      // Clean up markdown formatting if present
      if (text.includes('```json')) {
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      if (text.includes('```')) {
        text = text.replace(/```\s*/g, '');
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: text,
        processingTime,
        requestId: this.generateRequestId()
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      const processingTime = 0;
      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  async parseResumeAndJD(resumeText, jdText) {
    const systemPrompt = `You are an extraction agent. Output ONLY valid JSON without any markdown formatting, comments, or extra text. The JSON must match this exact schema: { "name": "", "email": "", "skills": ["",""], "experience": [{"company":"","title":"","start":"","end":"","bullets":[""]}], "education": [{"institution":"","degree":"","year":""}], "projects": [{"name":"","summary":""}] }.`;

    const userPrompt = `Here is the resume text: ${resumeText}. If a field is missing, return empty string or empty list for that key. Return ONLY the JSON object, no other text.`;

    return await this.generateContent(userPrompt, systemPrompt);
  }

  async generateResumeSuggestions(resumeText, jdText) {
    try {
      const startTime = Date.now();
      const systemPrompt = `You are a professional resume analyst. Output ONLY valid JSON (no markdown, comments, or extra text). Use this exact schema:
{
  "missingSkills": [""],
  "contentImprovements": [""],
  "keywordOptimization": [""],
  "formattingTone": [""]
}`;
      const userPrompt = `Compare the following Resume and Job Description. Highlight missing skills, experiences, or keywords that should be added to make the resume a stronger match. Suggest improvements in tone, structure, and content. Present your suggestions grouped under: Missing Skills, Content Improvements, Keyword Optimization, Formatting / Tone.\n\nResume:\n${resumeText}\n\nJob Description:\n${jdText}`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `${systemPrompt}\n\nUser: ${userPrompt}`,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.5,
          topK: 40,
          topP: 0.9,
        },
      });

      let text = '';
      if (result?.response?.text) {
        text = result.response.text();
      } else if (typeof result?.output_text === 'string') {
        text = result.output_text;
      } else if (typeof result === 'string') {
        text = result;
      } else {
        text = JSON.stringify(result);
      }

      if (text.includes('```')) {
        text = text.replace(/```json\s*/gi, '').replace(/```/g, '');
      }

      const processingTime = Date.now() - startTime;
      return {
        success: true,
        data: text,
        processingTime,
        requestId: this.generateRequestId()
      };
    } catch (error) {
      console.error('Gemini Resume Suggestions Error:', error);
      return { success: false, error: error.message, processingTime: 0 };
    }
  }

  async generateInterviewQuestions(resumeJson, jdText) {
    const systemPrompt = `You are an expert placement trainer. Return ONLY a valid JSON array of exactly 10 question objects without any markdown formatting: [{"question": "", "type": "behavioral|technical|coding|design|aptitude", "difficulty": "easy|medium|hard", "rationale": "one-line explanation why this question suits the candidate", "relatedSkills": [""]}]`;

    const userPrompt = `Use this resume JSON: ${JSON.stringify(resumeJson)} and this JD text: ${jdText}. Generate exactly 10 unique interview questions targeted to the JD and candidate skillset. Prioritize gaps between candidate skills and JD and include at least 2 behavioral questions. Return ONLY the JSON array, no other text.`;

    return await this.generateContent(userPrompt, systemPrompt);
  }

  async getCompanyQuestions(companyName) {
    const systemPrompt = `You are an interviewer-research agent. For the company ${companyName}, return a JSON object { "company":"", "rounds":[ { "roundName":"", "questions":[{ "question":"", "source":"", "confidence":0.0 }] } ], "note":"" }.`;

    const userPrompt = `Use public knowledge accessible up to present and produce round-wise previous-year interview questions for ${companyName}. For each question include a "source" (if available) and a confidence score between 0.0 and 1.0. If you cannot confidently claim historical source, mark the question's source as "inferred" and lower the confidence. If no info is available, return "rounds": [] and "note": "no prior questions found".`;

    return await this.generateContent(userPrompt, systemPrompt);
  }

  async getSkillResources(skill) {
    const systemPrompt = `You are a learning-content curator. Output JSON: { "skill":"", "resources":[ { "title":"", "url":"", "type":"video|article|doc|course|repo", "summary":"", "estimatedTime":"30m|2h|10h" } ], "clarify": false }.`;

    const userPrompt = `Given this skill: ${skill} produce up to 4 high-quality resources (title + URL + short 1-sentence summary + approximate time). Prefer official docs, high-quality tutorials, or canonical sources. If the skill is ambiguous, ask for clarification in a separate flagged key "clarify": true. Otherwise set "clarify": false.`;

    return await this.generateContent(userPrompt, systemPrompt);
  }

  async getResourcesForJD(jdText) {
    const systemPrompt = `You are a learning-content curator. Output ONLY valid JSON (no markdown, comments, or extra text).
The JSON must be an array of up to 6 skills, each with:
{ "skill": string, "resources": [ { "title": string, "url": string, "type": "video|article|doc|course|repo", "summary": string, "estimatedTime": "30m|2h|10h" } ] }.
For each skill provide 2-3 high-quality resources. Prefer concise 1-sentence summaries. If a skill has no resources, include the skill with an empty resources array.`;

    const userPrompt = `Extract key technical skills from this JD and provide curated resources: ${jdText}. Limit to the most impactful skills (max 6). Return ONLY the JSON array, no other text.`;

    return await this.generateContent(userPrompt, systemPrompt);
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeForLogging(data) {
    // Remove sensitive information before logging
    const sanitized = { ...data };
    
    if (sanitized.resumeText) {
      sanitized.resumeText = sanitized.resumeText.substring(0, 200) + '...';
    }
    
    if (sanitized.password) {
      delete sanitized.password;
    }
    
    return sanitized;
  }
}

module.exports = new GeminiService();
