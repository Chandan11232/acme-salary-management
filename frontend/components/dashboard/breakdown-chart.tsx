"use client";

import { useState } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/common/states";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCount, formatUsd, formatUsdCompact } from "@/lib/format";
import type { GroupBreakdown } from "@/lib/types";

type MeasureKey = "total_payroll_usd" | "avg_salary_usd" | "headcount";

const MEASURES: { key: MeasureKey; label: string; format: (v: number) => string }[] = [
  { key: "total_payroll_usd", label: "Payroll", format: formatUsdCompact },
  { key: "avg_salary_usd", label: "Avg salary", format: (v) => formatUsdCompact(v) },
  { key: "headcount", label: "Headcount", format: formatCount },
];

const CONFIG = { value: { label: "Value", color: "var(--chart-bar)" } } satisfies ChartConfig;

function BreakdownTooltip({ active, payload }: { active?: boolean; payload?: { payload: GroupBreakdown }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-sm rule bg-popover px-3 py-2 text-xs shadow-hard-sm">
      <p className="mb-1 font-display text-sm font-bold">{row.name}</p>
      {[
        ["Headcount", formatCount(row.headcount)],
        ["Avg salary", formatUsd(row.avg_salary_usd)],
        ["Payroll", formatUsd(row.total_payroll_usd)],
      ].map(([label, value]) => (
        <p key={label} className="flex justify-between gap-6 text-muted-foreground">
          {label} <span className="font-medium text-foreground tabular-nums">{value}</span>
        </p>
      ))}
    </div>
  );
}

/** Single-series horizontal bar chart (shadcn Chart + Recharts), direct-labelled so no legend is needed. */
export function BreakdownChart({ title, rows }: { title: string; rows: GroupBreakdown[] | null }) {
  const [measureKey, setMeasureKey] = useState<MeasureKey>("total_payroll_usd");
  const measure = MEASURES.find((m) => m.key === measureKey)!;
  const data = rows ? [...rows].sort((a, b) => b[measureKey] - a[measureKey]) : null;

  return (
    <Card className="shadow-hard">
      <CardHeader>
        <CardTitle className="font-display text-xl font-bold tracking-[-0.03em]">{title}</CardTitle>
        <CardDescription>Current annual pay, USD · hover a bar for detail</CardDescription>
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
        {data === null ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <EmptyState>No employees match these filters.</EmptyState>
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height: Math.max(180, data.length * 38) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 64, top: 0, bottom: 0 }} barCategoryGap={8}>
              <XAxis type="number" dataKey={measureKey} hide />
              <YAxis type="category" dataKey="name" width={136} tickLine={false} interval={0} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<BreakdownTooltip />} />
              <Bar dataKey={measureKey} fill="var(--color-value)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey={measureKey}
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(value: unknown) => measure.format(Number(value))}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
