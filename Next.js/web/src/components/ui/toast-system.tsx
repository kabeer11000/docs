import { useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (
    title: string,
    description?: string,
    options?: Partial<Toast>,
  ) => addToast({ type: "success", title, description, ...options });

  const error = (
    title: string,
    description?: string,
    options?: Partial<Toast>,
  ) => addToast({ type: "error", title, description, ...options });

  const warning = (
    title: string,
    description?: string,
    options?: Partial<Toast>,
  ) => addToast({ type: "warning", title, description, ...options });

  const info = (
    title: string,
    description?: string,
    options?: Partial<Toast>,
  ) => addToast({ type: "info", title, description, ...options });

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
}
