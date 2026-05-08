import { useState, useEffect } from 'react';

export default function ScoreGauge({ score = 0, size = 160, label = 'Overall Score', delay = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = size > 100 ? 10 : 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1800;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(elapsed / duration, 1);
        // Elastic easing for bouncy effect
        const eased = pct < 1
          ? 1 - Math.pow(1 - pct, 4)
          : 1;
        setAnimatedScore(Math.round(eased * score));
        if (pct < 1) requestAnimationFrame(animate);
      };
      animate();
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const getColor = () => {
    if (animatedScore >= 75) return { stroke: '#06b6d4', glow: 'rgba(6,182,212,0.35)', bg: 'rgba(6,182,212,0.08)' };
    if (animatedScore >= 50) return { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.08)' };
    return { stroke: '#f43f5e', glow: 'rgba(244,63,94,0.35)', bg: 'rgba(244,63,94,0.08)' };
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
    <div className="flex flex-col items-center gap-2 group">
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center score-gauge-container"
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-[-4px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${color.glow}, transparent)`,
            filter: 'blur(8px)',
          }}
        />

        {/* Background pulse */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: color.bg,
            animationDuration: '3s',
          }}
        />

        <svg viewBox={`0 0 ${size} ${size}`} className="absolute w-full h-full score-gauge-ring">
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.stroke} stopOpacity="1" />
              <stop offset="100%" stopColor={color.stroke} stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Background circle with subtle pattern */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} fill="none"
          />
          {/* Secondary track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(255,255,255,0.02)" strokeWidth={strokeWidth + 6} fill="none"
          />

          {/* Glow layer */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color.stroke} strokeWidth={strokeWidth + 4} fill="none"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.1s ease' }}
            opacity="0.2"
            filter={`url(#glow-${label})`}
          />

          {/* Progress circle */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={`url(#grad-${label})`} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.1s ease',
              filter: `drop-shadow(0 0 12px ${color.glow})`,
            }}
          />

          {/* Endpoint dot */}
          {animatedScore > 0 && (
            <circle
              cx={size / 2 + radius * Math.cos(((animatedScore / 100) * 360 - 90) * Math.PI / 180)}
              cy={size / 2 + radius * Math.sin(((animatedScore / 100) * 360 - 90) * Math.PI / 180)}
              r={strokeWidth / 2 + 1}
              fill={color.stroke}
              style={{ filter: `drop-shadow(0 0 6px ${color.glow})` }}
            />
          )}
        </svg>

        {/* Content */}
        <div className="text-center z-10">
          <div
            style={{ color: color.stroke, fontSize: size > 100 ? '2rem' : '1.25rem' }}
            className="font-black leading-none tracking-tight"
          >
            {animatedScore}
          </div>
          <div
            style={{ color: color.stroke, fontSize: size > 100 ? '0.8rem' : '0.65rem' }}
            className="font-bold mt-0.5 opacity-80"
          >
            {getGrade()}
          </div>
        </div>
      </div>
      {label && (
        <p className="text-xs text-slate-400 text-center font-medium tracking-wide uppercase">
          {label}
        </p>
      )}
    </div>
  );
}
