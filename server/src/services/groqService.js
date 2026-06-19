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

const MODEL_EXTRACTING = process.env.MODEL_EXTRACTING || 'llama-3.3-70b-versatile';
const MODEL_RECOMMENDATION = process.env.MODEL_RECOMMENDATION || 'qwen/qwen3-32b';
const MODEL_IMPROVEMENT = process.env.MODEL_IMPROVEMENT || 'llama-3.1-8b-instant';

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

const EXTRACT_SYSTEM_PROMPT = `You are an expert resume parser. Extract ALL important details from the resume text. Return valid JSON only — no explanation, no markdown.

RULES:
- Extract ALL the fields in the schema below.
- If a field is not found, use null (strings), {} (objects) or [] (arrays).
- Never return placeholder text, angle-bracket examples, or [object Object].
- Extract name, email, phone, location, and all profile URLs (GitHub, LinkedIn, Portfolio) as they appear in the resume.
- For education: Extract degree, institution/college/university name, stream/branch, CGPA/percentage, and duration.
- For professional_summary: Only extract the professional summary if it is explicitly written in the resume (under sections like Summary, Objective, Profile, About). Do NOT auto-generate, synthesize, or invent a summary if the resume does not contain one. If not explicitly present, set this field to null. Under no circumstances should you return placeholder messages like "No professional summary" or generic candidate descriptions.
- For projects: extract title, complete detailed description (including all key features, responsibilities, achievements, and metrics where available), and technologies used. Do NOT truncate or summarize details to a single line; extract the project details fully.
- For skills: group the skills into appropriate categories (e.g., "Programming Languages", "Frameworks & Libraries", "Databases", "Tools", "Soft Skills", etc.) as key-value pairs where the key is the category and the value is an array of skills.
- For certifications: include cert name, issuing organization, and year.
- For experience: include role, actual company name, duration, and brief description of work done. Always extract the real company name.

Return this exact JSON structure:
{
  "name": "<full name of the candidate>",
  "phone": ["<phone number>"],
  "email": ["<email address>"],
  "location": "<city, state or country>",
  "professional_summary": "<extracted summary or null>",
  "total_experience": "<total years of experience, e.g. 3 years>",
  "links": {
    "portfolio": "<portfolio URL or null>",
    "github": "<GitHub URL or null>",
    "linkedin": "<LinkedIn URL or null>",
    "other": []
  },
  "tenth_marks": "<10th marks/percentage/CGPA or null>",
  "twelfth_marks": "<12th marks/percentage/CGPA or null>",
  "degree": "<highest degree name like B.Tech, BCA, MCA, etc. or null>",
  "stream": "<stream/branch like CSE, IT, ECE, etc. or null>",
  "cgpa": "<college CGPA or percentage or null>",
  "education": [
    {
      "degree": "<degree/class, e.g., B.Tech, 12th, 10th>",
      "institution": "<college, university, or school name>",
      "stream": "<stream/branch/subjects, e.g. CSE, Science, or null>",
      "score": "<CGPA or percentage or grades or null>",
      "duration": "<years/duration or null>"
    }
  ],
  "projects": [
    {
      "title": "<project name>",
      "description": "<complete detailed description/features/achievements>",
      "tech_stack": ["<tech>"]
    }
  ],
  "skills": {
    "Programming Languages": ["<skill1>", "<skill2>"],
    "Frameworks & Libraries": ["<skill3>"],
    "Databases": ["<skill4>"],
    "Tools": ["<skill5>"],
    "Soft Skills": ["<skill6>"]
  },
  "certifications": [
    {
      "name": "<cert>",
      "issuer": "<org or null>",
      "year": "<year or null>"
    }
  ],
  "achievements": ["<achievement1>", "<achievement2>"],
  "languages": ["<lang1>", "<lang2>"],
  "experience": [
    {
      "role": "<job title>",
      "company": "<actual company name>",
      "duration": "<period, e.g. June 2021 - Present>",
      "description": "<brief description of work done>"
    }
  ]
}`;

function parseExtractedJSON(text) {
  try {
    if (!text) return {};
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }

    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Error parsing JSON from Groq response:', e.message);
    return {};
  }
};

/**
 * Extract structured resume data using Groq API
 */
