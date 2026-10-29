import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

const TONES = {
  neutral: "bg-surface-muted text-fg-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
