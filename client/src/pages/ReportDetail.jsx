import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScoreGauge from '../components/ScoreGauge';
import SkillChart from '../components/SkillChart';
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiTrendingUp, FiStar, FiCalendar, FiFileText } from 'react-icons/fi';
import './ReportDetail.css';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, [id]);

  const loadReport = async () => {
    try {
      const res = await api.get(`/resume/report/${id}`);
      const r = res.data.report;
      // Parse JSON fields if needed
      ['skills', 'skill_categories', 'strengths', 'weaknesses', 'suggestions', 'career_recommendations'].forEach(f => {
        if (typeof r[f] === 'string') r[f] = JSON.parse(r[f]);
      });
      setReport(r);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner" /></div>;
  if (!report) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}><h2>Report not found</h2></div>;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="report-detail">
      <div className="container">
        <button className="btn btn-ghost report-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <div className="report-header animate-fade-in-up">
          <div className="report-header-info">
            <h1><FiFileText /> {report.filename}</h1>
            <p><FiCalendar size={14} /> {formatDate(report.created_at)} • {report.word_count} words • {report.experience_level}</p>
          </div>
        </div>

        {/* Scores */}
        <div className="report-scores animate-fade-in-up stagger-1">
          <div className="report-score-card glass-card">
            <ScoreGauge score={report.overall_score} size={200} label="Overall Score" />
          </div>
          <div className="report-score-card glass-card">
            <ScoreGauge score={report.ats_score} size={200} label="ATS Score" delay={300} />
          </div>
        </div>

        {/* Skills */}
        <div className="report-section glass-card animate-fade-in-up stagger-2">
          <h3><FiStar /> Skill Analysis</h3>
          <SkillChart skillCategories={report.skill_categories} />
          <div className="report-skills-grid">
            {Object.entries(report.skill_categories || {}).map(([cat, skills]) => (
              <div key={cat} className="report-skill-group">
                <h4>{cat}</h4>
                <div className="report-skill-tags">
                  {(Array.isArray(skills) ? skills : []).map((s, i) => (
                    <span key={i} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="report-two-col animate-fade-in-up stagger-3">
          <div className="report-section glass-card">
            <h3><FiCheckCircle style={{ color: 'var(--accent-secondary)' }} /> Strengths</h3>
            <ul className="result-list result-list-success">
              {(report.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="report-section glass-card">
            <h3><FiXCircle style={{ color: 'var(--accent-danger)' }} /> Weaknesses</h3>
            <ul className="result-list result-list-danger">
              {(report.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>

        {/* Suggestions */}
        <div className="report-section glass-card animate-fade-in-up stagger-4">
          <h3><FiTrendingUp /> Improvement Suggestions</h3>
          <div className="result-suggestions">
            {(report.suggestions || []).map((s, i) => (
              <div key={i} className="suggestion-item">
                <span className={`badge badge-${s.priority}`}>{s.priority}</span>
                <span className="suggestion-text">{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Career Recs */}
        {report.career_recommendations?.length > 0 && (
          <div className="report-section glass-card animate-fade-in-up stagger-5">
            <h3><FiStar /> Career Recommendations</h3>
            <div className="result-careers">
              {report.career_recommendations.map((c, i) => (
                <div key={i} className="career-item">
                  <div className="career-info">
                    <span className="career-role">{c.role}</span>
                    <span className="career-reason">{c.reason}</span>
                  </div>
                  <div className="career-match">
                    <span className="career-match-value">{c.match_score}%</span>
                    <span className="career-match-label">Match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {report.gemini_insights && (
          <div className="report-section glass-card animate-fade-in-up">
            <h3>🤖 AI Summary</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{report.gemini_insights}</p>
          </div>
        )}
      </div>
    </div>
  );
}
