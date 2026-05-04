const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

let genAI = null;
let model = null;

function initGemini() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('⚠️  Gemini API key not configured. Using fallback mode.');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('🤖 Gemini AI initialized');
    return true;
  } catch (error) {
    console.error('❌ Gemini init failed:', error.message);
    return false;
  }
}

async function analyzeWithGemini(resumeText, extractedSkills = []) {
  if (!model) return getFallbackAnalysis(resumeText, extractedSkills);

  const prompt = `You are an expert HR recruiter. Analyze this resume and return ONLY valid JSON (no markdown fences).

RESUME:
"""
${resumeText.substring(0, 8000)}
"""

DETECTED SKILLS: ${extractedSkills.join(', ')}

Return JSON with this exact structure:
{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "experience_level": "<Entry Level|Junior|Mid-Level|Senior|Lead|Executive>",
  "strengths": ["<str1>","<str2>","<str3>","<str4>","<str5>"],
  "weaknesses": ["<w1>","<w2>","<w3>","<w4>"],
  "suggestions": [{"priority":"high|medium|low","category":"formatting|content|skills|experience","text":"<suggestion>"}],
  "career_recommendations": [{"role":"<title>","match_score":<0-100>,"reason":"<why>"}],
  "summary": "<2-3 sentence summary>",
  "missing_skills": ["<skill>"],
  "keywords_to_add": ["<keyword>"]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 4096 },
    });
    let text = result.response.text().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const analysis = JSON.parse(text);
    analysis.overall_score = Math.min(100, Math.max(0, parseInt(analysis.overall_score) || 50));
    analysis.ats_score = Math.min(100, Math.max(0, parseInt(analysis.ats_score) || 50));
    return analysis;
  } catch (error) {
    console.error('Gemini error:', error.message);
    return getFallbackAnalysis(resumeText, extractedSkills);
  }
}

function getFallbackAnalysis(resumeText, extractedSkills = []) {
  const wordCount = resumeText.split(/\s+/).length;
  const checks = {
    email: /[\w.-]+@[\w.-]+\.\w+/.test(resumeText),
    phone: /[\d\s\-().]{10,}/.test(resumeText),
    linkedin: /linkedin/i.test(resumeText),
    summary: /summary|objective|about|profile/i.test(resumeText),
    experience: /experience|work history|employment/i.test(resumeText),
    education: /education|university|degree|bachelor|master/i.test(resumeText),
    projects: /project|portfolio/i.test(resumeText),
    certs: /certification|certified/i.test(resumeText),
  };

  let score = 40, ats = 35;
  if (checks.email) { score += 5; ats += 5; }
  if (checks.phone) { score += 5; ats += 5; }
  if (checks.linkedin) { score += 3; ats += 3; }
  if (checks.summary) { score += 8; ats += 8; }
  if (checks.experience) { score += 10; ats += 10; }
  if (checks.education) { score += 8; ats += 8; }
  if (checks.projects) { score += 5; ats += 3; }
  if (checks.certs) { score += 5; ats += 5; }
  if (extractedSkills.length > 5) { score += 5; ats += 5; }
  if (extractedSkills.length > 10) { score += 5; ats += 5; }
  if (wordCount > 200 && wordCount < 1000) { score += 5; ats += 5; }

  let level = 'Entry Level';
  if (/senior|lead|principal|architect/i.test(resumeText)) level = 'Senior';
  else if (/mid.?level|[3-5]\+?\s*years/i.test(resumeText)) level = 'Mid-Level';
  else if (/junior|[1-2]\+?\s*year/i.test(resumeText)) level = 'Junior';

  const strengths = [], weaknesses = [];
  if (checks.email && checks.phone) strengths.push('Complete contact information');
  else weaknesses.push('Missing contact information');
  if (checks.summary) strengths.push('Professional summary included');
  else weaknesses.push('Missing professional summary');
  if (checks.experience) strengths.push('Work experience documented');
  else weaknesses.push('No work experience section');
  if (checks.education) strengths.push('Education section present');
  else weaknesses.push('Education details missing');
  if (extractedSkills.length > 5) strengths.push(`${extractedSkills.length} skills detected`);
  else weaknesses.push('Add more technical keywords');

  return {
    overall_score: Math.min(score, 78),
    ats_score: Math.min(ats, 75),
    experience_level: level,
    strengths, weaknesses,
    suggestions: [
      { priority: 'high', category: 'content', text: 'Add quantifiable achievements with metrics' },
      { priority: 'high', category: 'formatting', text: 'Use ATS-friendly format with clear headings' },
      { priority: 'medium', category: 'skills', text: 'Add industry-specific keywords' },
      { priority: 'medium', category: 'experience', text: 'Use strong action verbs' },
      { priority: 'low', category: 'content', text: 'Add portfolio or GitHub link' },
    ],
    career_recommendations: [
      { role: 'Software Developer', match_score: 70, reason: 'Technical skills match' },
      { role: 'Full Stack Engineer', match_score: 65, reason: 'Frontend + backend skills' },
    ],
    summary: `${level} candidate with ${extractedSkills.length} skills. Needs more quantifiable achievements.`,
    missing_skills: ['TypeScript', 'Docker', 'CI/CD'],
    keywords_to_add: ['agile', 'cross-functional', 'optimization'],
  };
}

module.exports = { initGemini, analyzeWithGemini };
