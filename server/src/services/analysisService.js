const { parseResume } = require('./parserService');
const { extractSkills } = require('./tfidfService');
const { analyzeWithGemini } = require('./geminiService');

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
    const geminiResult = await analyzeWithGemini(text, topSkills);
    emit('analyzing', 80, 'Generating insights and recommendations...');

    // Stage 4: Combine results
    emit('finalizing', 90, 'Compiling your report...');

    const result = {
      filename,
      fileType,
      wordCount,
      overall_score: geminiResult.overall_score,
      ats_score: geminiResult.ats_score,
      experience_level: geminiResult.experience_level,
      skills,
      skillCategories,
      strengths: geminiResult.strengths || [],
      weaknesses: geminiResult.weaknesses || [],
      suggestions: geminiResult.suggestions || [],
      career_recommendations: geminiResult.career_recommendations || [],
      gemini_insights: geminiResult.summary || '',
      missing_skills: geminiResult.missing_skills || [],
      keywords_to_add: geminiResult.keywords_to_add || [],
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