async function extractResumeData(resumeText) {
  const startTime = Date.now();

  // Also run local extraction as fallback/merge source
  const fastExtracted = localExtractResumeData(resumeText);

  let response;
  let usedModel = MODEL_EXTRACTING;
  try {
    console.log(`☁️  Extracting via Groq Cloud (${usedModel})...`);

    response = await client.chat.completions.create({
      model: usedModel,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract compact resume JSON from this text:\n\n${resumeText.substring(0, 5000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2800,
      response_format: { type: 'json_object' },
    });
  } catch (error) {
    const isRateLimit = error.status === 429 || error.message?.includes('Rate limit') || error.message?.includes('429');
    if (isRateLimit && usedModel !== 'llama-3.1-8b-instant') {
      console.warn(`⚠️  Groq primary extraction failed due to rate limits. Retrying with fallback model (llama-3.1-8b-instant)...`);
      try {
        usedModel = 'llama-3.1-8b-instant';
        response = await client.chat.completions.create({
          model: usedModel,
          messages: [
            { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Extract compact resume JSON from this text:\n\n${resumeText.substring(0, 5000)}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2800,
          response_format: { type: 'json_object' },
        });
      } catch (fallbackError) {
        console.warn(`Groq fallback extraction failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }

  try {
    const rawResponse = response.choices?.[0]?.message?.content || '';
    const groqExtracted = parseExtractedJSON(rawResponse);
    const merged = mergeExtraction(groqExtracted, fastExtracted);

    return {
      ...merged,
      model_used: usedModel,
      provider_used: 'groq',
      processing_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    console.warn(`Groq extraction parsing failed, using local parser: ${error.message}`);
    return {
      ...fastExtracted,
      model_used: `${usedModel} (local fallback)`,
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
async function analyzeWithOllama(resumeText, extractedSkills = [], jobDescription = null) {
  try {
    console.log(`☁️  Analyzing resume with Groq Cloud (split: ${MODEL_IMPROVEMENT} / ${MODEL_RECOMMENDATION})...`);

    const jobDescText = jobDescription ? `\nJOB DESCRIPTION:\n"""\n${jobDescription}\n"""\n` : '';
    const analysisPrompt = `You are an expert HR recruiter and resume advisor. Analyze this resume${jobDescription ? ' against the provided Job Description ' : ' '}and provide scores, strengths, weaknesses, overall candidate summary, missing skills, keywords to add, and actionable improvement tips (suggestions).

If a job description is provided, calculate the ats_score strictly based on the match between the resume and the job description.

RESUME:
"""
${resumeText.substring(0, 8000)}
"""
${jobDescText}
DETECTED SKILLS: ${extractedSkills.join(', ')}

Return ONLY valid JSON matching this exact structure:
{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "experience_level": "<Entry Level|Junior|Mid-Level|Senior|Lead|Executive>",
  "strengths": ["<str1>","<str2>","<str3>","<str4>","<str5>"],
  "weaknesses": ["<w1>","<w2>","<w3>","<w4>"],
  "suggestions": [{"priority":"high|medium|low","category":"formatting|content|skills|experience","text":"<suggestion>"}],
  "summary": "<2-3 sentence summary>",
  "missing_skills": ["<skill>"],
  "keywords_to_add": ["<keyword>"]
}

CRITICAL RULES FOR SUGGESTIONS:
- Each suggestion in the "suggestions" array must be a short, concise, and direct improvement tip (maximum 10-12 words).
- Keep them action-oriented and bullet-point style (e.g., "Add metrics to quantify achievements in your project section" or "List modern frontend frameworks in skills section").
- Avoid long-winded paragraphs.`;

    const recommendationPrompt = `You are an expert career counselor and job recommendation engine. Analyze this resume and suggest job matches.

RESUME:
"""
${resumeText.substring(0, 8000)}
"""

DETECTED SKILLS: ${extractedSkills.join(', ')}

Return ONLY valid JSON matching this exact structure:
{
  "career_recommendations": [
    {
      "role": "<job title>",
      "match_score": <0-100>,
      "reason": "<brief 1-sentence explanation of why they fit this role>"
    }
  ]
}`;

    // Run analysis LLM call
    let activeModel = MODEL_IMPROVEMENT;
    if (activeModel === 'mixtral-8x7b-32768') {
      console.warn('⚠️  mixtral-8x7b-32768 is decommissioned on Groq Cloud. Mapping to llama-3.3-70b-versatile to ensure successful analysis.');
      activeModel = 'llama-3.3-70b-versatile';
    }

    let analysisResponse;
    let usedModel = activeModel;
    try {
      analysisResponse = await client.chat.completions.create({
        model: usedModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume analyzer. Return ONLY valid JSON, no explanation or markdown.',
          },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });
    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes('Rate limit') || error.message?.includes('429');
      if (isRateLimit && usedModel !== 'llama-3.1-8b-instant') {
        console.warn(`⚠️  Groq primary analysis failed due to rate limits. Retrying with fallback model (llama-3.1-8b-instant)...`);
        try {
          usedModel = 'llama-3.1-8b-instant';
          analysisResponse = await client.chat.completions.create({
            model: usedModel,
            messages: [
              {
                role: 'system',
                content: 'You are an expert resume analyzer. Return ONLY valid JSON, no explanation or markdown.',
              },
              { role: 'user', content: analysisPrompt },
            ],
            temperature: 0.2,
            max_tokens: 1200,
            response_format: { type: 'json_object' },
          });
        } catch (fallbackError) {
          console.warn(`Groq fallback analysis failed: ${fallbackError.message}`);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    const rawAnalysis = analysisResponse.choices?.[0]?.message?.content || '';
    const analysisObj = parseExtractedJSON(rawAnalysis);

    // Merge and sanitize
    const mergedResult = {
      overall_score: Math.min(100, Math.max(0, parseInt(analysisObj.overall_score) || 50)),
      ats_score: Math.min(100, Math.max(0, parseInt(analysisObj.ats_score) || 50)),
      experience_level: analysisObj.experience_level || 'Entry Level',
      strengths: Array.isArray(analysisObj.strengths) ? analysisObj.strengths : [],
      weaknesses: Array.isArray(analysisObj.weaknesses) ? analysisObj.weaknesses : [],
      suggestions: Array.isArray(analysisObj.suggestions) ? analysisObj.suggestions : [],
      suggested_roles: [],
      summary: analysisObj.summary || '',
      missing_skills: Array.isArray(analysisObj.missing_skills) ? analysisObj.missing_skills : [],
      keywords_to_add: Array.isArray(analysisObj.keywords_to_add) ? analysisObj.keywords_to_add : [],
    };

    return mergedResult;
  } catch (error) {
    console.error('Groq split analysis error:', error.message);
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
  for (const key of ['phone', 'email', 'education', 'projects', 'certifications', 'achievements', 'languages', 'experience', 'suggested_roles', 'career_recommendations']) {
    merged[key] = primary[key]?.length ? primary[key] : (secondary[key] || []);
  }
  if (primary.skills && typeof primary.skills === 'object' && Object.keys(primary.skills).length > 0) {
    merged.skills = primary.skills;
  } else if (secondary.skills && (Array.isArray(secondary.skills) ? secondary.skills.length > 0 : Object.keys(secondary.skills).length > 0)) {
    merged.skills = secondary.skills;
  } else {
    merged.skills = {};
  }
  merged.links = {
    portfolio: primary.links?.portfolio || secondary.links?.portfolio || null,
    github: primary.links?.github || secondary.links?.github || null,
    linkedin: primary.links?.linkedin || secondary.links?.linkedin || null,
    other: primary.links?.other?.length ? primary.links.other : (secondary.links?.other || []),
  };
  return sanitizeExtraction(merged);
}

function categorizeSkills(skills) {
  const categories = {
    "Programming Languages": [],
    "Frameworks & Libraries": [],
    "Databases": [],
    "Tools & Platforms": [],
    "Other Skills": []
  };

  const skillMapping = {
    'javascript': 'Programming Languages', 'typescript': 'Programming Languages', 'python': 'Programming Languages',
    'java': 'Programming Languages', 'c++': 'Programming Languages', 'c#': 'Programming Languages',
    'php': 'Programming Languages', 'ruby': 'Programming Languages', 'go': 'Programming Languages',
    'golang': 'Programming Languages', 'rust': 'Programming Languages', 'swift': 'Programming Languages',
    'kotlin': 'Programming Languages', 'c': 'Programming Languages', 'r': 'Programming Languages',
    'html': 'Programming Languages', 'css': 'Programming Languages', 'sql': 'Programming Languages',

    'react': 'Frameworks & Libraries', 'react.js': 'Frameworks & Libraries', 'reactjs': 'Frameworks & Libraries',
    'angular': 'Frameworks & Libraries', 'vue': 'Frameworks & Libraries', 'vue.js': 'Frameworks & Libraries',
    'vuejs': 'Frameworks & Libraries', 'next.js': 'Frameworks & Libraries', 'nextjs': 'Frameworks & Libraries',
    'express': 'Frameworks & Libraries', 'express.js': 'Frameworks & Libraries', 'node': 'Frameworks & Libraries',
    'node.js': 'Frameworks & Libraries', 'nodejs': 'Frameworks & Libraries', 'django': 'Frameworks & Libraries',
    'flask': 'Frameworks & Libraries', 'spring': 'Frameworks & Libraries', 'spring boot': 'Frameworks & Libraries',
    'laravel': 'Frameworks & Libraries', 'redux': 'Frameworks & Libraries', 'bootstrap': 'Frameworks & Libraries',
    'tailwind': 'Frameworks & Libraries', 'tailwindcss': 'Frameworks & Libraries', 'jquery': 'Frameworks & Libraries',
    'svelte': 'Frameworks & Libraries',

    'mongodb': 'Databases', 'mysql': 'Databases', 'postgresql': 'Databases', 'postgres': 'Databases',
    'sqlite': 'Databases', 'redis': 'Databases', 'oracle': 'Databases', 'nosql': 'Databases',
    'firebase': 'Databases', 'mariadb': 'Databases',

    'git': 'Tools & Platforms', 'github': 'Tools & Platforms', 'docker': 'Tools & Platforms',
    'kubernetes': 'Tools & Platforms', 'aws': 'Tools & Platforms', 'azure': 'Tools & Platforms',
    'gcp': 'Tools & Platforms', 'jenkins': 'Tools & Platforms', 'jira': 'Tools & Platforms',
    'figma': 'Tools & Platforms', 'postman': 'Tools & Platforms', 'linux': 'Tools & Platforms',
    'ansible': 'Tools & Platforms', 'terraform': 'Tools & Platforms', 'heroku': 'Tools & Platforms',
    'vercel': 'Tools & Platforms', 'netlify': 'Tools & Platforms'
  };

  if (!Array.isArray(skills)) return categories;

  skills.forEach(skill => {
    const sLower = skill.toLowerCase().trim();
    let matched = false;
    for (const [key, category] of Object.entries(skillMapping)) {
      if (sLower === key || sLower.includes(key)) {
        if (!categories[category].includes(skill)) {
          categories[category].push(skill);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!categories["Other Skills"].includes(skill)) {
        categories["Other Skills"].push(skill);
      }
    }
  });

  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }

  return categories;
}

function cleanSummaryField(value) {
  const cleaned = cleanScalar(value);
  if (!cleaned) return null;
  if (/no\s+professional\s+summary|no\s+summary|not\s+provided|not\s+available|not\s+present|no\s+explicit/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function sanitizeExtraction(data) {
  let categorizedSkills = {};
  if (Array.isArray(data.skills)) {
    categorizedSkills = categorizeSkills(data.skills);
  } else if (data.skills && typeof data.skills === 'object') {
    for (const [cat, list] of Object.entries(data.skills)) {
      if (Array.isArray(list)) {
        categorizedSkills[cat] = list.map(cleanScalar).filter(Boolean);
      } else if (typeof list === 'string') {
        categorizedSkills[cat] = [cleanScalar(list)].filter(Boolean);
      }
    }
  }

  // Clean links — keep real URLs, reject placeholder text
  const rawLinks = data.links || {};
  const cleanLink = (v) => {
    const s = cleanScalar(v);
    if (!s) return null;
    if (/^<.*>$/.test(s) || /\bor null\b/i.test(s)) return null;
    return s;
  };

  return {
    name: cleanScalar(data.name),
    phone: Array.isArray(data.phone) ? data.phone.map(cleanScalar).filter(Boolean) : (data.phone ? [cleanScalar(data.phone)].filter(Boolean) : []),
    email: Array.isArray(data.email) ? data.email.map(cleanScalar).filter(Boolean) : (data.email ? [cleanScalar(data.email)].filter(Boolean) : []),
    location: cleanScalar(data.location),
    professional_summary: cleanSummaryField(data.professional_summary),
    total_experience: cleanScalar(data.total_experience),
    links: {
      portfolio: cleanLink(rawLinks.portfolio),
      github: cleanLink(rawLinks.github),
      linkedin: cleanLink(rawLinks.linkedin),
      other: Array.isArray(rawLinks.other) ? rawLinks.other.map(cleanScalar).filter(Boolean) : []
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
    skills: categorizedSkills,
    certifications: Array.isArray(data.certifications)
      ? data.certifications.map((c) => ({ name: cleanScalar(c.name), issuer: cleanScalar(c.issuer), year: cleanScalar(c.year) })).filter((c) => c.name)
      : [],
    achievements: cleanArray(data.achievements),
    languages: cleanArray(data.languages),
    experience: Array.isArray(data.experience)
      ? data.experience.map((e) => ({ role: cleanScalar(e.role), company: cleanScalar(e.company), duration: cleanScalar(e.duration) || '', description: cleanScalar(e.description) || '' })).filter((e) => e.role || e.duration || e.description)
      : [],
    suggested_roles: cleanArray(data.suggested_roles),
    career_recommendations: Array.isArray(data.career_recommendations)
      ? data.career_recommendations.map((c) => ({
          role: cleanScalar(c.role),
          match_score: typeof c.match_score === 'number' ? c.match_score : (parseInt(c.match_score) || 75),
          reason: cleanScalar(c.reason) || ''
        })).filter(c => c.role)
      : []
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
    education: [], projects: [], skills: {}, certifications: [], achievements: [], languages: [], experience: [],
    suggested_roles: [], career_recommendations: []
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
    suggested_roles: [
      { role: 'Software Developer', match_score: 70, reason: 'Technical skills match' },
      { role: 'Full Stack Engineer', match_score: 65, reason: 'Frontend + backend skills' },
    ],
    summary: `${level} candidate with ${extractedSkills.length} skills. Needs more quantifiable achievements.`,
    missing_skills: ['TypeScript', 'Docker', 'CI/CD'],
    keywords_to_add: ['agile', 'cross-functional', 'optimization'],
  };
}

async function getSuggestedRolesFromLLM(resumeText, skills = []) {
  try {
    console.log(`☁️  Generating suggested roles via Groq Cloud (${MODEL_RECOMMENDATION})...`);

    const recommendationPrompt = `You are an expert career counselor and job recommendation engine. Analyze this resume and suggest 2-4 job matches they are best fit for.
    
RESUME:
"""
${resumeText.substring(0, 8000)}
"""

DETECTED SKILLS: ${Array.isArray(skills) ? skills.join(', ') : ''}

Return ONLY valid JSON matching this exact structure:
{
  "suggested_roles": [
    {
      "role": "<job title>",
      "match_score": <0-100>,
      "reason": "<brief 1-sentence explanation of why they fit this role>"
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: MODEL_RECOMMENDATION,
      messages: [
        {
          role: 'system',
          content: 'You are an expert career counselor. Return ONLY valid JSON, no explanation or markdown.',
        },
        { role: 'user', content: recommendationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const rawResponse = response.choices?.[0]?.message?.content || '';
    const recommendationObj = parseExtractedJSON(rawResponse);
    
    return Array.isArray(recommendationObj.suggested_roles) ? recommendationObj.suggested_roles : [];
  } catch (error) {
    console.error('Groq suggested roles error:', error.message);
    return [
      { role: 'Software Developer', match_score: 75, reason: 'Based on skills matching' },
      { role: 'Technical Specialist', match_score: 70, reason: 'Based on resume details' },
    ];
  }
}

module.exports = { checkOllamaHealth, extractResumeData, analyzeWithOllama, getSuggestedRolesFromLLM };
