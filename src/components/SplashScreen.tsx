import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ASSETS } from '../config/appSettings';
import { StormBackdrop } from './StormBackdrop';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="wolf-splash fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden"
      onClick={onComplete}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onComplete();
      }}
    >
      <StormBackdrop intensity="high" storm />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center"
      >
        {!imgError ? (
          <img
            src={ASSETS.wolfLogo}
            alt="Figo"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="wolf-splash-logo relative aspect-square w-[min(76vw,380px)] object-cover"
          />
        ) : (
          <div className="wolf-splash-logo flex aspect-square w-[min(76vw,380px)] items-center justify-center rounded-full border border-azure/40 bg-ink-2">
            <span className="flash-word text-3xl">Figo</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
