import React from 'react';
import { motion } from 'motion/react';
import { ASSETS } from '../config/appSettings';

interface StormBackdropProps {
  intensity?: 'low' | 'high';
  storm?: boolean;
}

const PARTICLES = Array.from({ length: 46 }, (_, i) => {
  const rand = (seed: number) => (((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1) + 1) % 1;
  return {
    left: rand(1) * 100,
    top: rand(2) * 100,
    size: 1.5 + rand(3) * 3,
    dur: 8 + rand(4) * 14,
    delay: -rand(5) * 20,
    opacity: 0.35 + rand(6) * 0.55,
  };
});

export const StormBackdrop: React.FC<StormBackdropProps> = ({
  intensity = 'high',
  storm = false,
}) => {
  const bgOpacity = intensity === 'high' ? 0.18 : 0.1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {storm && (
        <>
          <div
            className="absolute inset-[-4%] bg-cover bg-center"
            style={{
              backgroundImage: `url(${ASSETS.lightningBg})`,
              opacity: bgOpacity,
            }}
          />
          <motion.div
            animate={{ opacity: [0, 0.22, 0, 0.12, 0] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'linear',
              times: [0, 0.04, 0.1, 0.15, 1],
            }}
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 50% 15%, var(--gold-soft) 0%, transparent 60%)',
            }}
          />
        </>
      )}

      {PARTICLES.map((p, idx) => (
        <span
          key={idx}
          className="wolf-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, oklch(0.04 0 0 / 0.85) 100%)',
        }}
      />
    </div>
  );
};
