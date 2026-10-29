import { formatUsdCompact } from "@/lib/format";
import type { AnalyticsSummary } from "@/lib/types";

/** Full-bleed orange band with the headline facts, derived from the current summary. */
export function InsightStrip({ summary }: { summary: AnalyticsSummary }) {
  const top = summary.by_department[0];
  const share = top && summary.total_payroll_usd > 0 ? (top.total_payroll_usd / summary.total_payroll_usd) * 100 : 0;
  const skew = summary.median_salary_usd > 0 ? ((summary.avg_salary_usd - summary.median_salary_usd) / summary.median_salary_usd) * 100 : 0;

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 border-y-[1.5px] border-ink bg-orange text-[#1a1a17]">
      <div className="mx-auto grid w-[min(1240px,calc(100%-32px))] items-center gap-6 py-8 md:grid-cols-[1.1fr_1.6fr_auto]">
        <p className="headline text-[clamp(1.6rem,2.6vw,2.1rem)] leading-[1.02]">
          {top ? (
            <>
              {top.name} is {share.toFixed(1)}%
              <br />
              of payroll.
            </>
          ) : (
            "No payroll yet."
          )}
        </p>
        <p className="max-w-xl text-[15px] leading-relaxed">
          Median base salary is <strong>{formatUsdCompact(summary.median_salary_usd)}</strong>; the average sits{" "}
          {Math.abs(skew) < 1 ? "right on it" : `${Math.abs(skew).toFixed(0)}% ${skew > 0 ? "higher" : "lower"}`}
          {skew > 1 ? ", pulled up by the highest earners." : "."}
        </p>
        <p className="eyebrow">Headcount → Payroll → Median</p>
      </div>
    </section>
  );
}
