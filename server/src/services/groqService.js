/**
 * Groq Cloud LLM Service — Drop-in replacement for ollamaService.js
 *
 * Provides the same three exports:
 *   • checkOllamaHealth()   → renamed internally but same API contract
 *   • extractResumeData()   → structured data extraction via Groq
 *   • analyzeWithOllama()   → resume analysis via Groq
 *
 * Uses the Groq SDK with Llama 3.3 70B model (free tier).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Groq = require('groq-sdk');

// ─── Config ──────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const client = new Groq({ apiKey: GROQ_API_KEY });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HEALTH CHECK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkOllamaHealth() {
  if (!GROQ_API_KEY) {
    return {
      healthy: false,
      error: 'GROQ_API_KEY not set in .env',
      provider: 'Groq Cloud',
      model: GROQ_MODEL,
    };
  }

  try {
    // Quick model check — list models
    const models = await client.models.list();
    const available = models?.data?.some(
      (m) => m.id === GROQ_MODEL || m.id.startsWith(GROQ_MODEL)
    );

    return {
      healthy: true,
      model: GROQ_MODEL,
      modelAvailable: available !== false,
      provider: 'Groq Cloud',
      url: 'https://api.groq.com',
    };
  } catch (error) {
    return {
      healthy: false,
      error: `Groq API error: ${error.message}`,
      provider: 'Groq Cloud',
      model: GROQ_MODEL,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RESUME DATA EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EXTRACT_SYSTEM_PROMPT = `You are an expert resume parser. Extract ONLY the specified fields from the resume text. Return valid JSON only — no explanation, no markdown.

RULES:
- Extract ONLY the fields in the schema below
- If a field is not found, use null (strings) or [] (arrays)
- Never return placeholder text, angle-bracket examples, or [object Object]
- Do NOT include city names, addresses, or locations (but DO include school, college, and university names in the education section)
- Do NOT include date of birth, gender, nationality, marital status, or father's name
- Phone numbers should include country code if present
- For projects: extract title, 1-line description, and technologies used
- For skills: list individual skill names as simple strings
- For certifications: include cert name, issuing organization, and year
- For experience: include role, company, duration, and brief description
- For suggested_roles: analyze the candidate's skills, experience, and projects, and list 2-4 target job roles they are best fit for.

Return this exact JSON structure:
{
  "name": "<full name or null>",
  "phone": ["<phone numbers>"],
  "email": ["<email addresses>"],
  "location": null,
  "professional_summary": null,
  "total_experience": null,
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
  "education": [{"degree": "<degree or null>", "institution": "<college/school/university name or null>", "stream": "<stream/branch or null>", "score": "<CGPA or percentage or null>", "duration": "<years/duration or null>"}],
  "projects": [{"title": "<name>", "description": "<1-line desc>", "tech_stack": ["<tech>"]}],
  "skills": ["<skill1>", "<skill2>"],
  "certifications": [{"name": "<cert>", "issuer": "<org or null>", "year": "<year or null>"}],
  "achievements": [],
  "languages": [],
  "experience": [{"role": "<title>", "company": "<company>", "duration": "<period>", "description": "<brief desc>"}],
  "suggested_roles": ["<role 1>", "<role 2>", "<role 3>"]
}`;

/**
 * Extract structured resume data using Groq API
 */
