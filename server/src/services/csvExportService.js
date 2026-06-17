const fs = require('fs')

/**
 * Normalize and clean data for CSV export to maintain uniformity
 */
const normalizeData = (analysis) => {
  // Extract skills as comma-separated string
  const skillsStr = Array.isArray(analysis.skills)
    ? analysis.skills
        .map((s) => (typeof s === 'string' ? s : s.name || s))
        .join('; ')
    : ''

  // Extract skill categories
  const skillCategoriesStr = analysis.skill_categories
    ? Object.entries(analysis.skill_categories)
        .map(
          ([category, skills]) =>
            `${category}: ${Array.isArray(skills) ? skills.join(', ') : skills}`,
        )
        .join(' | ')
    : ''

  // Normalize arrays to strings
  const strengthsStr = Array.isArray(analysis.strengths)
    ? analysis.strengths.join('; ')
    : analysis.strengths || ''

  const weaknessesStr = Array.isArray(analysis.weaknesses)
    ? analysis.weaknesses.join('; ')
    : analysis.weaknesses || ''

  const suggestionsStr = Array.isArray(analysis.suggestions)
    ? analysis.suggestions
        .map((s) =>
          typeof s === 'string'
            ? s
            : s.suggestion || s.title || JSON.stringify(s),
        )
        .join('; ')
    : analysis.suggestions || ''

  return {
    id: analysis._id?.toString() || '',
    filename: analysis.filename || '',
    file_type: analysis.file_type || '',
    overall_score: analysis.overall_score || 0,
    ats_score: analysis.ats_score || 0,
    experience_level: analysis.experience_level || '',
    skills: skillsStr,
    skill_categories: skillCategoriesStr,
    strengths: strengthsStr,
    weaknesses: weaknessesStr,
    suggestions: suggestionsStr,
    job_title_match: analysis.job_title_match || '',
    word_count: analysis.word_count || 0,
    created_at: analysis.created_at
      ? new Date(analysis.created_at).toISOString()
      : '',
  }
}

const skillName = (skill) => (
  typeof skill === 'string'
    ? skill
    : skill?.name || skill?.skill || skill?.title || skill?.value || ''
)

const normalizeText = (value) => String(value || '').toLowerCase().trim()

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasWord = (text, token) => new RegExp(`(^|\\s)${escapeRegExp(token)}($|\\s)`).test(text)

const normalizeSkillList = (resumeSkills) => (
  Array.isArray(resumeSkills)
    ? resumeSkills.map(skillName).map(normalizeText).filter(Boolean)
    : []
)

/**
 * Export all resumes to CSV file
 */
const exportAllResumesToCsv = async (analyses, outputPath) => {
  const normalizedData = analyses.map(normalizeData)
  const headers = [
    { id: 'id', title: 'ID' },
    { id: 'filename', title: 'Filename' },
    { id: 'file_type', title: 'File Type' },
    { id: 'overall_score', title: 'Overall Score' },
    { id: 'ats_score', title: 'ATS Score' },
    { id: 'experience_level', title: 'Experience Level' },
    { id: 'skills', title: 'Skills' },
    { id: 'skill_categories', title: 'Skill Categories' },
    { id: 'strengths', title: 'Strengths' },
    { id: 'weaknesses', title: 'Weaknesses' },
    { id: 'suggestions', title: 'Suggestions' },
    { id: 'job_title_match', title: 'Job Title Match' },
    { id: 'word_count', title: 'Word Count' },
    { id: 'created_at', title: 'Created At' },
  ]

  const lines = [
    headers.map((header) => escapeCsvValue(header.title)).join(','),
    ...normalizedData.map((row) =>
      headers.map((header) => escapeCsvValue(row[header.id])).join(','),
    ),
  ]

  await fs.promises.writeFile(outputPath, lines.join('\n'), 'utf8')
  return outputPath
}

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Check if a resume matches required skills
 */
const matchesSkills = (resumeSkills, requiredSkills) => {
  if (!resumeSkills || requiredSkills.length === 0) return true

  const normalizedResumeSkills = normalizeSkillList(resumeSkills)
  const normalizedRequiredSkills = requiredSkills.map(normalizeText).filter(Boolean)
  if (normalizedRequiredSkills.length === 0) return true

  return normalizedRequiredSkills.some((reqLower) => {
    return normalizedResumeSkills.some(
      (skill) => skill.includes(reqLower) || reqLower.includes(skill),
    )
  })
}

/**
 * Filter resumes by required skills
 */
const filterBySkills = (analyses, requiredSkills) => {
  if (!requiredSkills || requiredSkills.length === 0) {
    return analyses
  }

  return analyses.filter((analysis) =>
    matchesSkills(analysis.skills, requiredSkills),
  )
}

/**
 * Filter resumes by job role (matches against job_title_match and skills)
 */
