const { parseResume } = require('./parserService');
const { extractSkills } = require('./tfidfService');
const { analyzeWithOllama } = require('./groqService');

/**
 * Full analysis pipeline with Socket.io progress events
 */
async function runAnalysis(filePath, filename, userId, io, socketId) {
  const emit = (stage, progress, message) => {
    if (io && socketId) {
      io.to(socketId).emit('analysis_progress', { stage, progress, message });
    }
  };

  try {
    // Stage 1: Parse document
    emit('parsing', 10, 'Reading your resume...');
    const { text, wordCount, fileType } = await parseResume(filePath);
    emit('parsing', 25, `Extracted ${wordCount} words from ${fileType.toUpperCase()}`);

    // Stage 2: TF-IDF Skill extraction
    emit('extracting', 35, 'Analyzing skills and keywords...');
    const { skills, skillCategories, totalSkillsFound, topSkills } = extractSkills(text);
    emit('extracting', 50, `Found ${totalSkillsFound} skills across ${Object.keys(skillCategories).length} categories`);

    // Stage 3: AI Analysis
    emit('analyzing', 60, 'Running AI-powered deep analysis...');
    const analysisResult = await analyzeWithOllama(text, topSkills);
    emit('analyzing', 80, 'Generating insights and recommendations...');

    // Stage 4: Combine results
    emit('finalizing', 90, 'Compiling your report...');

    const result = {
      filename,
      fileType,
      wordCount,
      overall_score: analysisResult.overall_score,
      ats_score: analysisResult.ats_score,
      experience_level: analysisResult.experience_level,
      skills,
      skillCategories,
      strengths: analysisResult.strengths || [],
      weaknesses: analysisResult.weaknesses || [],
      suggestions: analysisResult.suggestions || [],
      career_recommendations: analysisResult.career_recommendations || [],
      job_title_match: analysisResult.job_title_match || analysisResult.career_recommendations?.[0]?.role || '',
      gemini_insights: analysisResult.summary || '',
      missing_skills: analysisResult.missing_skills || [],
      keywords_to_add: analysisResult.keywords_to_add || [],
      raw_text: text,
    };

    emit('complete', 100, 'Analysis complete!');
    return result;
  } catch (error) {
    emit('error', 0, error.message);
    throw error;
  }
}

module.exports = { runAnalysis };
