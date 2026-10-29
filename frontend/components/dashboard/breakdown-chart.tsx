"use client";

import { useState } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { formatCount, formatUsd, formatUsdCompact } from "@/lib/format";
import type { GroupBreakdown } from "@/lib/types";

type MeasureKey = "total_payroll_usd" | "avg_salary_usd" | "headcount";

const MEASURES: { key: MeasureKey; label: string; format: (v: number) => string }[] = [
  { key: "total_payroll_usd", label: "Payroll", format: formatUsdCompact },
  { key: "avg_salary_usd", label: "Avg salary", format: formatUsd },
  { key: "headcount", label: "Headcount", format: formatCount },
];

/** Single-series horizontal bar chart; values are direct-labelled, so no legend is needed. */
export function BreakdownChart({ title, rows }: { title: string; rows: GroupBreakdown[] | null }) {
  const [measureKey, setMeasureKey] = useState<MeasureKey>("total_payroll_usd");
  const measure = MEASURES.find((m) => m.key === measureKey)!;
  const sorted = rows ? [...rows].sort((a, b) => b[measureKey] - a[measureKey]) : null;
  const max = Math.max(1, ...(sorted ?? []).map((r) => r[measureKey]));

  return (
    <Card>
      <CardHeader
        title={title}
        description="Current annual pay, USD"
        action={
          <div role="radiogroup" aria-label="Measure" className="flex rounded-md border border-line p-0.5">
            {MEASURES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={m.key === measureKey}
                onClick={() => setMeasureKey(m.key)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium",
                  m.key === measureKey ? "bg-accent-soft text-accent" : "text-fg-muted hover:text-fg",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-5 py-4">
        {sorted === null ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState>No employees match these filters.</EmptyState>
        ) : (
          <ul className="space-y-1">
            {sorted.map((row) => (
              <li key={row.id} className="group relative grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3 rounded py-1.5 hover:bg-surface-muted/60">
                <span className="truncate text-sm text-fg-muted" title={row.name}>
                  {row.name}
                </span>
                <div className="h-3 rounded-r bg-chart-track">
                  <div
                    className="h-full rounded-r-[4px] bg-chart-bar transition-[width] duration-300"
                    style={{ width: `${(row[measureKey] / max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-medium tabular-nums">{measure.format(row[measureKey])}</span>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-36 z-10 mt-1 hidden rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg group-hover:block"
                >
                  <p className="mb-1 font-semibold">{row.name}</p>
                  <p className="text-fg-muted">
                    Headcount <span className="font-medium text-fg tabular-nums">{formatCount(row.headcount)}</span>
                  </p>
                  <p className="text-fg-muted">
                    Avg salary <span className="font-medium text-fg tabular-nums">{formatUsd(row.avg_salary_usd)}</span>
                  </p>
                  <p className="text-fg-muted">
                    Payroll <span className="font-medium text-fg tabular-nums">{formatUsd(row.total_payroll_usd)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
