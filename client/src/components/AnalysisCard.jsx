import { useNavigate } from 'react-router-dom';
import { FiFileText, FiCalendar, FiArrowRight } from 'react-icons/fi';
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
      className="analysis-card-hud glass-card z-float p-6 cursor-pointer hover:border-indigo-500/50 transition-all group"
      onClick={() => navigate(`/report/${analysis.id}`)}
      id={`analysis-${analysis.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        {/* File Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <FiFileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-gray-100 truncate group-hover:text-indigo-400 transition-colors">
              {analysis.filename}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <FiCalendar size={12} />
              <span>{formatDate(analysis.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Score Gauge */}
        <div className="flex-shrink-0">
          <ScoreGauge score={analysis.overall_score} size={70} label="" />
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {topSkills.map((skill, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/30 transition-colors"
          >
            {typeof skill === 'string' ? skill : skill.name}
          </span>
        ))}
        {skills.length > 4 && (
          <span className="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-xs font-medium">
            +{skills.length - 4} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-cyan-400">ATS: {analysis.ats_score}%</span>
          <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-600/20 text-amber-400">
            {analysis.experience_level}
          </span>
        </div>
        <FiArrowRight className="text-gray-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}
