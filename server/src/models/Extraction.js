const mongoose = require('mongoose');

const extractionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    file_type: { type: String },
    extracted_data: {
      name: { type: String, default: null },
      phone: { type: [String], default: [] },
      email: { type: [String], default: [] },
      location: { type: String, default: null },
      professional_summary: { type: String, default: null },
      total_experience: { type: String, default: null },
      links: {
        portfolio: { type: String, default: null },
        github: { type: String, default: null },
        linkedin: { type: String, default: null },
        other: { type: [String], default: [] },
      },
      tenth_marks: { type: String, default: null },
      twelfth_marks: { type: String, default: null },
      degree: { type: String, default: null },
      stream: { type: String, default: null },
      cgpa: { type: String, default: null },
      education: [
        {
          degree: { type: String, default: null },
          institution: { type: String, default: null },
          stream: { type: String, default: null },
          score: { type: String, default: null },
          duration: { type: String, default: null },
        },
      ],
      projects: [
        {
          title: { type: String },
          description: { type: String },
          tech_stack: { type: [String], default: [] },
        },
      ],
      skills: { type: mongoose.Schema.Types.Mixed, default: {} },
      certifications: [
        {
          name: { type: String },
          issuer: { type: String, default: null },
          year: { type: String, default: null },
        },
      ],
      achievements: { type: [String], default: [] },
      languages: { type: [String], default: [] },
      experience: [
        {
          role: { type: String },
          company: { type: String },
          duration: { type: String },
          description: { type: String },
        },
      ],
      suggested_roles: { type: [mongoose.Schema.Types.Mixed], default: [] },
      ats_score: { type: Number, default: null },
      ats_analysis: {
        overall_score: { type: Number, default: null },
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        suggestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
      },
    },
    model_used: { type: String, default: 'llama3.2' },
    provider_used: { type: String, default: 'ollama' },
    processing_time_ms: { type: Number, default: 0 },
    raw_text: { type: String },
    word_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

module.exports = mongoose.model('Extraction', extractionSchema);
