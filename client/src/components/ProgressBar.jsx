import { FiFileText, FiSearch, FiCpu, FiCheckCircle } from 'react-icons/fi';

const stages = [
  { key: 'parsing', label: 'Parsing', icon: FiFileText },
  { key: 'extracting', label: 'Extracting', icon: FiSearch },
  { key: 'analyzing', label: 'AI Analysis', icon: FiCpu },
  { key: 'finalizing', label: 'Report', icon: FiCheckCircle },
];

export default function ProgressBar({ stage = '', progress = 0, message = '' }) {
  const currentIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="progress-3d animate-fade-in-up">
      {/* Stages */}
      <div className="progress-stages-row">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex || stage === 'complete';

          return (
            <div key={s.key} className="progress-stage-item">
              {i > 0 && (
                <div className={`progress-connector ${isComplete ? 'progress-connector-done' : ''}`} />
              )}
              <div className={`progress-stage-circle ${
                isComplete
                  ? 'progress-stage-complete'
                  : isActive
                    ? 'progress-stage-active'
                    : 'progress-stage-pending'
              }`}>
                <Icon size={18} />
                {isActive && <span className="progress-pulse-ring" />}
              </div>
              <span className={`progress-stage-label ${
                isActive ? 'text-cyan-300' : isComplete ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          <div className="progress-shimmer" />
          <div className="progress-glow-tip" />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between mt-3">
        <div>
          {message && <p className="text-sm text-slate-400">{message}</p>}
        </div>
        <span className="progress-percent-badge">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