const filterByJobRole = (analyses, jobRole) => {
  if (!jobRole) return analyses

  const roleLower = normalizePrompt(jobRole)
  const searchPlan = buildPromptSearchPlan(analyses, roleLower)
  const queryTokens = searchPlan.queryTokens
  const expandedSkillSet = new Set(searchPlan.expandedSkills.map(normalizePrompt))
  if (queryTokens.length === 0 && expandedSkillSet.size === 0) return []

  return analyses
    .map((analysis) => {
      const jobTitleMatch = normalizeText(analysis.job_title_match)
      const resumeSkills = normalizeSkillList(analysis.skills)
      const rawText = normalizeText(analysis.raw_text)
      const skillText = resumeSkills.join(' ')
      const haystack = [jobTitleMatch, skillText, rawText].join(' ')
      const phraseMatch = roleLower.length > 2 && haystack.includes(roleLower)
      const matchedSkills = resumeSkills.filter((skill) =>
        expandedSkillSet.has(skill) || queryTokens.some((token) => skill === token || hasWord(skill, token)),
      )
      const tokenMatches = queryTokens.filter((token) => hasWord(haystack, token))
      const score = (phraseMatch ? 4 : 0) + (matchedSkills.length * 3) + tokenMatches.length

      return {
        ...analysis,
        matched_role: roleLower,
        matched_skills: matchedSkills,
        match_score: score,
        _roleMatch: score > 0,
      }
    })
    .filter((analysis) => analysis._roleMatch)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
}

const buildPromptSearchPlan = (analyses, prompt) => {
  const normalizedPrompt = normalizePrompt(prompt)
  const baseTokens = extractSearchTokens(normalizedPrompt)
  const skillIndex = buildSkillIndex(analyses)
  const directSkills = getMatchingSkillNames(skillIndex, normalizedPrompt, baseTokens)
  const expandedSkills = new Set(directSkills.map(normalizePrompt))

  getRoleMatches(analyses, normalizedPrompt, baseTokens).forEach((role) => {
    role.skills.forEach((skill) => expandedSkills.add(normalizePrompt(skill)))
  })

  directSkills.forEach((skill) => {
    const related = skillIndex.get(normalizePrompt(skill))?.related || new Map()
    ;[...related.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .forEach(([relatedSkill]) => expandedSkills.add(relatedSkill))
  })

  return {
    queryTokens: [
      ...new Set([
        ...baseTokens,
        ...[...expandedSkills].flatMap((skill) => skill.split(/\s+/)).filter(Boolean),
      ]),
    ],
    expandedSkills: [...expandedSkills],
  }
}

const buildSkillIndex = (analyses) => {
  const index = new Map()

  analyses.forEach((analysis) => {
    const skills = normalizeSkillList(analysis.skills)

    skills.forEach((skill) => {
      if (!index.has(skill)) {
        index.set(skill, { count: 0, related: new Map() })
      }

      const entry = index.get(skill)
      entry.count += 1

      skills.forEach((relatedSkill) => {
        if (!relatedSkill || relatedSkill === skill) return
        entry.related.set(relatedSkill, (entry.related.get(relatedSkill) || 0) + 1)
      })
    })
  })

  return index
}

const getRoleMatches = (analyses, normalizedPrompt, queryTokens) => {
  const roles = new Map()

  analyses.forEach((analysis) => {
    const role = normalizePrompt(analysis.job_title_match)
    if (!role) return

    const roleTokens = extractSearchTokens(role)
    const phraseHit = normalizedPrompt && (role.includes(normalizedPrompt) || normalizedPrompt.includes(role))
    const tokenHits = roleTokens.filter((token) => queryTokens.includes(token)).length
    if (!phraseHit && tokenHits === 0) return

    if (!roles.has(role)) {
      roles.set(role, { score: 0, skillCounts: new Map() })
    }

    const roleEntry = roles.get(role)
    roleEntry.score += (phraseHit ? 4 : 0) + tokenHits
    normalizeSkillList(analysis.skills).forEach((skill) => {
      roleEntry.skillCounts.set(skill, (roleEntry.skillCounts.get(skill) || 0) + 1)
    })
  })

  return [...roles.values()]
    .map((role) => ({
      score: role.score,
      skills: [...role.skillCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([skill]) => skill),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

const getMatchingSkillNames = (skillIndex, normalizedPrompt, queryTokens) => (
  [...skillIndex.entries()]
    .filter(([skill]) => (
      normalizedPrompt.includes(skill)
      || queryTokens.some((token) => skill === token || hasWord(skill, token))
    ))
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([skill]) => skill)
)

const normalizePrompt = (prompt) => (
  normalizeText(prompt)
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/[^\w+#. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

const extractSearchTokens = (prompt) => {
  const stopWords = new Set([
    'i',
    'we',
    'want',
    'need',
    'looking',
    'hire',
    'hiring',
    'candidate',
    'candidates',
    'resume',
    'resumes',
    'capable',
    'of',
    'a',
    'an',
    'the',
    'only',
    'give',
    'me',
    'show',
    'find',
    'filter',
    'for',
    'with',
    'skill',
    'skills',
    'developer',
    'engineer',
  ])

  return prompt
    .split(/[\s,;/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !stopWords.has(token))
}

module.exports = {
  normalizeData,
  exportAllResumesToCsv,
  matchesSkills,
  filterBySkills,
  filterByJobRole,
  extractSearchTokens,
}
