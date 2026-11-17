import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Infinity as InfinityIcon, Wifi } from 'lucide-react';
import {
  ASSETS,
  formatDurationBadge,
  loadSession,
} from '../../config/appSettings';

export const BackToLobbyButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="العودة للألعاب"
    className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-azure/25 bg-ink-2/60 text-azure-soft transition-colors hover:border-azure/50 hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
  >
    <ArrowLeft className="h-4 w-4" />
  </button>
);

export const GameTopHeader: React.FC<{
  title: string;
  badge?: string;
  onBack: () => void;
}> = ({ title, badge, onBack }) => (
  <header
    className="sticky top-0 z-30 w-full border-b border-azure/25 bg-black/70 backdrop-blur-xl"
    dir="ltr"
  >
    <div className="mx-auto flex h-14 w-full max-w-[520px] items-center justify-between px-4">
      <BackToLobbyButton onClick={onBack} />
      <div className="flex flex-col items-center">
        <span className="font-display text-[13px] font-black tracking-wide text-neutral-50">
          {title}
        </span>
        {badge && (
          <span className="font-display text-[8px] font-bold uppercase tracking-[0.3em] text-azure">
            {badge}
          </span>
        )}
      </div>
      <div className="flex h-9 items-center gap-1.5 rounded-xl border border-hair bg-ink-2/60 px-2.5">
        <Wifi className="h-3.5 w-3.5 text-emerald-400" />
        <span className="font-display text-[9px] font-bold uppercase tracking-widest text-neutral-300">
          Live
        </span>
      </div>
    </div>
  </header>
);

export const WolfBrandCenter: React.FC = () => (
  <div className="flex flex-col items-center">
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border border-azure/30 bg-black/40 shadow-gold-lux">
      <img
        src={ASSETS.wolfLogo}
        alt="WOLF SCRIPT"
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-[20px] object-cover"
      />
      <span className="pointer-events-none absolute inset-1.5 rounded-[14px] border border-azure/15" />
    </div>
    <h2 className="mt-3 font-display text-lg font-black tracking-tight text-neutral-50">
      <span className="flash-word">WOLF SCRIPT</span>
    </h2>
    <div className="mt-1.5 h-px w-24 lux-hairline" />
  </div>
);

export const RemainingTimeBanner: React.FC = () => {
  const [expiresAt, setExpiresAt] = useState<number | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sess = loadSession();
    setExpiresAt(sess ? sess.expiresAt : undefined);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (expiresAt === undefined) return null;

  const isLifetime = expiresAt === null;
  const remaining = isLifetime ? 0 : Math.max(0, expiresAt - now);
  const isExpired = !isLifetime && remaining <= 0;

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
        isExpired
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-azure/30 bg-azure/[0.07]'
      }`}
    >
      <span className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
        الوقت المتبقي
      </span>
      <span
        className={`flex items-center gap-2 font-mono text-lg font-black tabular-nums ${
          isExpired ? 'text-red-400' : 'text-azure-soft'
        }`}
        dir="ltr"
      >
        {isLifetime ? (
          <>
            <InfinityIcon className="h-4 w-4" />
            <span>LIFETIME</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span>{isExpired ? 'EXPIRED' : formatDurationBadge(remaining)}</span>
          </>
        )}
      </span>
    </div>
  );
};

export const GameActionButtons: React.FC<{
  onStart: () => void;
  onReset: () => void;
  disabled?: boolean;
}> = ({ onStart, onReset, disabled }) => (
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="h-12 cursor-pointer rounded-xl bg-white font-display text-xs font-black tracking-wide text-black shadow-lg shadow-white/10 transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50"
    >
      بدأ
    </button>
    <button
      type="button"
      onClick={onReset}
      className="h-12 cursor-pointer rounded-xl border border-white/25 bg-white/[0.06] font-display text-xs font-black tracking-wide text-white transition-all hover:bg-white/15 active:scale-[0.98]"
    >
      اعاده بدأ
    </button>
  </div>
);

interface WinnerEntry {
  id: string;
  bet: string;
  win: string;
}

function generateWinner(): WinnerEntry {
  const raw = String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999));
  const masked = `${raw.slice(0, 2)}*******${raw.slice(-2)}`;
  const betNum = (Math.floor(Math.random() * 18) + 2) * 500;
  const mult = 1.4 + Math.random() * 7.6;
  return {
    id: masked,
    bet: betNum.toLocaleString('en-US'),
    win: Math.round(betNum * mult).toLocaleString('en-US'),
  };
}

export const LiveWinnersFeed: React.FC = () => {
  const [winners, setWinners] = useState<WinnerEntry[]>(() =>
    Array.from({ length: 6 }, generateWinner),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setWinners((prev) => [generateWinner(), ...prev.slice(0, 5)]);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-hair bg-ink/70 backdrop-blur-xl"
      dir="ltr"
    >
      <div className="flex items-center justify-between border-b border-hair px-4 py-3">
        <span className="font-display text-[10px] font-black uppercase tracking-[0.26em] text-neutral-300">
          Live Winners
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-display text-[9px] font-bold uppercase tracking-widest text-neutral-400">
            Realtime
          </span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-hair px-4 py-2 font-display text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        <span>ID</span>
        <span className="text-center">Bet Amount</span>
        <span className="text-right">Win Amount</span>
      </div>

      <div className="divide-y divide-white/5">
        {winners.map((w, idx) => (
          <div
            key={`${w.id}-${idx}`}
            className="grid grid-cols-3 items-center gap-2 px-4 py-2.5 text-[11px]"
          >
            <span className="font-mono text-neutral-300 tabular-nums">{w.id}</span>
            <span className="text-center font-mono text-neutral-400 tabular-nums">{w.bet}</span>
            <span className="text-right font-mono font-bold text-azure-soft tabular-nums">
              +{w.win}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
