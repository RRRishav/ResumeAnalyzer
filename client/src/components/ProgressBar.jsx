import { FiFileText, FiSearch, FiCpu, FiCheckCircle } from 'react-icons/fi';

const stages = [
  { key: 'parsing', label: 'Parsing Document', icon: FiFileText },
  { key: 'extracting', label: 'Extracting Skills', icon: FiSearch },
  { key: 'analyzing', label: 'AI Analysis', icon: FiCpu },
  { key: 'finalizing', label: 'Generating Report', icon: FiCheckCircle },
];

export default function ProgressBar({ stage = '', progress = 0, message = '' }) {
  const currentIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="animate-fade-in-up">
      {/* Stages */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex || stage === 'complete';

          return (
            <div key={s.key} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                isComplete
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 border-transparent text-white'
                  : isActive
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 animate-pulse'
                    : 'border-gray-600 bg-slate-800/50 text-gray-500'
              }`}>
                <Icon size={20} />
              </div>
              <span className={`text-xs font-medium text-center ${
                isActive ? 'text-indigo-400' : isComplete ? 'text-cyan-400' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10 mb-4">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full transition-all duration-500 relative"
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          <div className="absolute inset-0 shadow-glow" />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between">
        <div>
          {message && <p className="text-sm text-gray-400">{message}</p>}
        </div>
        <span className="text-sm font-bold text-gradient">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
