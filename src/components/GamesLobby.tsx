import React, { useEffect, useState } from 'react';
import { ArrowUpLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import {
  APP_SETTINGS,
  ASSETS,
  GAME_CATALOG,
  GameKey,
  ONLINE_USERS_POLL_MS,
  WolfSession,
  getOnlineUsersCount,
  isSessionExpired,
  loadSession,
} from '../config/appSettings';

interface GamesLobbyProps {
  onSelect: (game: GameKey) => void;
}

export const GamesLobby: React.FC<GamesLobbyProps> = ({ onSelect }) => {
  const [onlineUsers, setOnlineUsers] = useState<number>(() => getOnlineUsersCount());
  const [activeSession, setActiveSession] = useState<WolfSession | null>(null);

  useEffect(() => {
    const sess = loadSession();
    if (sess && !isSessionExpired(sess, Date.now())) {
      setActiveSession(sess);
    } else {
      setActiveSession(null);
    }

    const interval = window.setInterval(() => {
      setOnlineUsers(getOnlineUsersCount());
    }, ONLINE_USERS_POLL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="wolf-games relative min-h-dvh text-foreground">
      <header className="wolf-header sticky top-0 z-30 border-b border-hair" dir="ltr">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={ASSETS.wolfLogo}
              alt="Figo"
              referrerPolicy="no-referrer"
              className="size-12 shrink-0 rounded-full border border-azure/30 object-cover"
            />
            <span className="font-display text-base font-extrabold tracking-tight whitespace-nowrap sm:text-xl">
              Figo <span className="text-azure-soft">SCRIPT</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs text-foreground/75">
            <span className="size-2 rounded-full bg-azure animate-pulse" aria-hidden="true" />
            <span>
              <strong className="font-mono text-foreground tabular-nums">{onlineUsers}</strong>{' '}
              <span className="hidden sm:inline">Users online</span>
              <span className="sm:hidden">Online</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pb-16 pt-9 sm:pt-12">
        <section className="mb-8 text-center" dir="rtl">
          <p className="text-xs font-semibold tracking-widest text-azure-soft">سكربت Figo</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl" style={{ textWrap: 'balance' }}>
            لعبة <span className="text-azure">الطيارة</span>
          </h1>
          <p className="mt-3 text-sm text-foreground/55">توقعات مباشرة لحظة بلحظة</p>

          {activeSession && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-azure/35 bg-azure/10 px-3.5 py-2 text-xs text-azure-soft">
              <ShieldCheck className="size-4 text-azure" />
              <span>حساب مفعل:</span>
              <span className="font-mono font-bold text-foreground tabular-nums" dir="ltr">
                {activeSession.code}
              </span>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4" dir="rtl">
          {GAME_CATALOG.map((item, index) => {
            const status = APP_SETTINGS.games[item.key];
            const isAvailable = status === 'active' && item.available;
            const statusText =
              status === 'maintenance'
                ? 'تحت الصيانة'
                : isAvailable
                  ? 'متاحة الآن'
                  : 'غير متاحة حالياً';
            const isFeatured = index === 0;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                aria-label={`اختيار ${item.label}`}
                className={`wolf-row group flex w-full cursor-pointer overflow-hidden text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                  isFeatured ? 'wolf-row-featured flex-col' : 'items-center'
                }`}
              >
                <div
                  className={`relative shrink-0 overflow-hidden bg-ink-3 ${
                    isFeatured ? 'aspect-[16/9] w-full' : 'm-3 size-24 rounded-xl'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.label}
                    referrerPolicy="no-referrer"
                    loading={index < 2 ? 'eager' : 'lazy'}
                    className="wolf-game-art size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isFeatured && (
                    <span className="absolute right-3 top-3 rounded-full bg-azure px-3 py-1 text-[10px] font-bold text-black">
                      الأكثر لعباً
                    </span>
                  )}
                </div>

                <div
                  className={`flex min-w-0 flex-1 items-center justify-between gap-3 ${
                    isFeatured ? 'w-full p-5' : 'py-3 pl-4'
                  }`}
                >
                  <div className="min-w-0">
                    <h2
                      className={`font-display font-black tracking-tight ${
                        isFeatured ? 'text-2xl' : 'text-base'
                      }`}
                      dir="ltr"
                    >
                      {item.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-foreground/55">{item.label}</p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-azure-soft">
                      <span
                        className={`size-1.5 rounded-full ${
                          isAvailable ? 'bg-azure animate-pulse' : 'bg-foreground/40'
                        }`}
                        aria-hidden="true"
                      />
                      {statusText}
                    </span>
                  </div>

                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-full ${
                      isAvailable
                        ? 'wolf-play'
                        : 'border border-hair text-foreground/45'
                    }`}
                  >
                    {isAvailable ? (
                      <ArrowUpLeft className="size-5" />
                    ) : (
                      <LockKeyhole className="size-4" />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <footer
          className="mt-10 flex items-center justify-center gap-3 border-t border-hair pt-7"
          dir="ltr"
        >
          <img
            src={ASSETS.wolfLogo}
            alt="Figo"
            referrerPolicy="no-referrer"
            className="size-7 rounded-full border border-azure/30 object-cover"
          />
          <span className="font-display text-[10px] font-semibold text-foreground/45">
            Figo
          </span>
        </footer>
      </main>
    </div>
  );
};
