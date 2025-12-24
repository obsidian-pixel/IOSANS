import { create } from "zustand";

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
