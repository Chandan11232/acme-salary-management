"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

type Tone = "success" | "error";
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const notify = useCallback(
    (tone: Tone, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all, { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-sm shadow-lg",
              toast.tone === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success",
            )}
          >
            <span aria-hidden>{toast.tone === "error" ? "⚠" : "✓"}</span>
            <span className="flex-1 text-fg">{toast.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="text-fg-subtle hover:text-fg">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used inside <ToastProvider>");
  return {
    success: (message: string) => notify("success", message),
    error: (message: string) => notify("error", message),
  };
}
