const Extraction = require('../models/Extraction');
const { parseResume } = require('../services/parserService');
const { extractResumeData, checkOllamaHealth } = require('../services/ollamaService');
const fs = require('fs');
const mongoose = require('mongoose');

// POST /api/extract/upload
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a resume file (PDF or DOCX)' });
    }

    const socketId = req.headers['x-socket-id'] || null;
    const io = req.app.get('io');

    const emit = (stage, progress, message) => {
      if (io && socketId) {
        io.to(socketId).emit('extract_progress', { stage, progress, message });
      }
    };

    try {
      // Stage 1: Parse the document
      emit('parsing', 10, 'Reading your resume...');
      const { text, wordCount, fileType } = await parseResume(req.file.path);
      emit('parsing', 25, `Extracted ${wordCount} words from ${fileType.toUpperCase()}`);

      // Stage 2: Send to LLM for extraction (Ollama locally, Groq in production)
      const providerLabel = process.env.NODE_ENV === 'production' ? 'Groq Cloud' : 'AI';
      emit('extracting', 35, `Sending to ${providerLabel} for extraction...`);
      const extracted = await extractResumeData(text);
      const completedProvider = extracted.provider_used === 'local-fast'
        ? 'Local parser'
        : (extracted.provider_used === 'groq' ? 'Groq Cloud' : 'Ollama');
      emit('extracting', 70, `${completedProvider} extraction complete, processing results...`);

      // Stage 3: Process and save
      emit('processing', 80, 'Saving extraction results...');

      const dbResult = await Extraction.create({
        user_id: req.user.id,
        filename: req.file.originalname,
        file_type: fileType,
        extracted_data: {
          name: extracted.name,
          phone: extracted.phone,
          email: extracted.email,
          location: extracted.location,
          professional_summary: extracted.professional_summary,
          total_experience: extracted.total_experience,
          links: extracted.links,
          tenth_marks: extracted.tenth_marks,
          twelfth_marks: extracted.twelfth_marks,
          degree: extracted.degree,
          stream: extracted.stream,
          cgpa: extracted.cgpa,
          education: extracted.education,
          projects: extracted.projects,
          skills: extracted.skills,
          certifications: extracted.certifications,
          achievements: extracted.achievements,
          languages: extracted.languages,
          experience: extracted.experience,
        },
        model_used: extracted.model_used,
        provider_used: extracted.provider_used || 'unknown',
        processing_time_ms: extracted.processing_time_ms,
        raw_text: text,
        word_count: wordCount,
      });

      emit('complete', 100, 'Extraction complete!');

      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

      res.status(201).json({
        message: 'Extraction complete',
        extraction: {
          id: dbResult._id.toString(),
          filename: dbResult.filename,
          file_type: dbResult.file_type,
          extracted_data: dbResult.extracted_data,
          model_used: dbResult.model_used,
          provider_used: dbResult.provider_used || 'unknown',
          processing_time_ms: dbResult.processing_time_ms,
          word_count: dbResult.word_count,
          created_at: dbResult.created_at,
        },
      });
    } catch (extractError) {
      emit('error', 0, extractError.message);
      throw extractError;
    }
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    console.error('Extraction error:', error);
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
};

// GET /api/extract/history
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const total = await Extraction.countDocuments({ user_id: req.user.id });
    const extractions = await Extraction.find({ user_id: req.user.id })
      .select('_id filename file_type extracted_data.name extracted_data.email extracted_data.skills model_used processing_time_ms created_at')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      extractions: extractions.map((item) => ({
        id: item._id.toString(),
        filename: item.filename,
        file_type: item.file_type,
        name: item.extracted_data?.name || 'Unknown',
        email: item.extracted_data?.email?.[0] || '',
        skills_count: item.extracted_data?.skills?.length || 0,
        model_used: item.model_used,
        processing_time_ms: item.processing_time_ms,
        created_at: item.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Extract history error:', error);
    res.status(500).json({ error: 'Failed to fetch extraction history' });
  }
};

// GET /api/extract/report/:id
exports.getReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    const extraction = await Extraction.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    })
      .select('-raw_text')
      .lean();

    if (!extraction) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    res.json({
      extraction: {
        id: extraction._id.toString(),
        filename: extraction.filename,
        file_type: extraction.file_type,
        extracted_data: extraction.extracted_data,
        model_used: extraction.model_used,
        processing_time_ms: extraction.processing_time_ms,
        word_count: extraction.word_count,
        created_at: extraction.created_at,
      },
    });
  } catch (error) {
    console.error('Extract report error:', error);
    res.status(500).json({ error: 'Failed to fetch extraction report' });
  }
};

// GET /api/extract/health
exports.health = async (req, res) => {
  try {
    const status = await checkOllamaHealth();
    res.json(status);
  } catch (error) {
    res.status(500).json({ healthy: false, error: error.message });
  }
};
