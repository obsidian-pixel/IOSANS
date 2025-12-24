/**
 * Toast Notification System
 * Zustand store and component for toast messages
 */
// import { create } from "zustand"; // Removed unused
import { memo } from "react";
import "./Toast.css";

// Toast store
import { useToastStore } from "../../store/toastStore";

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
