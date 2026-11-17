import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  CreditCard,
  Crown,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  APP_SETTINGS,
  GameKey,
  PlatformOption,
  WolfSession,
  getIdValidationError,
  isMasterCode,
  isSessionExpired,
  loadSession,
  saveSession,
  validateUserId,
} from '../config/appSettings';
import { useToast } from './ToastProvider';

const STANDARD_TTL_MS = 1_200_000; // 20 minutes
const MASTER_TTL_MS = 2_100_000; // 35 minutes
const SUBMIT_DELAY_MS = 2200;

interface ActivationScreenProps {
  selectedGame: GameKey;
  onBackToGames: () => void;
  onActivated: () => void;
}

const PlatformBadge: React.FC<{ platform: PlatformOption }> = () => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-[11px] font-black tracking-tighter text-white">
    BZ
  </div>
);

const LoadingOverlay: React.FC = () => (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-background/50 backdrop-blur-md"
    role="status"
    aria-label="جار الإرسال"
  >
    <div className="flex h-28 w-28 flex-col items-center justify-center gap-3 rounded-[22px] border border-hair bg-ink-2/90 shadow-lux backdrop-blur-2xl">
      <div className="relative h-9 w-9">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="ios-spinner-bar absolute left-1/2 top-0 h-[28%] w-[9%] -translate-x-1/2 rounded-full bg-foreground"
            style={{
              transform: `rotate(${i * 30}deg)`,
              transformOrigin: '50% 180%',
              animationDelay: `${-1.1 + i * 0.0917}s`,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold text-muted-foreground">جار الإرسال...</span>
    </div>
  </div>
);

const SuccessModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 p-6 backdrop-blur-xl">
    <div className="w-full max-w-[340px] rounded-[24px] border border-azure/40 bg-ink/95 p-6 text-center shadow-lux">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-azure/15 shadow-azure">
        <CheckCircle2 className="h-9 w-9 text-azure-soft" />
      </div>
      <h3 className="font-display text-xl font-black text-foreground">تم تفعيل حسابك بنجاح</h3>
      <p className="mt-2 text-[12px] text-muted-foreground">حسابك جاهز للدخول الآن.</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-12 w-full cursor-pointer rounded-xl bg-foreground font-display text-sm font-black text-background transition-all hover:opacity-90 active:scale-[0.98]"
      >
        دخول اللعبة
      </button>
    </div>
  </div>
);

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({
  onBackToGames,
  onActivated,
}) => {
  const toast = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption | null>(
    () => APP_SETTINGS.platforms[0] ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState('');
  const [userIdError, setUserIdError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [existingSession, setExistingSession] = useState<WolfSession | null>(null);

  useEffect(() => {
    const sess = loadSession();
    if (sess && !isSessionExpired(sess, Date.now())) {
      setExistingSession(sess);
    }
  }, []);

  const gameLabel = 'CRASH الطيارة';

  const handleCopyPromo = async () => {
    if (!selectedPlatform) return;
    const ok = await copyToClipboard(selectedPlatform.promoCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success('تم نسخ البروموكود بنجاح');
    } else {
      toast.error(`تعذر النسخ — البروموكود: ${selectedPlatform.promoCode}`);
    }
  };

  const handleSubmit = async () => {
    const trimmed = userId.trim();
    if (!validateUserId(trimmed)) {
      setUserIdError(true);
      toast.error(getIdValidationError());
      return;
    }
    if (!selectedPlatform) return;

    setSubmitting(true);
    const start = Date.now();
    try {
      const ttl = isMasterCode(trimmed) ? MASTER_TTL_MS : STANDARD_TTL_MS;
      const expiresAt = Date.now() + ttl;
      const elapsed = Date.now() - start;
      if (elapsed < SUBMIT_DELAY_MS) {
        await new Promise((r) => setTimeout(r, SUBMIT_DELAY_MS - elapsed));
      }
      saveSession({
        code: trimmed,
        expiresAt,
        platformId: selectedPlatform.id,
      });
      toast.success('تم تفعيل حسابك بنجاح');
      setShowSuccess(true);
    } catch {
      toast.error('تعذر إرسال الطلب، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wolf-conditions relative mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-24 pt-6">
      <button
        type="button"
        onClick={onBackToGames}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 self-start text-[11px] font-bold text-foreground/60 transition-colors hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة للألعاب</span>
      </button>

      {existingSession && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-azure/35 bg-azure/10 p-4 backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-azure-soft">
              <ShieldCheck className="h-4 w-4 shrink-0 text-azure" />
              <span>لديك تفعيل نشط حالياً</span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-foreground/80 tabular-nums" dir="ltr">
              ID: {existingSession.code}
            </p>
          </div>
          <button
            type="button"
            onClick={onActivated}
            className="wolf-cta shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap transition-all hover:brightness-110 active:scale-[0.98]"
          >
            دخول {gameLabel.split(' ')[0]}
          </button>
        </div>
      )}

      <div className="relative z-10 mb-8 text-center">
        <div className="mb-5 inline-flex items-center justify-center rounded-2xl border border-hair bg-ink-2 p-4 shadow-[0_0_30px_-8px_var(--azure)]">
          <Crown className="h-8 w-8 text-azure" />
        </div>
        <h2 className="mb-2 font-display text-3xl font-black tracking-tighter text-foreground">
          التفعيل مطلوب
        </h2>
        <p className="mx-auto max-w-[280px] text-sm font-medium leading-relaxed text-foreground/55">
          أكمل الخطوات التالية لتفعيل حسابك والحصول على كود الدخول للعبة{' '}
          <span className="font-bold text-azure-soft">{gameLabel}</span>
        </p>
      </div>

      <div className="relative z-10 mb-8 grid grid-cols-1 gap-3" dir="rtl" aria-label="اختيار المنصة">
        {APP_SETTINGS.platforms.map((platform) => {
          const isSelected = selectedPlatform?.id === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setSelectedPlatform(platform);
                setCopied(false);
                setUserId('');
                setUserIdError(false);
              }}
              className="platform-choice group relative flex h-[62px] min-w-0 cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-xl border border-hair px-3.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              <span
                className="platform-choice-name min-w-0 truncate font-display text-[13px] font-extrabold"
                dir="ltr"
              >
                {platform.name}
              </span>
              <span className="platform-logo flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-hair bg-ink p-0.5">
                <PlatformBadge platform={platform} />
              </span>
            </button>
          );
        })}
      </div>

      {selectedPlatform && (
        <div className="relative" dir="rtl">
          <div className="absolute bottom-12 left-[15px] top-5 w-[2px] bg-gradient-to-b from-azure via-ink-2 to-transparent" />

          {/* Step 1: Register with Promo Code */}
          <div className="group relative mb-8 pl-12">
            <div className="absolute left-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-hair bg-ink-2/80 shadow-lg transition-colors group-hover:border-azure">
              <User className="h-3.5 w-3.5 text-foreground/70 group-hover:text-azure" />
            </div>

            <div className="wolf-cond-card p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-hair bg-black/40 p-1">
                <PlatformBadge platform={selectedPlatform} />
              </div>
              <h3 className="mb-1 font-display text-base font-bold text-foreground">
                التسجيل بالبروموكود
              </h3>
              <p className="mb-4 text-xs leading-relaxed text-foreground/55">
                انسخ البروموكود واستخدمه أثناء التسجيل لربط حسابك بالسكربت
              </p>

              <button
                type="button"
                aria-label={`نسخ البروموكود ${selectedPlatform.promoCode}`}
                onClick={() => void handleCopyPromo()}
                className="group/btn relative w-full cursor-pointer overflow-hidden rounded-lg border border-dashed border-hair bg-ink/50 p-1 text-foreground transition-all hover:border-azure"
              >
                <div className="flex w-full items-center justify-between px-4 py-3">
                  <div className="flex flex-col text-start">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/50">
                      Promo Code
                    </span>
                    <span
                      className="font-mono text-lg font-black tracking-widest text-foreground transition-colors group-hover/btn:text-azure-soft"
                      dir="ltr"
                    >
                      {selectedPlatform.promoCode}
                    </span>
                  </div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                      copied
                        ? 'bg-azure text-white'
                        : 'bg-ink-3 text-foreground/70 group-hover/btn:bg-ink-2 group-hover/btn:text-foreground'
                    }`}
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              <a
                href={selectedPlatform.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="wolf-cta mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold tracking-wide shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <User className="h-4 w-4" />
                <span>التسجيل فى منصه {selectedPlatform.name}</span>
              </a>
            </div>
          </div>

          {/* Step 2: Minimum Activation Deposit */}
          <div className="group relative mb-8 pl-12">
            <div className="absolute left-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-hair bg-ink-2/80 shadow-lg transition-colors group-hover:border-azure">
              <CreditCard className="h-3.5 w-3.5 text-foreground/70 group-hover:text-azure" />
            </div>

            <div className="wolf-cond-card p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-hair bg-black/40 p-1">
                <PlatformBadge platform={selectedPlatform} />
              </div>
              <h3 className="mb-1 font-display text-base font-bold text-foreground">
                إيداع التفعيل
              </h3>
              <p className="mb-4 text-xs leading-relaxed text-foreground/55">
                الحد الأدنى للإيداع لتنشيط المحفظة وربط السكربت (الأموال تبقى في رصيدك)
              </p>

              <div className="grid grid-cols-2 gap-3" dir="ltr">
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-hair bg-ink-2/90 p-3 transition-colors hover:border-azure/35">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                    USD
                  </span>
                  <span className="font-display text-xl font-bold text-foreground tabular-nums">
                    ${selectedPlatform.depositUsd.toFixed(2)}
                  </span>
                </div>
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-hair bg-ink-2/90 p-3 transition-colors hover:border-azure/35">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                    جنيه مصري
                  </span>
                  <span className="font-display text-xl font-bold text-foreground tabular-nums">
                    {selectedPlatform.depositEgp}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Account Verification */}
          <div className="group relative pl-12">
            <div className="absolute left-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-hair bg-ink-2/80 shadow-lg transition-colors group-hover:border-azure">
              <ShieldCheck className="h-3.5 w-3.5 text-foreground/70 group-hover:text-azure" />
            </div>

            <div
              className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 ${
                userIdError
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-azure/25 bg-azure/5'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hair bg-black/40 p-1">
                    <PlatformBadge platform={selectedPlatform} />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    توثيق الحساب
                  </h3>
                </div>
                {userIdError && (
                  <div className="flex animate-pulse items-center gap-1.5 text-red-400">
                    <CircleAlert className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase">Required</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="wolf-player-id-input"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-foreground/70"
                >
                  الـ ID الخاص بك في {selectedPlatform.name}
                </label>
                <div className="relative">
                  <input
                    id="wolf-player-id-input"
                    type="tel"
                    inputMode="numeric"
                    value={userId}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      if (clean.length <= APP_SETTINGS.idMaxLength) {
                        setUserId(clean);
                      }
                      if (clean) setUserIdError(false);
                    }}
                    placeholder="ID: 1234567890"
                    maxLength={APP_SETTINGS.idMaxLength}
                    dir="ltr"
                    className={`w-full rounded-xl border bg-ink-2/70 px-4 py-3.5 pr-10 text-sm text-foreground tabular-nums transition-all placeholder:text-foreground/40 focus:outline-none ${
                      userIdError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-hair focus:border-azure'
                    }`}
                  />
                  <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="wolf-cta mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-4 font-display text-sm font-black tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                <span>إرسال التوثيق واستلام الكود</span>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && <LoadingOverlay />}
      {showSuccess && (
        <SuccessModal
          onClose={() => {
            setShowSuccess(false);
            onActivated();
          }}
        />
      )}
    </div>
  );
};
