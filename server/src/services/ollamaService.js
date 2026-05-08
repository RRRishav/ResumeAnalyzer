const http = require('http');
const https = require('https');
require('dotenv').config();

// ─── Ollama (Local) Config ──────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ─── Groq (Cloud Fallback) Config ───────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Provider Detection ─────────────────────────────────────────────
// In production, prefer Groq. Locally, prefer Ollama.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
//  GROQ (Cloud Fallback) — HTTPS requests to api.groq.com
// ─────────────────────────────────────────────────────────────────────

function groqRequest(messages, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      top_p: 0.9,
      response_format: { type: 'json_object' },
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout,
    };

    const req = https.request(options, (res) => {
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
      reject(new Error('Groq API request timed out'));
    });

    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────
//  UNIFIED API — Smart provider selection with fallback
// ─────────────────────────────────────────────────────────────────────

/**
 * Detect which LLM provider is available.
 * Priority: Ollama (local) first → Groq (cloud) fallback
 * In production: Groq first (Ollama won't be available on hosting)
 */
async function detectProvider() {
  if (IS_PRODUCTION) {
    // In production, check Groq first
    if (GROQ_API_KEY) return 'groq';
    // Unlikely but try Ollama in case self-hosted
    const ollamaUp = await checkOllamaLocal();
    if (ollamaUp) return 'ollama';
    return null;
  }

  // In development, check Ollama first
  const ollamaUp = await checkOllamaLocal();
  if (ollamaUp) return 'ollama';
  // Fall back to Groq if Ollama isn't running
  if (GROQ_API_KEY) return 'groq';
  return null;
}

/**
 * Health check — reports which provider is active
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

  if (provider === 'groq') {
    return {
      healthy: true,
      model: GROQ_MODEL,
      modelAvailable: true,
      provider: 'Groq Cloud (Llama)',
      url: GROQ_URL,
    };
  }

  // Neither available
  const hints = IS_PRODUCTION
    ? 'Set GROQ_API_KEY in environment variables. Get a free key at https://console.groq.com'
    : 'Start Ollama locally, or set GROQ_API_KEY in .env for cloud fallback';

  return {
    healthy: false,
    error: `No LLM provider available. ${hints}`,
    url: IS_PRODUCTION ? GROQ_URL : OLLAMA_URL,
    model: IS_PRODUCTION ? GROQ_MODEL : OLLAMA_MODEL,
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
 * Extract structured resume data — auto-selects Ollama or Groq
 */
async function extractResumeData(resumeText) {
  const startTime = Date.now();
  const provider = await detectProvider();

  if (!provider) {
    throw new Error(
      IS_PRODUCTION
        ? 'No LLM provider available. Set GROQ_API_KEY in environment variables.'
        : 'No LLM provider available. Start Ollama locally or set GROQ_API_KEY in .env.'
    );
  }

  const userPrompt = `Extract information from this resume:\n\n${resumeText.substring(0, 12000)}`;

  try {
    let rawResponse = '';
    let modelUsed = '';

    if (provider === 'ollama') {
      // ── Ollama (local) ──
      console.log(`🦙 Extracting via Ollama (${OLLAMA_MODEL})...`);
      const response = await ollamaRequest(userPrompt, SYSTEM_PROMPT);

      if (response.status !== 200) {
        const errMsg = response.raw
          ? `Ollama returned status ${response.status}`
          : (response.data?.error || `Ollama returned status ${response.status}`);
        throw new Error(errMsg);
      }

      rawResponse = response.data?.response || '';
      modelUsed = OLLAMA_MODEL;
    } else {
      // ── Groq (cloud) ──
      console.log(`☁️  Extracting via Groq (${GROQ_MODEL})...`);
      const response = await groqRequest([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      if (response.status !== 200) {
        const errMsg = response.data?.error?.message || `Groq API returned status ${response.status}`;
        throw new Error(errMsg);
      }

      rawResponse = response.data?.choices?.[0]?.message?.content || '';
      modelUsed = GROQ_MODEL;
    }

    const processingTime = Date.now() - startTime;
    const extracted = parseExtractedJSON(rawResponse);

    return {
      ...extracted,
      model_used: modelUsed,
      provider_used: provider,
      processing_time_ms: processingTime,
    };
  } catch (error) {
    throw new Error(`Extraction failed (${provider}): ${error.message}`);
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

module.exports = { checkOllamaHealth, extractResumeData };
