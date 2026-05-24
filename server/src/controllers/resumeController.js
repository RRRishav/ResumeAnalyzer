const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { runAnalysis } = require('../services/analysisService');
const { exportAllResumesToCsv, filterBySkills, filterByJobRole } = require('../services/csvExportService');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// POST /api/resume/analyze
exports.analyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a resume file (PDF or DOCX)' });
    }

    // Check analysis limit for free users
    const user = await User.findById(req.user.id)
      .select('is_premium analysis_count max_free_analyses')
      .lean();
    if (!user) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_premium && user.analysis_count >= user.max_free_analyses) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: 'Free analysis limit reached',
        message: `You've used all ${user.max_free_analyses} free analyses. Upgrade to Premium for unlimited access.`,
        limit_reached: true,
      });
    }

    const socketId = req.headers['x-socket-id'] || null;
    const io = req.app.get('io');

    // Run the full analysis pipeline
    const result = await runAnalysis(
      req.file.path,
      req.file.originalname,
      req.user.id,
      io,
      socketId
    );

    // Save to database
    const dbResult = await Analysis.create({
      user_id: req.user.id,
      filename: result.filename,
      file_type: result.fileType,
      overall_score: result.overall_score,
      ats_score: result.ats_score,
      experience_level: result.experience_level,
      skills: result.skills || [],
      skill_categories: result.skillCategories || {},
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || [],
      gemini_insights: result.gemini_insights,
      career_recommendations: result.career_recommendations || [],
      job_title_match: result.job_title_match || '',
      raw_text: result.raw_text,
      word_count: result.wordCount || 0,
    });

    // Increment analysis count
    await User.updateOne({ _id: req.user.id }, { $inc: { analysis_count: 1 } });

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    res.status(201).json({
      message: 'Analysis complete',
      analysis: {
        id: dbResult._id.toString(),
        ...result,
        raw_text: undefined, // Don't send raw text to client
        created_at: dbResult.created_at,
      },
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
};

// GET /api/resume/history
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const total = await Analysis.countDocuments({ user_id: req.user.id });
    const analyses = await Analysis.find({ user_id: req.user.id })
      .select('_id filename file_type overall_score ats_score experience_level skills strengths weaknesses job_title_match created_at')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      analyses: analyses.map((item) => ({
        id: item._id.toString(),
        filename: item.filename,
        file_type: item.file_type,
        overall_score: item.overall_score,
        ats_score: item.ats_score,
        experience_level: item.experience_level,
        skills: item.skills,
        strengths: item.strengths,
        weaknesses: item.weaknesses,
        job_title_match: item.job_title_match,
        created_at: item.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// GET /api/resume/report/:id
exports.getReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = await Analysis.findOne({ _id: req.params.id, user_id: req.user.id })
      .select('_id filename file_type overall_score ats_score experience_level skills skill_categories strengths weaknesses suggestions gemini_insights career_recommendations word_count created_at')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      report: {
        id: report._id.toString(),
        filename: report.filename,
        file_type: report.file_type,
        overall_score: report.overall_score,
        ats_score: report.ats_score,
        experience_level: report.experience_level,
        skills: report.skills,
        skill_categories: report.skill_categories,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        suggestions: report.suggestions,
        gemini_insights: report.gemini_insights,
        career_recommendations: report.career_recommendations,
        word_count: report.word_count,
        created_at: report.created_at,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// GET /api/resume/stats
exports.getStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const aggregate = await Analysis.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          total_analyses: { $sum: 1 },
          avg_score: { $avg: '$overall_score' },
          best_score: { $max: '$overall_score' },
          avg_ats_score: { $avg: '$ats_score' },
        },
      },
    ]);

    const stats = aggregate[0] || {
      total_analyses: 0,
      avg_score: 0,
      best_score: 0,
      avg_ats_score: 0,
    };

    res.json({
      stats: {
        total_analyses: stats.total_analyses,
        avg_score: Number(stats.avg_score || 0),
        best_score: Number(stats.best_score || 0),
        avg_ats_score: Number(stats.avg_ats_score || 0),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/resume/export/csv
// Export all user's resumes to CSV
exports.exportToCsv = async (req, res) => {
  try {
    const analyses = await Analysis.find({ user_id: req.user.id })
      .lean();

    if (analyses.length === 0) {
      return res.status(400).json({ error: 'No resumes to export' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(uploadsDir, `resumes_${req.user.id}_${timestamp}.csv`);

    // Export to CSV
    await exportAllResumesToCsv(analyses, csvPath);

    // Read the file and send it
    const fileContent = fs.readFileSync(csvPath);
    
    // Clean up the file after sending
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="resumes_export_${timestamp}.csv"`);
    res.send(fileContent);

    // Delete file after response (non-blocking)
    setImmediate(() => {
      try { fs.unlinkSync(csvPath); } catch (e) { /* ignore */ }
    });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

// GET /api/resume/search/skill
// Filter resumes by required skills
exports.searchBySkill = async (req, res) => {
  try {
    const { skills } = req.query;
    
    if (!skills) {
      return res.status(400).json({ error: 'Please provide skills parameter (comma-separated)' });
    }

    // Parse comma-separated skills
    const requiredSkills = skills.split(',').map(s => s.trim()).filter(s => s);

    // Get all user's resumes
    const analyses = await Analysis.find({ user_id: req.user.id })
      .lean();

    // Filter by skills
    const filtered = filterBySkills(analyses, requiredSkills);

    res.json({
      total_matches: filtered.length,
      search_criteria: {
        skills: requiredSkills,
        total_resumes: analyses.length,
      },
      results: filtered.map(item => ({
        id: item._id.toString(),
        filename: item.filename,
        overall_score: item.overall_score,
        ats_score: item.ats_score,
        experience_level: item.experience_level,
        skills: item.skills,
        job_title_match: item.job_title_match,
        created_at: item.created_at,
      })),
    });
  } catch (error) {
    console.error('Skill search error:', error);
    res.status(500).json({ error: 'Failed to search by skills' });
  }
};

// GET /api/resume/search/role
// Filter resumes by job role
exports.searchByRole = async (req, res) => {
  try {
    const { role } = req.query;

    if (!role) {
      return res.status(400).json({ error: 'Please provide role parameter (e.g., "Java Developer")' });
    }

    // Get all user's resumes
    const analyses = await Analysis.find({ user_id: req.user.id })
      .lean();

    // Filter by job role
    const filtered = filterByJobRole(analyses, role);

    res.json({
      total_matches: filtered.length,
      search_criteria: {
        role: role,
        total_resumes: analyses.length,
      },
      results: filtered.map(item => ({
        id: item._id.toString(),
        filename: item.filename,
        overall_score: item.overall_score,
        ats_score: item.ats_score,
        experience_level: item.experience_level,
        skills: item.skills,
        job_title_match: item.job_title_match,
        matched_role: item.matched_role,
        matched_skills: item.matched_skills || [],
        match_score: item.match_score || 0,
        created_at: item.created_at,
      })),
    });
  } catch (error) {
    console.error('Role search error:', error);
    res.status(500).json({ error: 'Failed to search by role' });
  }
};

// GET /api/resume/export/csv/filtered
// Export filtered resumes to CSV
exports.exportFilteredToCsv = async (req, res) => {
  try {
    const { skills, role } = req.query;

    if (!skills && !role) {
      return res.status(400).json({ error: 'Please provide skills or role parameter' });
    }

    // Get all user's resumes
    let analyses = await Analysis.find({ user_id: req.user.id })
      .lean();

    // Apply filters
    if (skills) {
      const requiredSkills = skills.split(',').map(s => s.trim()).filter(s => s);
      analyses = filterBySkills(analyses, requiredSkills);
    }

    if (role) {
      analyses = filterByJobRole(analyses, role);
    }

    if (analyses.length === 0) {
      return res.status(400).json({ error: 'No resumes match the specified criteria' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filterType = role ? `${role.replace(/\s+/g, '_')}` : skills.replace(/,/g, '_');
    const csvPath = path.join(uploadsDir, `resumes_${filterType}_${timestamp}.csv`);

    // Export to CSV
    await exportAllResumesToCsv(analyses, csvPath);

    // Read the file and send it
    const fileContent = fs.readFileSync(csvPath);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="resumes_${filterType}_${timestamp}.csv"`);
    res.send(fileContent);

    // Delete file after response (non-blocking)
    setImmediate(() => {
      try { fs.unlinkSync(csvPath); } catch (e) { /* ignore */ }
    });
  } catch (error) {
    console.error('Filtered CSV export error:', error);
    res.status(500).json({ error: 'Failed to export filtered CSV' });
  }
};
