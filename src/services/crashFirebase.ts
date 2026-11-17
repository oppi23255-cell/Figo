import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Database,
  DataSnapshot,
  getDatabase,
  limitToLast,
  onValue,
  orderByKey,
  query,
  ref,
  Unsubscribe,
} from 'firebase/database';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAlX1ASvDrf5BBtaB72AUYqSoW34YvP_y4',
  authDomain: 'mrwan-dd795.firebaseapp.com',
  databaseURL: 'https://mrwan-dd795-default-rtdb.firebaseio.com',
  projectId: 'mrwan-dd795',
  storageBucket: 'mrwan-dd795.firebasestorage.app',
  messagingSenderId: '12538399995',
  appId: '1:12538399995:web:4a7e6b40f611891fecb45e',
};

export type CrashPhase = 'waiting' | 'flight' | 'crashed' | string;

export interface CrashCurrentData {
  roundNumber: number;
  phase: CrashPhase;
  crashPoint: number;
  roundStartedAt?: number;
  flightStartedAt?: number;
  updatedAt?: number;
}

export interface CrashHistoryItem {
  roundNumber: number;
  crashPoint: number;
}

let dbInstance: Database | null = null;

export function getCrashDatabase(): Database {
  if (dbInstance) return dbInstance;
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  dbInstance = getDatabase(app);
  return dbInstance;
}

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: unknown }).code) : '';
  const msg = 'message' in err ? String((err as { message?: unknown }).message) : '';
  return (
    code.toUpperCase().includes('PERMISSION_DENIED') ||
    msg.toUpperCase().includes('PERMISSION_DENIED') ||
    msg.toLowerCase().includes('permission denied')
  );
}

function extractCrashPointValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1) {
    return Number(raw.toFixed(2));
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['crashPoint', 'multiplier', 'point', 'odd', 'value']) {
      const candidate = Number(obj[key]);
      if (Number.isFinite(candidate) && candidate >= 1) {
        return Number(candidate.toFixed(2));
      }
    }
  }
  return null;
}

export function parseHistorySnapshot(snapshot: DataSnapshot): CrashHistoryItem[] {
  if (!snapshot.exists()) return [];
  const raw = snapshot.val();
  if (!raw || typeof raw !== 'object') return [];

  const items: CrashHistoryItem[] = [];
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    const roundFromEntry =
      entry && typeof entry === 'object' && 'roundNumber' in entry
        ? Number((entry as Record<string, unknown>).roundNumber)
        : NaN;
    const roundNumber = Number.isFinite(roundFromEntry) ? roundFromEntry : Number(key);
    const crashPoint = extractCrashPointValue(entry);
    if (Number.isFinite(roundNumber) && crashPoint !== null) {
      items.push({ roundNumber, crashPoint });
    }
  }

  return items.sort((a, b) => b.roundNumber - a.roundNumber);
}

export function subscribeCrashEnabled(
  onStatus: (enabled: boolean) => void,
  onPermissionDenied: () => void,
): Unsubscribe {
  const db = getCrashDatabase();
  const enabledRef = ref(db, 'crash/enabled');
  return onValue(
    enabledRef,
    (snapshot) => {
      try {
        const val = snapshot.val();
        onStatus(val !== false);
      } catch {
        onStatus(true);
      }
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        onPermissionDenied();
      }
    },
  );
}

export function subscribeCrashCurrent(
  onData: (data: CrashCurrentData | null, isClosed: boolean) => void,
  onError: (err: Error, permissionDenied: boolean) => void,
): Unsubscribe {
  const db = getCrashDatabase();
  const currentRef = ref(db, 'crash/current');
  return onValue(
    currentRef,
    (snapshot) => {
      try {
        if (!snapshot.exists()) {
          onData(null, false);
          return;
        }
        const raw = snapshot.val();
        if (raw === false) {
          onData(null, true);
          return;
        }
        if (!raw || typeof raw !== 'object') {
          onData(null, false);
          return;
        }

        const val = raw as Record<string, unknown>;
        const roundNumber = Number(val.roundNumber);
        const crashPoint = Number(val.crashPoint);
        const phase = String(val.phase ?? '');

        if (!Number.isFinite(roundNumber)) {
          onData(null, false);
          return;
        }

        const parseOptNum = (v: unknown): number | undefined => {
          if (v === undefined || v === null || v === '') return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        };

        onData(
          {
            roundNumber,
            phase,
            crashPoint: Number.isFinite(crashPoint) ? Number(crashPoint.toFixed(2)) : 0,
            roundStartedAt: parseOptNum(val.roundStartedAt),
            flightStartedAt: parseOptNum(val.flightStartedAt),
            updatedAt: parseOptNum(val.updatedAt),
          },
          false,
        );
      } catch (err) {
        onError(
          err instanceof Error ? err : new Error('Invalid crash/current payload'),
          false,
        );
      }
    },
    (err) => {
      onError(err, isPermissionDeniedError(err));
    },
  );
}

export function subscribeCrashHistory(
  onData: (items: CrashHistoryItem[]) => void,
  onError?: (err: Error, permissionDenied: boolean) => void,
): Unsubscribe {
  const db = getCrashDatabase();
  const historyQuery = query(ref(db, 'crash/history'), orderByKey(), limitToLast(12));
  return onValue(
    historyQuery,
    (snapshot) => {
      try {
        onData(parseHistorySnapshot(snapshot));
      } catch (err) {
        onError?.(
          err instanceof Error ? err : new Error('Invalid crash/history payload'),
          false,
        );
      }
    },
    (err) => {
      onError?.(err, isPermissionDeniedError(err));
    },
  );
}
