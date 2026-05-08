import { useNavigate } from 'react-router-dom';
import { FiFileText, FiCalendar, FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import ScoreGauge from './ScoreGauge';

export default function AnalysisCard({ analysis }) {
  const navigate = useNavigate();
  const skills = typeof analysis.skills === 'string' ? JSON.parse(analysis.skills) : (analysis.skills || []);
  const topSkills = Array.isArray(skills) ? skills.slice(0, 4) : [];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div
      className="analysis-card group cursor-pointer"
      onClick={() => navigate(`/report/${analysis.id}`)}
      id={`analysis-${analysis.id}`}
    >
      {/* Hover gradient overlay */}
      <div className="analysis-card-glow" />

      {/* Header */}
      <div className="flex items-start justify-between gap-5 mb-5 relative z-10">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="analysis-card-file-icon">
            <FiFileText size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-100 truncate text-[0.9rem] group-hover:text-cyan-300 transition-colors duration-300">
              {analysis.filename}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
              <FiCalendar size={11} />
              <span>{formatDate(analysis.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <ScoreGauge score={analysis.overall_score} size={68} label="" />
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-5 relative z-10">
        {topSkills.map((skill, i) => (
          <span
            key={i}
            className="analysis-skill-tag"
          >
            {typeof skill === 'string' ? skill : skill.name}
          </span>
        ))}
        {skills.length > 4 && (
          <span className="analysis-skill-tag analysis-skill-tag-more">
            +{skills.length - 4}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] relative z-10">
        <div className="flex items-center gap-3">
          <span className="analysis-ats-badge">
            <FiTrendingUp size={11} /> ATS: {analysis.ats_score}%
          </span>
          <span className="analysis-exp-badge">
            {analysis.experience_level}
          </span>
        </div>
        <div className="analysis-arrow">
          <FiArrowRight size={14} />
        </div>
      </div>
    </div>
  );
}
