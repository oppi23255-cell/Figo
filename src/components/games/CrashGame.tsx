import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Radio, ShieldCheck } from 'lucide-react';
import {
  APP_SETTINGS,
  STATUS_MESSAGES,
  WolfSession,
  formatRemainingHMS,
  isSessionExpired,
  loadSession,
  saveSession,
} from '../../config/appSettings';
import {
  CrashCurrentData,
  CrashHistoryItem,
  subscribeCrashCurrent,
  subscribeCrashEnabled,
  subscribeCrashHistory,
} from '../../services/crashFirebase';
import { StormBackdrop } from '../StormBackdrop';
import { useToast } from '../ToastProvider';
import { BackToLobbyButton } from './GameShared';

interface CrashGameProps {
  onBack: () => void;
  onSessionExpired: () => void;
}

interface DisplayedPrediction {
  roundNumber: number;
  crashPoint: number;
}

export const CrashGame: React.FC<CrashGameProps> = ({ onBack, onSessionExpired }) => {
  const toast = useToast();
  const [session, setSession] = useState<WolfSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [currentState, setCurrentState] = useState<CrashCurrentData | null>(null);
  const [historyItems, setHistoryItems] = useState<CrashHistoryItem[]>([]);
  const [displayedPrediction, setDisplayedPrediction] = useState<DisplayedPrediction | null>(
    null,
  );
  const [isDatabaseClosed, setIsDatabaseClosed] = useState(false);

  // Strict single-source round lock: never update displayed prediction during flight/crashed
  const lastShownRoundRef = useRef<number | null>(null);
  const isDatabaseClosedRef = useRef(false);

  // Verify user session & maintain countdown clock
  useEffect(() => {
    const sess = loadSession();
    if (!sess) {
      toast.error('يرجى تسجيل الدخول للمتابعة');
      onSessionExpired();
      return;
    }
    if (isSessionExpired(sess, Date.now())) {
      toast.error('الايدي الخاص بك انتهت صلاحيته');
      onSessionExpired();
      return;
    }
    saveSession(sess);
    setSession(sess);
    setNow(Date.now());
  }, [onSessionExpired, toast]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (isSessionExpired(session, current)) {
        window.clearInterval(timer);
        toast.error('الايدي الخاص بك انتهت صلاحيته');
        onSessionExpired();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [session, onSessionExpired, toast]);

  // Realtime Firebase listeners (crash/enabled, crash/current, crash/history)
  useEffect(() => {
    if (!session || APP_SETTINGS.games.plane !== 'active') return;

    const markClosed = () => {
      isDatabaseClosedRef.current = true;
      lastShownRoundRef.current = null;
      setIsDatabaseClosed(true);
      setDisplayedPrediction(null);
    };

    const unsubEnabled = subscribeCrashEnabled(
      (enabled) => {
        if (!enabled) {
          markClosed();
        } else {
          isDatabaseClosedRef.current = false;
          setIsDatabaseClosed(false);
        }
      },
      () => {
        markClosed();
      },
    );

    const unsubHistory = subscribeCrashHistory(
      (items) => {
        if (isDatabaseClosedRef.current) return;
        setHistoryItems(items);
      },
      (_err, permissionDenied) => {
        if (permissionDenied) {
          markClosed();
        }
      },
    );

    const unsubCurrent = subscribeCrashCurrent(
      (data, closedByFalse) => {
        if (closedByFalse) {
          markClosed();
          return;
        }

        if (isDatabaseClosedRef.current) {
          return;
        }

        setCurrentState(data);
        if (!data) return;

        // Add finished round to recent odds only after it has actually crashed
        if (data.phase === 'crashed' && data.crashPoint >= 1) {
          const finalPoint = Number(data.crashPoint.toFixed(2));
          setHistoryItems((prev) => {
            if (prev.some((item) => item.roundNumber === data.roundNumber)) return prev;
            return [{ roundNumber: data.roundNumber, crashPoint: finalPoint }, ...prev].slice(
              0,
              12,
            );
          });
        }

        // STRICT RULE 2 & 3 & 4:
        // Only show/update prediction when:
        // 1. data.phase === "waiting" (right before takeoff)
        // 2. data.roundNumber !== lastShownRound (and strictly greater than previous shown round)
        // 3. data.crashPoint >= 1
        // Lock completely during "flight" and "crashed" until a NEW higher round enters "waiting".
        const lastShownRound = lastShownRoundRef.current;
        if (
          data.phase === 'waiting' &&
          data.roundNumber !== lastShownRound &&
          (lastShownRound === null || data.roundNumber > lastShownRound) &&
          data.crashPoint >= 1
        ) {
          lastShownRoundRef.current = data.roundNumber;
          setDisplayedPrediction({
            roundNumber: data.roundNumber,
            crashPoint: Number(data.crashPoint.toFixed(2)),
          });
        }
      },
      (_err, permissionDenied) => {
        if (permissionDenied) {
          markClosed();
        }
      },
    );

    return () => {
      unsubEnabled();
      unsubHistory();
      unsubCurrent();
    };
  }, [session]);

  const hms = formatRemainingHMS(session?.expiresAt ?? null, now);
  const gameStatus = APP_SETTINGS.games.plane;
  const recentOdds = historyItems.slice(0, 6);

  const waitingCountdownSec =
    !isDatabaseClosed &&
    currentState?.phase === 'waiting' &&
    typeof currentState.flightStartedAt === 'number'
      ? Math.max(0, Math.ceil((currentState.flightStartedAt - now) / 1000))
      : null;

  const statusLine = (() => {
    if (gameStatus !== 'active') return STATUS_MESSAGES[gameStatus];
    if (!session) return 'جار التحقق من الايدي …';
    if (isDatabaseClosed) return 'قاعدة البيانات مغلقة حالياً — تم إيقاف التوقعات';
    if (!currentState) return 'جار الاتصال المباشر بقاعدة البيانات …';
    if (!displayedPrediction) {
      return `جولة #${currentState.roundNumber} قيد التشغيل · بانتظار العد التنازلي للجولة القادمة`;
    }
    if (currentState.phase === 'waiting') {
      return `جولة #${currentState.roundNumber} — في انتظار الإقلاع`;
    }
    if (currentState.phase === 'flight') {
      return `جولة #${currentState.roundNumber} — الطائرة تحلق الآن (التوقع ثابت)`;
    }
    if (currentState.phase === 'crashed') {
      return `انتهت جولة #${currentState.roundNumber} — بانتظار العد التنازلي للجولة القادمة`;
    }
    return `جولة #${currentState.roundNumber}`;
  })();

  return (
    <div className="plane-page relative min-h-dvh overflow-hidden bg-ink text-action-surface">
      <div className="pointer-events-none fixed inset-0">
        <StormBackdrop intensity="high" />
      </div>

      <header className="plane-header relative z-10 border-b border-hair" dir="ltr">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3">
            <BackToLobbyButton onClick={onBack} />
            <div>
              <h1 className="font-display text-sm font-extrabold">Crash</h1>
              <span className="text-[9px] text-azure-soft">Figo</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 text-right">
            <ShieldCheck className="h-4 w-4 shrink-0 text-azure" />
            <div>
              <p className="text-[9px] text-azure-soft">PLAYER ID</p>
              <p className="break-all font-mono text-xs tabular-nums">
                {session?.code ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="wolf-game-main relative z-10 mx-auto flex w-full max-w-[520px] flex-col items-center px-5 pb-8 pt-8">
        <div className="mb-4 flex items-center gap-2 text-[10px] text-azure-soft">
          <ShieldCheck className="h-3 w-3" />
          <span>الوقت المتبقي</span>
        </div>

        <div
          className="grid w-full max-w-[326px] grid-cols-3 gap-5"
          dir="ltr"
          aria-label="الوقت المتبقي للايدي"
        >
          {['Hours', 'Minutes', 'Seconds'].map((label, idx) => (
            <div
              key={label}
              className="plane-clock flex aspect-square flex-col items-center justify-center rounded-full border border-azure/35"
            >
              <span className="font-display text-[26px] font-bold leading-none tabular-nums">
                {session ? hms[idx] : '—'}
              </span>
              <span className="mt-2 text-[9px] text-azure-soft">{label}</span>
            </div>
          ))}
        </div>

        <section className="mt-8 w-full" aria-label="سجل الأودد">
          <div
            className="mb-3 flex items-center justify-between text-[9px] text-azure-soft"
            dir="ltr"
          >
            <span>RECENT ODDS</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Radio className="h-3 w-3" />
              {currentState && !isDatabaseClosed
                ? `ROUND #${currentState.roundNumber}`
                : `${String(recentOdds.length).padStart(2, '0')} ROUNDS`}
            </span>
          </div>

          <div className="plane-history flex h-9 items-center gap-2 overflow-hidden" dir="ltr">
            <AnimatePresence initial={false}>
              {!isDatabaseClosed &&
                recentOdds.map((item, idx) => (
                  <motion.div
                    key={`${item.roundNumber}-${item.crashPoint}`}
                    layout
                    initial={{ opacity: 0, x: -24, scale: 0.85 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`flex h-8 min-w-[66px] shrink-0 items-center justify-center rounded-md border font-mono text-xs tabular-nums ${
                      idx === 0
                        ? 'border-azure/60 bg-azure/15 text-azure-soft'
                        : 'border-hair bg-ink/70 text-action-surface/70'
                    }`}
                  >
                    {item.crashPoint.toFixed(2)}x
                  </motion.div>
                ))}
            </AnimatePresence>

            {(isDatabaseClosed || recentOdds.length === 0) &&
              Array.from({ length: 6 }).map((_, idx) => (
                <span
                  key={idx}
                  className="flex h-8 min-w-[66px] items-center justify-center rounded-md border border-hair bg-ink/50 text-xs text-action-surface/35"
                >
                  —
                </span>
              ))}
          </div>
        </section>

        <div className="plane-orbit relative mt-8 shrink-0 rounded-full p-4">
          <div className="plane-dial relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full border border-azure/40">
            <div
              className={`plane-scan absolute inset-0 ${
                gameStatus === 'active' && !isDatabaseClosed ? '' : 'plane-scan-paused'
              }`}
              aria-hidden="true"
            />
            <div
              className="plane-reticle absolute inset-6 rounded-full border border-hair"
              aria-hidden="true"
            />

            {isDatabaseClosed ? (
              <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
                <Lock className="h-8 w-8 text-red-400" />
                <span className="text-xs font-bold text-red-300">قاعدة البيانات مغلقة</span>
              </div>
            ) : displayedPrediction ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={displayedPrediction.roundNumber}
                  initial={{ opacity: 0, y: 24, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.9 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    aria-label="الأودد المتوقع"
                    dir="ltr"
                    className="flex items-baseline font-display text-[56px] font-bold leading-none tabular-nums"
                  >
                    <span className="plane-odds-x mr-1 text-[34px] text-azure">x</span>
                    <span className="plane-odds-value">
                      {displayedPrediction.crashPoint.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="relative z-10 flex flex-col items-center px-4 text-center">
                <span className="font-display text-3xl font-bold text-azure-soft/60">—</span>
                <span className="mt-2 text-[11px] font-semibold text-action-surface/65">
                  بانتظار الجولة الجديدة
                </span>
              </div>
            )}

            {displayedPrediction && !isDatabaseClosed && (
              <span
                key={`pulse-${displayedPrediction.roundNumber}`}
                className="plane-result-pulse pointer-events-none absolute inset-0 rounded-full border border-azure"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center text-center" role="status">
          <p
            className={`text-sm font-semibold ${
              isDatabaseClosed ? 'text-red-400' : 'text-action-surface/90'
            }`}
          >
            {statusLine}
          </p>

          {displayedPrediction && !isDatabaseClosed && (
            <p className="mt-2 font-mono text-xs tabular-nums text-azure-soft" dir="ltr">
              ROUND #{displayedPrediction.roundNumber} · {displayedPrediction.crashPoint.toFixed(2)}x
              {waitingCountdownSec !== null
                ? ` · 00:${String(waitingCountdownSec).padStart(2, '0')}`
                : ''}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};
