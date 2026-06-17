import { useState, useEffect } from 'react';

export default function ScoreGauge({ score = 0, size = 160, label = 'Overall Score', delay = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = size > 100 ? 8 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const compact = size <= 80;

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 900;
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
    if (animatedScore >= 75) return '#76b900';
    if (animatedScore >= 50) return '#f2c94c';
    return '#ef4444';
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
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center score-gauge-container"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #111827, #050816)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            inset: strokeWidth + 6,
            background: '#0b1220',
            border: '1px solid rgba(148, 163, 184, 0.1)',
          }}
        />

        <svg viewBox={`0 0 ${size} ${size}`} className="absolute w-full h-full score-gauge-ring">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(148,163,184,0.18)" strokeWidth={strokeWidth} fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.12s ease',
            }}
          />
        </svg>

        <div className="text-center z-10">
          <div
            style={{ color: '#f8fafc', fontSize: compact ? '1.05rem' : '1.95rem' }}
            className="font-extrabold leading-none"
          >
            {animatedScore}
          </div>
          <div
            style={{ color, fontSize: compact ? '0.58rem' : '0.72rem' }}
            className="font-bold mt-1"
          >
            {getGrade()}
          </div>
        </div>
      </div>
      {label && (
        <p className="text-xs text-slate-400 text-center font-semibold uppercase">
          {label}
        </p>
      )}
    </div>
  );
}
