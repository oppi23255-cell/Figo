import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value: ToastContextValue = {
    success: useCallback((msg: string) => push('success', msg), [push]),
    error: useCallback((msg: string) => push('error', msg), [push]),
    info: useCallback((msg: string) => push('info', msg), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold shadow-lux backdrop-blur-xl ${
                t.kind === 'error'
                  ? 'border-red-500/40 bg-ink-2/95 text-red-200'
                  : t.kind === 'success'
                    ? 'border-emerald-400/40 bg-ink-2/95 text-emerald-100'
                    : 'border-azure/40 bg-ink-2/95 text-foreground'
              }`}
            >
              {t.kind === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {t.kind === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
              {t.kind === 'info' && <Info className="h-4 w-4 shrink-0 text-azure-soft" />}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