async function extractResumeData(resumeText) {
  const startTime = Date.now();

  // Also run local extraction as fallback/merge source
  const fastExtracted = localExtractResumeData(resumeText);

  try {
    console.log(`☁️  Extracting via Groq Cloud (${GROQ_MODEL})...`);

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract compact resume JSON from this text:\n\n${resumeText.substring(0, 5000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
    });

    const rawResponse = response.choices?.[0]?.message?.content || '';
    const groqExtracted = parseExtractedJSON(rawResponse);
    const merged = mergeExtraction(groqExtracted, fastExtracted);

    return {
      ...merged,
      model_used: GROQ_MODEL,
      provider_used: 'groq',
      processing_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    console.warn(`Groq extraction failed, using local parser: ${error.message}`);
    return {
      ...fastExtracted,
      model_used: `${GROQ_MODEL} (local fallback)`,
      provider_used: 'local-fast',
      processing_time_ms: Date.now() - startTime,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RESUME ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyze resume with Groq API (same signature as analyzeWithOllama)
 */
async function analyzeWithOllama(resumeText, extractedSkills = []) {
  try {
    console.log(`☁️  Analyzing resume with Groq Cloud (${GROQ_MODEL})...`);

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

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume analyzer. Return ONLY valid JSON, no explanation or markdown.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const rawResponse = response.choices?.[0]?.message?.content || '';

    let cleaned = rawResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in Groq response');
    }

    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    const analysis = JSON.parse(cleaned);

    // Ensure scores are valid numbers between 0-100
    analysis.overall_score = Math.min(100, Math.max(0, parseInt(analysis.overall_score) || 50));
    analysis.ats_score = Math.min(100, Math.max(0, parseInt(analysis.ats_score) || 50));

    return analysis;
  } catch (error) {
    console.error('Groq analysis error:', error.message);
    return getFallbackAnalysis(resumeText, extractedSkills);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOCAL EXTRACTION HELPERS (kept from ollamaService for fallback)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function localExtractResumeData(text) {
  const cleanText = normalizeResumeText(text);
  const normalized = cleanText.replace(/\s+/g, ' ').trim();
  const lines = getCleanLines(cleanText);
  const emails = unique(normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []);
  const phones = unique((normalized.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [])
    .map((phone) => phone.replace(/\s+/g, ' ').trim())
    .filter((phone) => {
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 10
        && digits.length <= 14
        && !/(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}/.test(phone);
    }));
  const urls = unique(normalized.match(/https?:\/\/[^\s),]+|(?:www\.)[^\s),]+|(?:github|linkedin)\.com\/[^\s),]+/gi) || [])
    .map(normalizeUrl);
  const github = urls.find((url) => /github\.com/i.test(url)) || null;
  const linkedin = urls.find((url) => /linkedin\.com/i.test(url)) || null;
  const portfolio = urls.find((url) => !/github\.com|linkedin\.com/i.test(url))
    || extractLabeledUrl(normalized, /portfolio|website|personal site/i);
  const education = extractEducation(normalized);
  const skills = extractSkills(cleanText);
  const educationItems = extractEducationItems(cleanText, education);

  return sanitizeExtraction({
    name: guessName(lines, emails),
    phone: phones.slice(0, 3),
    email: emails.slice(0, 3),
    location: extractLocation(lines),
    professional_summary: extractSummary(cleanText),
    total_experience: extractTotalExperience(normalized),
    links: { portfolio, github, linkedin, other: urls.filter((url) => url !== github && url !== linkedin && url !== portfolio).slice(0, 5) },
    tenth_marks: education.tenth_marks,
    twelfth_marks: education.twelfth_marks,
    degree: education.degree,
    stream: education.stream,
    cgpa: education.cgpa,
    education: educationItems,
    projects: extractProjects(cleanText).slice(0, 6),
    skills,
    certifications: extractCertifications(cleanText).slice(0, 6),
    achievements: extractNamedItems(cleanText, /achievements?|accomplishments?|awards/i, ['skills', 'projects', 'experience', 'education', 'certifications', 'languages']).slice(0, 8),
    languages: extractLanguages(cleanText),
    experience: extractExperience(cleanText).slice(0, 6),
  });
}

function normalizeResumeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[•◦▪◦]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function unique(values) {
  const seen = new Set();
  return values
    .map((value) => String(value).trim())
    .filter(Boolean)
    .filter((value) => { const key = value.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

function getCleanLines(text) { return text.split(/\n+/).map((line) => line.trim()).filter(Boolean); }

function normalizeUrl(url) {
  const trimmed = url.replace(/[.,;]+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function extractLabeledUrl(text, labelRegex) {
  const match = text.match(new RegExp(`(?:${labelRegex.source})[:\\\\s-]+([a-z0-9.-]+\\.[a-z]{2,}(?:\\/[^\\s),]+)?)`, 'i'));
  return match ? normalizeUrl(match[1]) : null;
}

function guessName(lines, emails) {
  const emailUser = emails[0]?.split('@')[0].replace(/[._-]+/g, ' ');
  const blocked = /resume|curriculum|vitae|email|phone|mobile|linkedin|github|portfolio|address|skills|education/i;
  const candidate = lines.slice(0, 10).find((line) => {
    const words = line.split(/\s+/);
    return line.length <= 50 && words.length >= 2 && words.length <= 4 && /^[a-z .'-]+$/i.test(line) && !blocked.test(line);
  });
  return candidate || titleCase(emailUser || '');
}

function titleCase(value) {
  return value ? value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) : null;
}

function findFirst(text, regex) { const match = text.match(regex); return match ? String(match[1] || match[0]).trim() : null; }

function findMarks(text, regex) { const match = text.match(regex); return match ? String(match[1] || match[2]).trim() : null; }

function extractEducation(text) {
  return {
    tenth_marks: findMarks(text, /\b(?:10th|class\s*x|secondary|ssc)\b[^.]{0,120}?(\d{1,2}(?:\.\d+)?\s?%|\d(?:\.\d{1,2})?\s?\/\s?10)/i)
      || findMarks(text, /(\d{1,2}(?:\.\d+)?\s?%|\d(?:\.\d{1,2})?\s?\/\s?10)[^.]{0,80}\b(?:10th|class\s*x|secondary|ssc)\b/i),
    twelfth_marks: findMarks(text, /\b(?:12th|class\s*xii|higher secondary|hsc)\b[^.]{0,120}?(\d{1,2}(?:\.\d+)?\s?%|\d(?:\.\d{1,2})?\s?\/\s?10)/i)
      || findMarks(text, /(\d{1,2}(?:\.\d+)?\s?%|\d(?:\.\d{1,2})?\s?\/\s?10)[^.]{0,80}\b(?:12th|class\s*xii|higher secondary|hsc)\b/i),
    degree: findFirst(text, /\b(B\.?\s?Tech|B\.?\s?E\.?|BCA|B\.?\s?Sc|MCA|M\.?\s?Tech|M\.?\s?S\.?|MBA|BBA|Bachelor of [A-Za-z ]+|Master of [A-Za-z ]+)\b/i),
    stream: findFirst(text, /\b(Computer Science(?: and Engineering)?|CSE|Information Technology|IT|Electronics(?: and Communication)?|ECE|EEE|Mechanical|Civil|Data Science|Artificial Intelligence|AI|Machine Learning|ML)\b/i),
    cgpa: findFirst(text, /\b(?:CGPA|GPA)[:\s-]*(\d(?:\.\d{1,2})?\s?(?:\/\s?10)?)/i) || findFirst(text, /\b(\d(?:\.\d{1,2})?\s?\/\s?10)\b/i),
  };
}

function extractLocation(lines) {
  const locationLine = lines.slice(0, 12).find((line) => /\b(location|address|based in)\b/i.test(line));
  if (locationLine) return locationLine.replace(/^(location|address|based in)[:\s-]*/i, '').trim();
  const contactLine = lines.slice(0, 8).find((line) => /,\s*[A-Za-z]{2,}|India|USA|United States|Remote/i.test(line));
  if (!contactLine || /@|github|linkedin|http|\d{6,}|javascript|react|node|python|java|mongodb|skills/i.test(contactLine)) return null;
  return contactLine.length <= 80 ? contactLine : null;
}

function extractSummary(text) {
  const items = extractNamedItems(text, /summary|profile|objective|about/i, ['skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'languages']);
  return items.length ? items.slice(0, 3).join(' ') : null;
}

function extractTotalExperience(text) {
  return findFirst(text, /\b(\d{1,2}\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience)\b/i) || findFirst(text, /\bexperience[:\s-]*(\d{1,2}\+?\s*(?:years?|yrs?))/i);
}

function extractEducationItems(text, fallback) {
  const items = extractNamedItems(text, /education|academic/i, ['skills', 'projects', 'experience', 'certifications', 'achievements', 'languages']);
  const parsed = items.map((item) => ({
    degree: findFirst(item, /\b(B\.?\s?Tech|B\.?\s?E\.?|BCA|B\.?\s?Sc|MCA|M\.?\s?Tech|M\.?\s?S\.?|MBA|BBA|Bachelor of [A-Za-z ]+|Master of [A-Za-z ]+)\b/i),
    institution: extractInstitution(item),
    stream: findFirst(item, /\b(Computer Science(?: and Engineering)?|CSE|Information Technology|IT|Electronics(?: and Communication)?|ECE|EEE|Mechanical|Civil|Data Science|Artificial Intelligence|AI|Machine Learning|ML)\b/i),
    score: findFirst(item, /\b(?:CGPA|GPA)[:\s-]*(\d(?:\.\d{1,2})?\s?(?:\/\s?10)?)/i) || findFirst(item, /\b(\d{1,2}(?:\.\d+)?\s?%|\d(?:\.\d{1,2})?\s?\/\s?10)\b/i),
    duration: findFirst(item, /\b((?:20\d{2}|19\d{2})\s?[-–]\s?(?:20\d{2}|present|current))\b/i),
  })).filter((item) => item.degree || item.institution || item.score);
  if (parsed.length) return parsed;
  if (fallback.degree || fallback.stream || fallback.cgpa) return [{ degree: fallback.degree, institution: null, stream: fallback.stream, score: fallback.cgpa, duration: null }];
  return [];
}

function extractInstitution(item) {
  const match = item.match(/\b(?:at|from|,)\s*([A-Z][A-Za-z0-9 .&'-]{3,80}?(?:University|College|Institute|School|Academy)?)(?:\s+(?:19|20)\d{2}| CGPA| GPA|$)/);
  return match ? match[1].trim() : null;
}

function extractLanguages(text) {
  return extractNamedItems(text, /languages?/i, ['skills', 'projects', 'experience', 'education', 'certifications', 'achievements'])
    .flatMap((line) => line.split(/[,|;/]/))
    .map((language) => language.replace(/\([^)]*\)/g, '').trim())
    .filter((language) => /^[A-Za-z ]{2,25}$/.test(language))
    .slice(0, 8);
}

function extractNamedItems(text, headingRegex, stopHeadings) {
  const lines = getCleanLines(text);
  const start = lines.findIndex((line) => isSectionHeading(line, headingRegex));
  if (start === -1) return [];
  const stopRegex = new RegExp(`^(${stopHeadings.join('|')})\\b`, 'i');
  const items = [];
  for (const line of lines.slice(start + 1)) {
    if (isSectionHeading(line, stopRegex)) break;
    const cleaned = line.replace(/^[-*•\d.)\s]+/, '').trim();
    if (cleaned.length >= 4 && cleaned.length <= 160) items.push(cleaned);
    if (items.length >= 10) break;
  }
  return unique(items);
}

function isSectionHeading(line, regex) {
  const cleaned = line.replace(/^[-*\d.)\s]+/, '').replace(/:$/, '').trim();
  return cleaned.length <= 40 && regex.test(cleaned);
}

function extractSkills(text) {
  const sectionSkills = extractNamedItems(text, /technical skills|skills|technologies|tech stack/i, ['projects', 'experience', 'education', 'certifications', 'achievements'])
    .flatMap((line) => line.split(/[,|;/]/))
    .map((skill) => skill.replace(/^(languages|frontend|backend|database|databases|tools|frameworks)[:\s-]*/i, '').trim())
    .filter((skill) => skill.length >= 2 && skill.length <= 35);
  return unique([...detectSkills(text), ...sectionSkills]).slice(0, 40);
}

function detectSkills(text) {
  const skillBank = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL',
    'Python', 'Java', 'C++', 'C#', 'HTML', 'CSS', 'Tailwind', 'Bootstrap',
    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'REST API', 'GraphQL',
    'Machine Learning', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow',
    'Next.js', 'Vite', 'Redux', 'Firebase', 'PostgreSQL', 'MySQL', 'Django',
    'Flask', 'Spring Boot', 'PHP', 'Laravel', 'Figma', 'Linux', 'OOP',
    'React.js', 'Angular', 'Vue.js', 'Svelte', 'jQuery', 'RESTful API',
    'NoSQL', 'Mongoose', 'Prisma', 'Sequelize', 'Redis', 'Jenkins', 'CI/CD',
    'GitHub Actions', 'Netlify', 'Vercel', 'Render', 'Ollama', 'LLM',
    'Generative AI', 'NLP', 'Scikit-learn', 'Power BI', 'Tableau', 'Excel',
  ];
  return skillBank.filter((skill) => new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i').test(text));
}

function extractProjects(text) {
  return extractNamedItems(text, /projects?/i, ['skills', 'experience', 'education', 'certifications', 'achievements'])
    .map((item) => {
      const [rawTitle, ...rest] = item.split(/\s[-:|]\s/);
      const title = rawTitle.replace(/\b(tech stack|technologies used)\b.*$/i, '').trim() || item;
      const description = rest.join(' - ').replace(/\b(tech stack|technologies used)[:\s-]*/i, '').trim();
      const techText = item.match(/\b(?:tech stack|technologies used)[:\s-]*(.+)$/i)?.[1] || item;
      return { title, description: description === title ? '' : description, tech_stack: extractSkills(techText).slice(0, 10) };
    })
    .filter((project) => project.title && !/^projects?$/i.test(project.title));
}

function extractCertifications(text) {
  return extractNamedItems(text, /certifications?|certificates?|courses?/i, ['skills', 'projects', 'experience', 'education', 'achievements', 'languages'])
    .map((item) => {
      const year = findFirst(item, /\b(20\d{2}|19\d{2})\b/);
      const cleaned = item.replace(/\b(20\d{2}|19\d{2})\b/g, '').replace(/\s[-|,]\s*$/, '').trim();
      const [name, issuer] = cleaned.split(/\s[-|]\s/);
      return { name: (name || cleaned).trim(), issuer: issuer?.trim() || null, year };
    })
    .filter((cert) => cert.name && !/^certifications?|certificates?|courses?$/i.test(cert.name));
}

function extractExperience(text) {
  return extractNamedItems(text, /experience|employment|work history|internships?/i, ['skills', 'projects', 'education', 'certifications', 'achievements'])
    .map((item) => {
      const duration = findFirst(item, /\b((?:20\d{2}|19\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{0,4}\s*-\s*(?:20\d{2}|19\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{0,4})\b/i);
      const cleaned = duration ? item.replace(duration, '').replace(/\s[-|,]\s*$/, '').trim() : item;
      const parts = cleaned.split(/\s[-|]\s/).map((part) => part.trim()).filter(Boolean);
      return { role: parts[0] || cleaned, company: parts[1] || '', duration: duration || '', description: parts.slice(2).join(' - ') };
    })
    .filter((item) => item.role && !/^experience|employment|work history|internships?$/i.test(item.role));
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── Merge & Sanitize ─────────────────────────────────────────────

function mergeExtraction(primary, secondary) {
  const merged = { ...primary };
  for (const key of ['name', 'location', 'professional_summary', 'total_experience', 'tenth_marks', 'twelfth_marks', 'degree', 'stream', 'cgpa']) {
    merged[key] = primary[key] || secondary[key] || null;
  }
  for (const key of ['phone', 'email', 'education', 'projects', 'skills', 'certifications', 'achievements', 'languages', 'experience', 'suggested_roles']) {
    merged[key] = primary[key]?.length ? primary[key] : (secondary[key] || []);
  }
  merged.links = {
    portfolio: primary.links?.portfolio || secondary.links?.portfolio || null,
    github: primary.links?.github || secondary.links?.github || null,
    linkedin: primary.links?.linkedin || secondary.links?.linkedin || null,
    other: primary.links?.other?.length ? primary.links.other : (secondary.links?.other || []),
  };
  return sanitizeExtraction(merged);
}

function parseExtractedJSON(text) {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) { console.error('No JSON found in Groq response'); return getEmptyExtraction(); }
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  try { return sanitizeExtraction(JSON.parse(cleaned)); }
  catch {
    try { return sanitizeExtraction(JSON.parse(cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/'/g, '"'))); }
    catch (e2) { console.error('Failed to parse Groq JSON:', e2.message); return getEmptyExtraction(); }
  }
}

function sanitizeExtraction(data) {
  return {
    name: cleanScalar(data.name),
    phone: cleanArray(data.phone),
    email: cleanArray(data.email),
    location: cleanScalar(data.location),
    professional_summary: cleanScalar(data.professional_summary),
    total_experience: cleanScalar(data.total_experience),
    links: {
      portfolio: cleanPortfolioLink(data.links?.portfolio),
      github: cleanScalar(data.links?.github),
      linkedin: cleanScalar(data.links?.linkedin),
      other: cleanArray(data.links?.other).filter((url) => !/github\.com|linkedin\.com/i.test(url)),
    },
    tenth_marks: cleanScalar(data.tenth_marks),
    twelfth_marks: cleanScalar(data.twelfth_marks),
    degree: cleanScalar(data.degree),
    stream: cleanScalar(data.stream),
    cgpa: cleanScalar(data.cgpa),
    education: Array.isArray(data.education)
      ? data.education.map((e) => ({ degree: cleanScalar(e.degree), institution: cleanScalar(e.institution), stream: cleanScalar(e.stream), score: cleanScalar(e.score), duration: cleanScalar(e.duration) })).filter((e) => e.degree || e.institution || e.stream || e.score || e.duration)
      : [],
    projects: Array.isArray(data.projects)
      ? data.projects.map((p) => ({ title: cleanScalar(p.title) || 'Untitled Project', description: cleanScalar(p.description) || '', tech_stack: cleanArray(p.tech_stack) })).filter((p) => p.title !== 'Untitled Project' || p.description || p.tech_stack.length)
      : [],
    skills: cleanArray(data.skills),
    certifications: Array.isArray(data.certifications)
      ? data.certifications.map((c) => ({ name: cleanScalar(c.name), issuer: cleanScalar(c.issuer), year: cleanScalar(c.year) })).filter((c) => c.name)
      : [],
    achievements: cleanArray(data.achievements),
    languages: cleanArray(data.languages),
    experience: Array.isArray(data.experience)
      ? data.experience.map((e) => ({ role: cleanScalar(e.role), company: cleanScalar(e.company) || '', duration: cleanScalar(e.duration) || '', description: cleanScalar(e.description) || '' })).filter((e) => e.role || e.company || e.duration || e.description)
      : [],
    suggested_roles: cleanArray(data.suggested_roles),
  };
}

function cleanArray(value) {
  const values = Array.isArray(value) ? value : (value ? [value] : []);
  return unique(values.map(cleanScalar).filter(Boolean));
}

function cleanPortfolioLink(value) {
  const link = cleanScalar(value);
  if (!link || /github\.com|linkedin\.com/i.test(link)) return null;
  return link;
}

function cleanScalar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') value = value.name || value.title || value.value || value.text || '';
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  if (/^\[object Object\]$/i.test(cleaned)) return null;
  if (/^<.*>$/.test(cleaned)) return null;
  if (/\bor null\b/i.test(cleaned)) return null;
  if (/^(null|undefined|unknown|n\/a|na)$/i.test(cleaned)) return null;
  if (/^(skill\d+|cert|title|company|period|phone numbers?|email addresses?|github url|linkedin url|name of project)$/i.test(cleaned)) return null;
  return cleaned;
}

function getEmptyExtraction() {
  return {
    name: null, phone: [], email: [], location: null, professional_summary: null,
    total_experience: null, links: { portfolio: null, github: null, linkedin: null, other: [] },
    tenth_marks: null, twelfth_marks: null, degree: null, stream: null, cgpa: null,
    education: [], projects: [], skills: [], certifications: [], achievements: [], languages: [], experience: [],
    suggested_roles: [],
  };
}

// ─── Fallback Analysis ────────────────────────────────────────────

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
