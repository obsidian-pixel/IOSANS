/**
 * Toast Notification System
 * Zustand store and component for toast messages
 */
import { create } from "zustand";
import { memo } from "react";
import "./Toast.css";

// Toast store
export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (message, type = "info", duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const toast = { id, message, type, duration };

    set({ toasts: [...get().toasts, toast] });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  // Convenience methods
  success: (message, duration) => get().addToast(message, "success", duration),
  error: (message, duration) =>
    get().addToast(message, "error", duration ?? 5000),
  warning: (message, duration) => get().addToast(message, "warning", duration),
  info: (message, duration) => get().addToast(message, "info", duration),
}));

// Toast component
function Toast({ message, type, onClose }) {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

// Toast container component
function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default memo(ToastContainer);
