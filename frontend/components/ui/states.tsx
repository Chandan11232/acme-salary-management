import type { ReactNode } from "react";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
      <span className="text-fg">
        <span className="mr-1.5 text-danger" aria-hidden>
          ⚠
        </span>
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium text-danger hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-5 py-12 text-center text-sm text-fg-muted">{children}</div>;
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-muted ${className}`} />;
}
