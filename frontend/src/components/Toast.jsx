import { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    border: 'border-green-400',
    iconColor: 'text-green-500',
    barColor: 'bg-green-500',
    titleColor: 'text-green-800',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-white',
    border: 'border-red-400',
    iconColor: 'text-red-500',
    barColor: 'bg-red-500',
    titleColor: 'text-red-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white',
    border: 'border-amber-400',
    iconColor: 'text-amber-500',
    barColor: 'bg-amber-500',
    titleColor: 'text-amber-800',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    border: 'border-blue-400',
    iconColor: 'text-blue-500',
    barColor: 'bg-blue-500',
    titleColor: 'text-blue-800',
  },
};

/**
 * Individual Toast item
 */
function ToastItem({ id, type = 'info', title, message, duration = 4000, onDismiss }) {
  const cfg = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
  const Icon = cfg.icon;
  const barRef = useRef(null);

  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => onDismiss(id), duration);

    // Animate progress bar
    if (barRef.current) {
      barRef.current.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        if (barRef.current) barRef.current.style.width = '0%';
      });
    }

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 w-80 max-w-full rounded-xl shadow-lg border-l-4 px-4 py-3.5 ${cfg.bg} ${cfg.border} overflow-hidden animate-toast-in`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold leading-tight ${cfg.titleColor}`}>{title}</p>
        )}
        {message && (
          <p className="text-sm text-gray-600 mt-0.5 leading-snug">{message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
          <div
            ref={barRef}
            className={`h-full ${cfg.barColor}`}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Toast container – renders all active toasts.
 * Place this once inside your app (ToastContext renders it automatically).
 */
export default function Toast({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 items-end"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
