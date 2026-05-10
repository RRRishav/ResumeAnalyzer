const http = require('http');
require('dotenv').config();

// ─── Ollama (Local) Config ──────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Parse the OLLAMA_URL into hostname and port for http.request
 */
function getOllamaConnection() {
  try {
    const url = new URL(OLLAMA_URL);
    return {
      hostname: url.hostname,
      port: parseInt(url.port) || 11434,
    };
  } catch {
    return { hostname: 'localhost', port: 11434 };
  }
}

// ─────────────────────────────────────────────────────────────────────
//  OLLAMA (Local) — HTTP requests to localhost:11434
// ─────────────────────────────────────────────────────────────────────

function ollamaRequest(prompt, systemPrompt, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const { hostname, port } = getOllamaConnection();

    const body = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 4096,
      },
      format: 'json',
    });

    const options = {
      hostname,
      port,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: true });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out — the model may still be loading'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Check if local Ollama is running and the model is pulled
 */
async function checkOllamaLocal() {
  try {
    const { hostname, port } = getOllamaConnection();

    const tagsResponse = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname, port, path: '/api/tags', method: 'GET', timeout: 5000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, data, raw: true });
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
      req.end();
    });

    if (tagsResponse.status !== 200) return false;

    const models = tagsResponse.data?.models || [];
    return models.some(
      (m) => m.name === OLLAMA_MODEL || m.name.startsWith(`${OLLAMA_MODEL}:`)
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
//  UNIFIED API — Ollama Only
// ─────────────────────────────────────────────────────────────────────

/**
 * Detect if Ollama is available
 */
async function detectProvider() {
  const ollamaUp = await checkOllamaLocal();
  if (ollamaUp) return 'ollama';
  return null;
}

/**
 * Health check — reports Ollama status
 */
async function checkOllamaHealth() {
  const provider = await detectProvider();

  if (provider === 'ollama') {
    return {
      healthy: true,
      model: OLLAMA_MODEL,
      modelAvailable: true,
      provider: 'Ollama (Local)',
      url: OLLAMA_URL,
    };
  }

  return {
    healthy: false,
    error: 'Ollama is not running. Start Ollama with: ollama serve',
    url: OLLAMA_URL,
    model: OLLAMA_MODEL,
  };
}

/**
 * The shared system prompt for resume extraction
 */
const SYSTEM_PROMPT = `You are an expert resume parser. Extract ONLY the specified fields from the resume text. Return valid JSON only — no explanation, no markdown.

RULES:
- Extract ONLY the fields in the schema below
- If a field is not found, use null (strings) or [] (arrays)
- Do NOT include school names, college names, university names, city names, addresses, or locations
- Do NOT include date of birth, gender, nationality, marital status, or father's name
- Phone numbers should include country code if present
- For projects: extract title, 1-line description, and technologies used
- For skills: list individual skill names as simple strings
- For certifications: include cert name, issuing organization, and year
- For experience: include role, company, duration, and brief description

Return this exact JSON structure:
{
  "name": "<full name or null>",
  "phone": ["<phone numbers>"],
  "email": ["<email addresses>"],
  "links": {
    "portfolio": "<portfolio URL or null>",
    "github": "<GitHub URL or null>",
    "linkedin": "<LinkedIn URL or null>",
    "other": ["<other relevant URLs>"]
  },
  "tenth_marks": "<10th marks/percentage/CGPA or null>",
  "twelfth_marks": "<12th marks/percentage/CGPA or null>",
  "degree": "<degree name like B.Tech, BCA, MCA, etc. or null>",
  "stream": "<stream/branch like CSE, IT, ECE, etc. or null>",
  "cgpa": "<college CGPA or percentage or null>",
  "projects": [{"title": "<name>", "description": "<1-line desc>", "tech_stack": ["<tech>"]}],
  "skills": ["<skill1>", "<skill2>"],
  "certifications": [{"name": "<cert>", "issuer": "<org or null>", "year": "<year or null>"}],
  "experience": [{"role": "<title>", "company": "<company>", "duration": "<period>", "description": "<brief desc>"}]
}`;

/**
 * Extract structured resume data using Ollama
 */
async function extractResumeData(resumeText) {
  const startTime = Date.now();
  const provider = await detectProvider();

  if (!provider) {
    throw new Error('Ollama is not running. Start Ollama with: ollama serve');
  }

  const userPrompt = `Extract information from this resume:\n\n${resumeText.substring(0, 12000)}`;

  try {
    console.log(`🦙 Extracting via Ollama (${OLLAMA_MODEL})...`);
    const response = await ollamaRequest(userPrompt, SYSTEM_PROMPT);

    if (response.status !== 200) {
      const errMsg = response.raw
        ? `Ollama returned status ${response.status}`
        : (response.data?.error || `Ollama returned status ${response.status}`);
      throw new Error(errMsg);
    }

    const rawResponse = response.data?.response || '';
    const processingTime = Date.now() - startTime;
    const extracted = parseExtractedJSON(rawResponse);

    return {
      ...extracted,
      model_used: OLLAMA_MODEL,
      provider_used: 'ollama',
      processing_time_ms: processingTime,
    };
  } catch (error) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
//  JSON Parsing & Sanitization (shared by both providers)
// ─────────────────────────────────────────────────────────────────────

function parseExtractedJSON(text) {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('No JSON found in LLM response:', cleaned.substring(0, 500));
    return getEmptyExtraction();
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(cleaned);
    return sanitizeExtraction(parsed);
  } catch (e) {
    try {
      const fixed = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      const parsed = JSON.parse(fixed);
      return sanitizeExtraction(parsed);
    } catch (e2) {
      console.error('Failed to parse LLM JSON response:', e2.message);
      return getEmptyExtraction();
    }
  }
}

function sanitizeExtraction(data) {
  return {
    name: typeof data.name === 'string' ? data.name : null,
    phone: Array.isArray(data.phone) ? data.phone.filter(Boolean) : (data.phone ? [String(data.phone)] : []),
    email: Array.isArray(data.email) ? data.email.filter(Boolean) : (data.email ? [String(data.email)] : []),
    links: {
      portfolio: data.links?.portfolio || null,
      github: data.links?.github || null,
      linkedin: data.links?.linkedin || null,
      other: Array.isArray(data.links?.other) ? data.links.other.filter(Boolean) : [],
    },
    tenth_marks: data.tenth_marks ? String(data.tenth_marks) : null,
    twelfth_marks: data.twelfth_marks ? String(data.twelfth_marks) : null,
    degree: data.degree || null,
    stream: data.stream || null,
    cgpa: data.cgpa ? String(data.cgpa) : null,
    projects: Array.isArray(data.projects)
      ? data.projects.map((p) => ({
          title: p.title || 'Untitled Project',
          description: p.description || '',
          tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
        }))
      : [],
    skills: Array.isArray(data.skills) ? data.skills.filter(Boolean).map(String) : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications.map((c) => ({
          name: c.name || 'Unknown',
          issuer: c.issuer || null,
          year: c.year ? String(c.year) : null,
        }))
      : [],
    experience: Array.isArray(data.experience)
      ? data.experience.map((e) => ({
          role: e.role || 'Unknown Role',
          company: e.company || '',
          duration: e.duration || '',
          description: e.description || '',
        }))
      : [],
  };
}

function getEmptyExtraction() {
  return {
    name: null,
    phone: [],
    email: [],
    links: { portfolio: null, github: null, linkedin: null, other: [] },
    tenth_marks: null,
    twelfth_marks: null,
    degree: null,
    stream: null,
    cgpa: null,
    projects: [],
    skills: [],
    certifications: [],
    experience: [],
  };
}

// ─────────────────────────────────────────────────────────────────────
//  RESUME ANALYSIS — Using Ollama
// ─────────────────────────────────────────────────────────────────────

/**
 * Analyze resume with Ollama
 */
async function analyzeWithOllama(resumeText, extractedSkills = []) {
  try {
    const provider = await detectProvider();

    if (!provider) {
      throw new Error('Ollama is not running');
    }

    const analysisPrompt = `You are an expert HR recruiter. Analyze this resume and return ONLY valid JSON (no markdown fences).

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

    const systemPrompt = 'You are an expert resume analyzer. Return ONLY valid JSON, no explanation or markdown.';

    console.log(`🦙 Analyzing resume with Ollama (${OLLAMA_MODEL})...`);
    const response = await ollamaRequest(analysisPrompt, systemPrompt);

    if (response.status !== 200) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const rawResponse = response.data?.response || '';
    let cleaned = rawResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }

    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    const analysis = JSON.parse(cleaned);

    // Ensure scores are valid numbers between 0-100
    analysis.overall_score = Math.min(100, Math.max(0, parseInt(analysis.overall_score) || 50));
    analysis.ats_score = Math.min(100, Math.max(0, parseInt(analysis.ats_score) || 50));

    return analysis;
  } catch (error) {
    console.error('Ollama analysis error:', error.message);
    return getFallbackAnalysis(resumeText, extractedSkills);
  }
}

/**
 * Fallback analysis when Ollama fails
 */
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

module.exports = { checkOllamaHealth, extractResumeData, analyzeWithOllama };
