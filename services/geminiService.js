const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateContent(prompt, systemPrompt = null) {
    try {
      const startTime = Date.now();
      
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
      }

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      let text = response.text();
      
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
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - Date.now()
      };
    }
  }

  async parseResumeAndJD(resumeText, jdText) {
    const systemPrompt = `You are an extraction agent. Output ONLY valid JSON without any markdown formatting, comments, or extra text. The JSON must match this exact schema: { "name": "", "email": "", "skills": ["",""], "experience": [{"company":"","title":"","start":"","end":"","bullets":[""]}], "education": [{"institution":"","degree":"","year":""}], "projects": [{"name":"","summary":""}] }.`;

    const userPrompt = `Here is the resume text: ${resumeText}. If a field is missing, return empty string or empty list for that key. Return ONLY the JSON object, no other text.`;

    return await this.generateContent(userPrompt, systemPrompt);
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
    const systemPrompt = `You are a learning-content curator. For each skill in the job description, output JSON: { "skill":"", "resources":[ { "title":"", "url":"", "type":"video|article|doc|course|repo", "summary":"", "estimatedTime":"30m|2h|10h" } ] }. Return an array of skill objects.`;

    const userPrompt = `Extract all technical skills from this job description and provide learning resources for each: ${jdText}. For each skill, provide 2-4 high-quality resources with title, URL, type, summary, and estimated time.`;

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
