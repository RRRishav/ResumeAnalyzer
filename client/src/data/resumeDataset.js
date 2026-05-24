const DATASET_URL = '/data/resume-dataset-large.csv';
let datasetCache = null;

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsv = (csv) => {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
};

const toSkillObjects = (skills) =>
  skills
    .split(';')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

export const loadResumeDataset = async () => {
  if (datasetCache) return datasetCache;

  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error('Failed to load built-in resume dataset');
  }

  const csv = await response.text();
  datasetCache = parseCsv(csv).map((row) => ({
    id: row.ID,
    dataset_id: row.ID,
    name: row.Name,
    filename: row.Filename,
    role: row.Role,
    file_type: 'pdf',
    overall_score: Number(row['Overall Score']) || 0,
    ats_score: Number(row['ATS Score']) || 0,
    experience_level: row['Experience Level'],
    skills: toSkillObjects(row.Skills || ''),
    education: row.Education,
    experience_years: row['Experience Years'],
    location: row.Location,
    gemini_insights: row.Summary,
    job_title_match: row.Role,
    created_at: new Date().toISOString(),
    source: 'dataset',
  }));

  return datasetCache;
};

const getSkillName = (skill) => (
  typeof skill === 'string'
    ? skill
    : skill?.name || skill?.skill || skill?.title || skill?.value || ''
);

export const filterDatasetByPrompt = (resumes, prompt) => {
  const searchIndex = createResumeSearchIndex(resumes);
  return searchResumes(searchIndex, { prompt });
};

export const createResumeSearchIndex = (resumes) => {
  const skillIndex = buildSkillIndex(resumes);
  const roles = buildRoleIndex(resumes);
  const normalizedRows = resumes.map((resume) => {
    const skills = (resume.skills || []).map((skill) => normalizeSearchText(getSkillName(skill))).filter(Boolean);
    const fields = [
      resume.name,
      resume.filename,
      resume.role,
      resume.job_title_match,
      resume.experience_level,
      resume.location,
      resume.education,
      resume.gemini_insights,
    ].map(normalizeSearchText);

    return {
      resume,
      skills,
      role: normalizeSearchText(resume.role || resume.job_title_match),
      location: normalizeSearchText(resume.location),
      experienceLevel: normalizeSearchText(resume.experience_level),
      searchText: `${fields.join(' ')} ${skills.join(' ')}`,
      overallScore: Number(resume.overall_score) || 0,
      atsScore: Number(resume.ats_score) || 0,
      experienceYears: Number(resume.experience_years) || 0,
    };
  });

  return { resumes, normalizedRows, skillIndex, roles };
};

export const searchResumes = (searchIndex, options = {}) => {
  const {
    prompt = '',
    filename = '',
    requiredSkills = [],
    location = '',
    experienceLevel = '',
    minScore = 0,
    minAts = 0,
    sortBy = 'relevance',
  } = options;

  const searchPlan = buildPromptSearchPlan(searchIndex, prompt);
  const { normalizedPrompt, queryTokens, expandedSkills } = searchPlan;
  const expandedSkillNames = new Set(expandedSkills.map((skill) => normalizeSearchText(skill)));
  const requiredSkillTokens = requiredSkills.map(normalizeSearchText).filter(Boolean);
  const normalizedFilename = normalizeSearchText(filename);
  const normalizedLocation = normalizeSearchText(location);
  const normalizedExperience = normalizeSearchText(experienceLevel);

  return searchIndex.normalizedRows
    .map((row) => {
      const { resume, skills, role, searchText } = row;
      const skillPhraseScore = skills.reduce((score, skill) => (
        skill && hasPhrase(normalizedPrompt, skill) ? score + 5 : score
      ), 0);
      const inferredSkillScore = skills.reduce((score, skill) => (
        expandedSkillNames.has(skill) ? score + 4 : score
      ), 0);
      const rolePhraseScore = role && hasPhrase(normalizedPrompt, role) ? 4 : 0;
      const tokenScore = queryTokens.reduce((score, token) => (
        hasWord(searchText, token) ? score + 1 : score
      ), 0);
      const requiredSkillHits = requiredSkillTokens.filter((token) => (
        skills.some((skill) => skill === token || skill.includes(token) || token.includes(skill))
      ));
      const filenameHit = !normalizedFilename || normalizeSearchText(resume.filename).includes(normalizedFilename);
      const locationHit = !normalizedLocation || row.location.includes(normalizedLocation);
      const experienceHit = !normalizedExperience || row.experienceLevel.includes(normalizedExperience);
      const scoreHit = row.overallScore >= Number(minScore || 0) && row.atsScore >= Number(minAts || 0);
      const hasPrompt = normalizedPrompt || queryTokens.length > 0 || expandedSkillNames.size > 0;
      const requiredSkillsHit = requiredSkillTokens.length === 0 || requiredSkillHits.length === requiredSkillTokens.length;
      const score = skillPhraseScore + inferredSkillScore + rolePhraseScore + tokenScore + (requiredSkillHits.length * 4);

      return {
        ...resume,
        matched_skills: skills.filter((skill) => (
          expandedSkillNames.has(skill)
          || requiredSkillTokens.some((token) => skill === token || skill.includes(token) || token.includes(skill))
          || queryTokens.some((token) => hasWord(skill, token))
        )),
        expanded_search_skills: expandedSkills,
        match_score: score,
        _candidateSearchMatch: (!hasPrompt || score > 0) && filenameHit && locationHit && experienceHit && scoreHit && requiredSkillsHit,
      };
    })
    .filter((resume) => resume._candidateSearchMatch)
    .sort((a, b) => {
      if (sortBy === 'score') return b.overall_score - a.overall_score || b.match_score - a.match_score;
      if (sortBy === 'ats') return b.ats_score - a.ats_score || b.match_score - a.match_score;
      if (sortBy === 'experience') return (Number(b.experience_years) || 0) - (Number(a.experience_years) || 0);
      return b.match_score - a.match_score || b.overall_score - a.overall_score || b.ats_score - a.ats_score;
    });
};

