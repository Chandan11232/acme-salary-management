"use client";

import { useEffect, useState } from "react";

import { BreakdownChart } from "@/components/dashboard/breakdown-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Select } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatCount, formatUsd, formatUsdCompact } from "@/lib/format";
import type { AnalyticsSummary } from "@/lib/types";
import { useReferenceData } from "@/lib/use-reference-data";

export function DashboardView() {
  const { departments, countries } = useReferenceData();
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [countryId, setCountryId] = useState<number | undefined>();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .summary({ departmentId, countryId }, controller.signal)
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err: Error) => err.name !== "AbortError" && setError(err.message));
    return () => controller.abort();
  }, [departmentId, countryId, reloadKey]);

  const value = (format: (v: number) => string, pick: (s: AnalyticsSummary) => number) => (summary ? format(pick(summary)) : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Compensation overview</h1>
          <p className="text-sm text-fg-muted">Current pay across ACME, normalised to annual USD.</p>
        </div>
        <div className="flex gap-2">
          <Select
            aria-label="Filter by department"
            className="w-44"
            value={departmentId ?? ""}
            onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by country"
            className="w-44"
            value={countryId ?? ""}
            onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.country_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Headcount" value={value(formatCount, (s) => s.headcount)} />
        <MetricCard
          label="Total payroll"
          value={value(formatUsdCompact, (s) => s.total_payroll_usd)}
          detail="Base salary + bonus, per year"
        />
        <MetricCard
          label="Average salary"
          value={value(formatUsd, (s) => s.avg_salary_usd)}
          detail={summary ? `Avg bonus ${formatUsd(summary.avg_bonus_usd)}` : undefined}
        />
        <MetricCard label="Median salary" value={value(formatUsd, (s) => s.median_salary_usd)} detail="Annual base salary" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownChart title="By department" rows={summary?.by_department ?? null} />
        <BreakdownChart title="By country" rows={summary?.by_country ?? null} />
      </div>
    </div>
  );
}
