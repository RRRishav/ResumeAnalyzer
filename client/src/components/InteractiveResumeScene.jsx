import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiCpu, FiFileText, FiTarget, FiZap } from 'react-icons/fi';

const metrics = [
  { label: 'ATS', value: '94', icon: FiTarget },
  { label: 'Skills', value: '42', icon: FiZap },
  { label: 'Fit', value: '88', icon: FiCpu },
];

export default function InteractiveResumeScene() {
  const [rotate, setRotate] = useState({ x: -7, y: 10 });
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      left: `${8 + ((i * 23) % 84)}%`,
      top: `${12 + ((i * 31) % 76)}%`,
      delay: `${(i % 7) * 0.32}s`,
    })),
    []
  );

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setRotate({ x: y * -16, y: x * 20 });
  };

  return (
    <div
      className="resume-scene"
      onMouseMove={handleMove}
      onMouseLeave={() => setRotate({ x: -7, y: 10 })}
    >
      <div className="scene-orbit scene-orbit-one" />
      <div className="scene-orbit scene-orbit-two" />
      {particles.map((particle, index) => (
        <span
          key={index}
          className="scene-particle"
          style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }}
        />
      ))}

      <motion.div
        className="resume-model"
        animate={{ rotateX: rotate.x, rotateY: rotate.y }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div className="resume-page">
          <div className="resume-page-header">
            <div className="resume-avatar"><FiFileText /></div>
            <div>
              <div className="resume-line resume-line-name" />
              <div className="resume-line resume-line-role" />
            </div>
          </div>
          <div className="resume-score-ring">
            <span>94</span>
            <small>ATS</small>
          </div>
          <div className="resume-lines">
            <i /><i /><i /><i /><i />
          </div>
          <div className="resume-tags">
            <span>React</span>
            <span>Node</span>
            <span>AI</span>
          </div>
        </div>

        <div className="floating-panel panel-score">
          <FiCheck />
          <div>
            <strong>Strong match</strong>
            <span>11 improvements ready</span>
          </div>
        </div>

        <div className="floating-panel panel-keywords">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div className="mini-metric" key={metric.label}>
                <Icon />
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