export const buildPromptSearchPlan = (resumesOrIndex, prompt) => {
  const searchIndex = Array.isArray(resumesOrIndex) ? createResumeSearchIndex(resumesOrIndex) : resumesOrIndex;
  const normalizedPrompt = normalizeSearchText(prompt);
  const queryTokens = getSearchTokens(normalizedPrompt);
  const skillIndex = searchIndex.skillIndex;
  const roleMatches = getRoleMatches(searchIndex, normalizedPrompt, queryTokens);
  const directSkillMatches = getMatchingSkillNames(skillIndex, normalizedPrompt, queryTokens);
  const expandedSkillNames = new Set(directSkillMatches.map((skill) => normalizeSearchText(skill)));

  roleMatches.forEach((role) => {
    (role.skills || []).forEach((skill) => expandedSkillNames.add(normalizeSearchText(skill)));
  });

  directSkillMatches.forEach((skill) => {
    const related = skillIndex.get(normalizeSearchText(skill))?.related || new Map();
    [...related.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .forEach(([relatedSkill]) => expandedSkillNames.add(relatedSkill));
  });

  return {
    normalizedPrompt,
    queryTokens: [...new Set([...queryTokens, ...[...expandedSkillNames].flatMap((skill) => skill.split(/\s+/)).filter(Boolean)])],
    expandedSkills: [...expandedSkillNames]
      .map((skill) => skillIndex.get(skill)?.display || toTitleCase(skill))
      .slice(0, 14),
    roleMatches: roleMatches.map((role) => role.role),
  };
};

export const getSkillSuggestions = (resumes, prompt, limit = 8) => {
  const searchIndex = Array.isArray(resumes) ? createResumeSearchIndex(resumes) : resumes;
  const normalizedPrompt = normalizeSearchText(prompt);
  const queryTokens = getSearchTokens(normalizedPrompt);
  const skillIndex = searchIndex.skillIndex;
  const searchPlan = buildPromptSearchPlan(searchIndex, prompt);
  const expandedSet = new Set(searchPlan.expandedSkills.map(normalizeSearchText));

  return [...skillIndex.entries()]
    .map(([normalizedName, entry]) => {
      const exactPhrase = normalizedPrompt && hasPhrase(normalizedPrompt, normalizedName);
      const tokenHit = queryTokens.some((token) => hasWord(normalizedName, token) || normalizedName.includes(token));
      const inferredHit = expandedSet.has(normalizedName);
      const matched = exactPhrase || tokenHit || inferredHit;
      const score = matched ? (exactPhrase ? 50 : 0) + (tokenHit ? 20 : 0) + (inferredHit ? 12 : 0) + entry.count : 0;

      return { name: entry.display, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((item) => item.name);
};

export const getSearchExamples = (resumesOrIndex, limit = 5) => {
  const searchIndex = Array.isArray(resumesOrIndex) ? createResumeSearchIndex(resumesOrIndex) : resumesOrIndex;
  const roleExamples = [...searchIndex.roles.values()]
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
    .slice(0, limit)
    .map((role) => {
      const topSkill = [...role.skillCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return topSkill ? `${role.display} ${toTitleCase(topSkill)}` : role.display;
    });

  if (roleExamples.length >= limit) return roleExamples.slice(0, limit);

  return [
    ...roleExamples,
    ...getTopDatasetSkills(searchIndex.resumes, limit - roleExamples.length),
  ].slice(0, limit);
};

export const getFilterOptions = (resumes) => {
  const locations = new Set();
  const experienceLevels = new Set();

  resumes.forEach((resume) => {
    if (resume.location) locations.add(resume.location);
    if (resume.experience_level) experienceLevels.add(resume.experience_level);
  });

  return {
    locations: [...locations].sort((a, b) => a.localeCompare(b)).slice(0, 40),
    experienceLevels: [...experienceLevels].sort((a, b) => a.localeCompare(b)),
  };
};

export const getTopDatasetSkills = (resumes, limit = 12) => {
  const counts = new Map();

  resumes.forEach((resume) => {
    (resume.skills || []).forEach((skill) => {
      const name = String(getSkillName(skill)).trim();
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
};

const buildSkillIndex = (resumes) => {
  const index = new Map();

  resumes.forEach((resume) => {
    const skills = (resume.skills || [])
      .map((skill) => String(getSkillName(skill)).trim())
      .filter(Boolean);

    skills.forEach((skill) => {
      const normalized = normalizeSearchText(skill);
      if (!normalized) return;

      if (!index.has(normalized)) {
        index.set(normalized, { display: skill, count: 0, related: new Map() });
      }

      const entry = index.get(normalized);
      entry.count += 1;

      skills.forEach((relatedSkill) => {
        const related = normalizeSearchText(relatedSkill);
        if (!related || related === normalized) return;
        entry.related.set(related, (entry.related.get(related) || 0) + 1);
      });
    });
  });

  return index;
};

const buildRoleIndex = (resumes) => {
  const roles = new Map();

  resumes.forEach((resume) => {
    const role = String(resume.role || resume.job_title_match || '').trim();
    const normalizedRole = normalizeSearchText(role);
    if (!role || !normalizedRole) return;

    if (!roles.has(normalizedRole)) {
      roles.set(normalizedRole, { display: role, count: 0, skillCounts: new Map() });
    }

    const roleEntry = roles.get(normalizedRole);
    roleEntry.count += 1;
    (resume.skills || []).forEach((skill) => {
      const name = normalizeSearchText(getSkillName(skill));
      if (!name) return;
      roleEntry.skillCounts.set(name, (roleEntry.skillCounts.get(name) || 0) + 1);
    });
  });

  return roles;
};

const getRoleMatches = (searchIndex, normalizedPrompt, queryTokens) => (
  [...searchIndex.roles.entries()]
    .map(([normalizedRole, role]) => {
    const roleTokens = getSearchTokens(normalizedRole);
    const phraseHit = normalizedPrompt && (hasPhrase(normalizedPrompt, normalizedRole) || normalizedRole.includes(normalizedPrompt));
    const tokenHits = roleTokens.filter((token) => queryTokens.includes(token)).length;

    return {
      role: role.display,
      score: (phraseHit ? 4 : 0) + tokenHits + role.count,
      skills: [...role.skillCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([skill]) => skill),
      _matched: phraseHit || tokenHits > 0,
    };
  })
    .filter((role) => role._matched)
    .sort((a, b) => b.score - a.score || a.role.localeCompare(b.role))
    .slice(0, 3)
);

const getMatchingSkillNames = (skillIndex, normalizedPrompt, queryTokens) => (
  [...skillIndex.entries()]
    .filter(([normalizedSkill]) => (
      hasPhrase(normalizedPrompt, normalizedSkill)
      || queryTokens.some((token) => hasWord(normalizedSkill, token))
    ))
    .sort((a, b) => b[1].count - a[1].count || a[1].display.localeCompare(b[1].display))
    .map(([, entry]) => entry.display)
);

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/[^\w.\/ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getSearchTokens = (value) => {
  const stopWords = new Set([
    'i',
    'we',
    'want',
    'need',
    'resume',
    'resumes',
    'candidate',
    'candidates',
    'with',
    'and',
    'or',
    'only',
    'give',
    'me',
    'show',
    'find',
    'filter',
    'capable',
    'of',
    'for',
    'developer',
    'engineer',
    'skill',
    'skills',
    'profile',
    'profiles',
  ]);

  return value
    .split(/[\s,;/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !stopWords.has(token));
};

const hasWord = (text, token) => new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`).test(text);

const hasPhrase = (text, phrase) => new RegExp(`(^|\\s)${escapeRegExp(phrase)}($|\\s)`).test(text);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toTitleCase = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());
