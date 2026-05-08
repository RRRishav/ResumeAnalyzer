import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Floating 3D particle field that renders behind page content.
 * Each particle has randomised position, size, and animation delay.
 */
export default function ParticleField({ count = 35, className = '' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: `${(i * 17 + 5) % 96}%`,
        y: `${(i * 31 + 3) % 94}%`,
        size: 2 + (i % 4) * 1.5,
        delay: (i % 11) * 0.42,
        dur: 3 + (i % 5) * 1.2,
        color: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#818cf8' : '#34d399',
      })),
    [count]
  );

  return (
    <div className={`particle-field ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="pf-dot"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.2, 0.85, 0.2],
            scale: [0.7, 1.2, 0.7],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Floating 3D rings */}
      <div className="pf-ring pf-ring-1" />
      <div className="pf-ring pf-ring-2" />
      <div className="pf-ring pf-ring-3" />
    </div>
  );
}
