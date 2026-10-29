"use client";

import { useEffect, useState } from "react";

import { OptionSelect } from "@/components/common/option-select";
import { PageHeader } from "@/components/common/page-header";
import { ErrorBanner } from "@/components/common/states";
import { AskCta } from "@/components/dashboard/ask-cta";
import { BreakdownChart } from "@/components/dashboard/breakdown-chart";
import { InsightStrip } from "@/components/dashboard/insight-strip";
import { MetricCard, MetricGrid } from "@/components/dashboard/metric-card";
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

  const filters = (
    <>
      <OptionSelect
        label="Filter by department"
        allLabel="All departments"
        className="w-44"
        value={departmentId}
        options={departments.map((d) => ({ value: d.id, label: d.name }))}
        onChange={setDepartmentId}
      />
      <OptionSelect
        label="Filter by country"
        allLabel="All countries"
        className="w-44"
        value={countryId}
        options={countries.map((c) => ({ value: c.id, label: c.country_name }))}
        onChange={setCountryId}
      />
    </>
  );

  return (
    <div className="space-y-10">
      <PageHeader
        reference="A1"
        eyebrow="Compensation overview"
        title={
          <>
            How ACME <span className="text-orange">pays</span> people.
          </>
        }
        description="Current pay for every employee, normalised to annual USD so countries compare like for like."
        actions={filters}
      />

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <MetricGrid>
        <MetricCard index={1} label="Headcount" value={value(formatCount, (s) => s.headcount)} detail="Employees in scope" />
        <MetricCard index={2} label="Total payroll" value={value(formatUsdCompact, (s) => s.total_payroll_usd)} detail="Base salary + bonus, per year" />
        <MetricCard
          index={3}
          label="Average salary"
          value={value(formatUsd, (s) => s.avg_salary_usd)}
          detail={summary ? `Avg bonus ${formatUsd(summary.avg_bonus_usd)}` : undefined}
        />
        <MetricCard index={4} label="Median salary" value={value(formatUsd, (s) => s.median_salary_usd)} detail="Annual base salary" />
      </MetricGrid>

      {summary && summary.headcount > 0 && <InsightStrip summary={summary} />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <BreakdownChart title="By department" rows={summary?.by_department ?? null} />
        <BreakdownChart title="By country" rows={summary?.by_country ?? null} />
      </div>

      <AskCta />
    </div>
  );
}
