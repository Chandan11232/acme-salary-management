"use client";

import { useState } from "react";

import { EmptyState } from "@/components/common/states";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <Card className="shadow-hard">
      <CardHeader>
        <CardTitle className="font-display text-xl font-bold tracking-[-0.03em]">{title}</CardTitle>
        <CardDescription>Current annual pay, USD</CardDescription>
        <CardAction>
          <Tabs value={measureKey} onValueChange={(value) => setMeasureKey(value as MeasureKey)}>
            <TabsList>
              {MEASURES.map((m) => (
                <TabsTrigger key={m.key} value={m.key} className="text-xs">
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
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
              <li key={row.id} className="group relative grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3 rounded py-1.5 hover:bg-muted">
                <span className="truncate text-sm text-muted-foreground" title={row.name}>
                  {row.name}
                </span>
                <div className="h-3 rounded-r-sm bg-chart-track">
                  <div
                    className="h-full rounded-r-[4px] border-r-2 border-card bg-chart-bar transition-[width] duration-300"
                    style={{ width: `${(row[measureKey] / max) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-medium tabular-nums">{measure.format(row[measureKey])}</span>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-36 z-10 mt-1 hidden rounded-sm rule bg-popover px-3 py-2 text-xs text-popover-foreground shadow-hard-sm group-hover:block"
                >
                  <p className="mb-1 font-semibold">{row.name}</p>
                  <p className="text-muted-foreground">
                    Headcount <span className="font-medium text-foreground tabular-nums">{formatCount(row.headcount)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Avg salary <span className="font-medium text-foreground tabular-nums">{formatUsd(row.avg_salary_usd)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Payroll <span className="font-medium text-foreground tabular-nums">{formatUsd(row.total_payroll_usd)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
