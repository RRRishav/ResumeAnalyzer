import { useState, useEffect } from 'react';

export default function ScoreGauge({ score = 0, size = 160, label = 'Overall Score', delay = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 1500;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - pct, 3);
        setAnimatedScore(Math.round(eased * score));
        if (pct < 1) requestAnimationFrame(animate);
      };
      animate();
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const getColor = () => {
    if (animatedScore >= 75) return { stroke: '#06b6d4', fill: 'cyan' };
    if (animatedScore >= 50) return { stroke: '#fbbf24', fill: 'amber' };
    return { stroke: '#ef4444', fill: 'red' };
  };

  const getGrade = () => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute w-full h-full">
          {/* Background circle */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color.stroke} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.1s ease',
              filter: `drop-shadow(0 0 12px ${color.stroke}40)`
            }}
          />
        </svg>
        {/* Content */}
        <div className="text-center z-10">
          <div style={{ color: color.stroke }} className="text-3xl font-bold">
            {animatedScore}
          </div>
          <div style={{ color: color.stroke }} className="text-sm font-bold">
            {getGrade()}
          </div>
        </div>
      </div>
      {label && <p className="text-xs text-gray-400 text-center">{label}</p>}
    </div>
  );
}
