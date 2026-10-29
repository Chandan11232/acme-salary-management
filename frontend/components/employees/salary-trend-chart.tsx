"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/common/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { annualBase } from "@/lib/compensation";
import { formatDate, formatMoney } from "@/lib/format";
import type { Salary } from "@/lib/types";

const CONFIG = { annual: { label: "Annual base", color: "var(--chart-bar)" } } satisfies ChartConfig;

/** Step line of annualised base pay (local currency) across the salary history. */
export function SalaryTrendChart({ salaries, currency }: { salaries: Salary[]; currency: string }) {
  const points = [...salaries]
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
    .map((s) => ({ date: s.effective_date, annual: annualBase(s), bonus: s.bonus }));
  const compact = new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });

  return (
    <Card className="shadow-hard">
      <CardHeader>
        <CardTitle className="font-display text-xl font-bold tracking-[-0.03em]">Salary trend</CardTitle>
        <CardDescription>Annualised base pay in {currency}, by effective date</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <EmptyState>Only one salary record so far — the trend appears after the first change.</EmptyState>
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto h-[220px] w-full">
            <LineChart data={points} margin={{ left: 4, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d: string) => d.slice(0, 7)} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => compact.format(v)} fontSize={11} domain={["dataMin * 0.95", "dataMax * 1.02"]} />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as (typeof points)[number];
                  return (
                    <div className="rounded-sm rule bg-popover px-3 py-2 text-xs shadow-hard-sm">
                      <p className="eyebrow mb-1 text-[10px] text-muted-foreground">{formatDate(point.date)}</p>
                      <p className="font-display text-sm font-bold">{formatMoney(point.annual, currency)}</p>
                      <p className="text-muted-foreground">Bonus {formatMoney(point.bonus, currency)}</p>
                    </div>
                  );
                }}
              />
              <Line type="stepAfter" dataKey="annual" stroke="var(--color-annual)" strokeWidth={2} dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
