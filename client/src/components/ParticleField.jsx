import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Floating 3D particle field that renders behind page content.
 * Enhanced with holographic hexagons, depth-layered rings, and
 * multi-coloured particles with varied motion paths.
 */
export default function ParticleField({ count = 40, className = '' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: `${(i * 17 + 5) % 96}%`,
        y: `${(i * 31 + 3) % 94}%`,
        size: 2 + (i % 5) * 1.2,
        delay: (i % 13) * 0.35,
        dur: 3 + (i % 7) * 0.9,
        color: ['#22d3ee', '#818cf8', '#34d399', '#f472b6', '#fbbf24'][i % 5],
        drift: i % 2 === 0 ? 12 : -12,
      })),
    [count]
  );

  const hexagons = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: `${15 + ((i * 37) % 70)}%`,
        y: `${10 + ((i * 43) % 80)}%`,
        size: 30 + (i % 3) * 18,
        delay: i * 0.7,
        dur: 8 + (i % 4) * 2,
        rotation: i * 60,
      })),
    []
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
            boxShadow: `0 0 ${p.size * 5}px ${p.color}`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, p.drift, 0],
            opacity: [0.15, 0.9, 0.15],
            scale: [0.6, 1.3, 0.6],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Holographic hexagons */}
      {hexagons.map((h) => (
        <motion.div
          key={`hex-${h.id}`}
          className="pf-hexagon"
          style={{
            left: h.x,
            top: h.y,
            width: h.size,
            height: h.size,
          }}
          animate={{
            rotate: [h.rotation, h.rotation + 360],
            opacity: [0.04, 0.12, 0.04],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: h.dur,
            delay: h.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Floating 3D rings */}
      <div className="pf-ring pf-ring-1" />
      <div className="pf-ring pf-ring-2" />
      <div className="pf-ring pf-ring-3" />

      {/* Ambient glow orbs */}
      <div className="pf-glow pf-glow-1" />
      <div className="pf-glow pf-glow-2" />
      <div className="pf-glow pf-glow-3" />
    </div>
  );
}
