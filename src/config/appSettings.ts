export type GameKey = 'plane';
export type GameStatus = 'active' | 'disabled' | 'maintenance';
export type AppScreen = 'splash' | 'games' | 'conditions' | 'plane';

export interface PlatformOption {
  id: 'bizbet';
  name: string;
  downloadUrl: string;
  registerUrl: string;
  promoCode: string;
  depositUsd: number;
  depositEgp: number;
}

export interface WolfSession {
  code: string;
  expiresAt: number | null;
  platformId?: string;
}

export const ASSETS = {
  wolfLogo: '/src/assets/images/figo_logo_1794957712951.jpg',
  lightningBg: '/src/assets/images/lightning_bg_1794956991728.jpg',
  gamePlane: '/src/assets/images/game_plane_1794956993403.jpg',
} as const;

export const APP_SETTINGS = {
  games: {
    plane: 'active' as GameStatus,
  },
  idPrefix: '',
  idMinLength: 10,
  idMaxLength: 11,
  promoCode: 'R99',
  masterId: '1832667290',
  telegramUrl: 'https://t.me/rexalio_bot',
  channelUrl: 'https://t.me/+PoUtDH8htYNjZWY0',
  platforms: [
    {
      id: 'bizbet',
      name: 'BIZBET',
      downloadUrl: 'https://tinyurl.com/mw34w9ph',
      registerUrl: 'https://tinyurl.com/mw34w9ph',
      promoCode: 'R99',
      depositUsd: 4,
      depositEgp: 180,
    },
  ] satisfies PlatformOption[],
};

export interface GameCatalogItem {
  key: GameKey;
  title: string;
  label: string;
  image: string;
  available: boolean;
  featured?: boolean;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    key: 'plane',
    title: 'CRASH',
    label: 'الطيارة',
    image: ASSETS.gamePlane,
    available: true,
    featured: true,
  },
];

export const STATUS_MESSAGES: Record<Exclude<GameStatus, 'active'>, string> = {
  disabled: 'هذه اللعبة متوقفة حالياً',
  maintenance: 'هذه اللعبة تحت الصيانة حالياً',
};

export const ONLINE_USERS_POLL_MS = 2000;

export function getOnlineUsersCount(): number {
  return 50 + Math.floor(Math.random() * 251);
}

export function validateUserId(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^\d+$/.test(trimmed) &&
    trimmed.length >= APP_SETTINGS.idMinLength &&
    trimmed.length <= APP_SETTINGS.idMaxLength &&
    trimmed.startsWith(APP_SETTINGS.idPrefix)
  );
}

export function getIdValidationError(): string {
  const range =
    APP_SETTINGS.idMinLength === APP_SETTINGS.idMaxLength
      ? `${APP_SETTINGS.idMinLength}`
      : `${APP_SETTINGS.idMinLength} إلى ${APP_SETTINGS.idMaxLength}`;
  return `الـ ID لازم يكون من ${range} رقم${
    APP_SETTINGS.idPrefix ? ` ويبدأ بـ ${APP_SETTINGS.idPrefix}` : ''
  }`;
}

export function isMasterCode(code: string | undefined): boolean {
  return !!code && code.trim() === APP_SETTINGS.masterId.trim();
}

const SESSION_KEY = 'mrdollar_session';
export const CHANNEL_JOINED_KEY = 'wolf_channel_joined';

export function saveSession(session: WolfSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSession(): WolfSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as WolfSession) : null;
  } catch {
    return null;
  }
}

export function isSessionExpired(session: WolfSession, now: number): boolean {
  return session.expiresAt !== null && now >= session.expiresAt;
}

export function formatRemainingHMS(expiresAt: number | null, now: number): [string, string, string] {
  if (expiresAt === null) return ['∞', '∞', '∞'];
  const totalSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor(totalSec / 60) % 60;
  const seconds = totalSec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')) as [string, string, string];
}

export function formatDurationBadge(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days > 0 ? `${days}d ` : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
