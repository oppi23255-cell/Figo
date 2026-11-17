/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  APP_SETTINGS,
  AppScreen,
  GameKey,
  STATUS_MESSAGES,
} from './config/appSettings';
import { ToastProvider, useToast } from './components/ToastProvider';
import { StormBackdrop } from './components/StormBackdrop';
import { SplashScreen } from './components/SplashScreen';
import { GamesLobby } from './components/GamesLobby';
import { ActivationScreen } from './components/ActivationScreen';
import { CrashGame } from './components/games/CrashGame';

function FigoRouter() {
  const toast = useToast();
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [selectedGame, setSelectedGame] = useState<GameKey>('plane');

  const handleSelectGame = useCallback(
    (game: GameKey) => {
      const status = APP_SETTINGS.games[game];
      if (status !== 'active') {
        toast.info(STATUS_MESSAGES[status]);
        return;
      }
      setSelectedGame(game);
      setScreen('conditions');
      window.scrollTo(0, 0);
    },
    [toast],
  );

  const handleBackToGames = useCallback(() => {
    setScreen('games');
    window.scrollTo(0, 0);
  }, []);

  const handleActivated = useCallback(() => {
    setScreen(selectedGame);
    window.scrollTo(0, 0);
  }, [selectedGame]);

  if (screen === 'plane') {
    return <CrashGame onBack={handleBackToGames} onSessionExpired={handleBackToGames} />;
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-ink text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <StormBackdrop intensity={screen === 'games' ? 'high' : 'low'} />
      </div>

      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50"
          >
            <SplashScreen onComplete={() => setScreen('games')} />
          </motion.div>
        )}
      </AnimatePresence>

      {screen !== 'splash' && (
        <div className="relative z-10 min-h-dvh">
          {screen === 'games' && <GamesLobby onSelect={handleSelectGame} />}
          {screen === 'conditions' && (
            <ActivationScreen
              selectedGame={selectedGame}
              onBackToGames={handleBackToGames}
              onActivated={handleActivated}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <FigoRouter />
    </ToastProvider>
  );
}
