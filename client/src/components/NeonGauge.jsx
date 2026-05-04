import React, { useEffect, useState } from 'react';

export default function ScoreGauge({ value = 75, label = 'Score', maxValue = 100 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = value;
    const increment = target / 30;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayValue(target);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [value]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayValue / maxValue) * circumference;
  const offset = circumference - progress;

  // Color based on score
  const getColor = () => {
    if (displayValue >= 80) return { stroke: '#3b82f6', label: 'Excellent' };
    if (displayValue >= 60) return { stroke: '#06b6d4', label: 'Good' };
    if (displayValue >= 40) return { stroke: '#f59e0b', label: 'Fair' };
    return { stroke: '#ef4444', label: 'Needs Work' };
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <svg width="120" height="120" className="drop-shadow-lg">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{displayValue}</div>
        <div className="text-sm text-gray-600 uppercase tracking-wide font-medium mt-1">
          {label}
        </div>
        <div className="text-xs text-gray-500 mt-1">{color.label}</div>
      </div>
    </div>
  );
}
