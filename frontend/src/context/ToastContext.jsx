import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

let _id = 0;

/**
 * ToastProvider – wrap your app (or just the layout) with this.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Add a toast.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} title
   * @param {string} [message]
   * @param {number} [duration] ms, 0 = persistent
   */
  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  // Convenience helpers
  const toast = {
    success: (title, message, opts) => addToast({ type: 'success', title, message, ...opts }),
    error:   (title, message, opts) => addToast({ type: 'error',   title, message, ...opts }),
    warning: (title, message, opts) => addToast({ type: 'warning', title, message, ...opts }),
    info:    (title, message, opts) => addToast({ type: 'info',    title, message, ...opts }),
    add:     addToast,
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * useToast – consume toast helpers anywhere inside ToastProvider.
 * @returns {{ success, error, warning, info, add, dismiss }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export default ToastContext;
