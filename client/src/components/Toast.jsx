import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';

/* ─── Toast Context ─── */
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration, exiting: false }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320);
  }, []);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);

  const api = { toast: addToast, success, error, warning, info };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/* ─── Toast Container ─── */
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

/* ─── Single Toast ─── */
function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const icons = {
    success: <FiCheckCircle />,
    error: <FiXCircle />,
    warning: <FiAlertTriangle />,
    info: <FiInfo />,
  };

  return (
    <div className={`toast-item toast-${toast.type} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <FiX />
      </button>
      <div className="toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
    </div>
  );
}
