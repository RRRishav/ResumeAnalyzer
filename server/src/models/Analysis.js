const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    file_type: { type: String },
    overall_score: { type: Number, default: 0 },
    ats_score: { type: Number, default: 0 },
    experience_level: { type: String },
    skills: { type: [mongoose.Schema.Types.Mixed], default: [] },
    skill_categories: { type: Object, default: {} },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    gemini_insights: { type: String },
    career_recommendations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    job_title_match: { type: String },
    raw_text: { type: String },
    word_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

module.exports = mongoose.model('Analysis', analysisSchema);
