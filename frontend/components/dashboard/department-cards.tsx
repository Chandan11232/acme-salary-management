import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatUsd, formatUsdCompact } from "@/lib/format";
import type { Department, GroupBreakdown } from "@/lib/types";

/** One card per department: headcount, average salary and share of payroll; links to the filtered directory. */
export function DepartmentCards({ rows, departments, totalPayroll }: { rows: GroupBreakdown[] | null; departments: Department[]; totalPayroll: number }) {
  if (rows === null) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }
  const codes = new Map(departments.map((d) => [d.id, d.code]));

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row, i) => {
        const share = totalPayroll > 0 ? (row.total_payroll_usd / totalPayroll) * 100 : 0;
        return (
          <Link key={row.id} href={`/employees?department=${row.id}`} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange">
            <Card className="h-full gap-3 shadow-hard-sm transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0_var(--orange)]">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <p className="eyebrow text-[10px] text-orange-deep">{String(i + 1).padStart(2, "0")}</p>
                  <CardTitle className="mt-1 font-display text-lg font-bold tracking-[-0.03em]">{row.name}</CardTitle>
                </div>
                <Badge variant="outline" className="border-ink">
                  {codes.get(row.id) ?? "—"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="headline text-3xl tabular-nums">{formatUsdCompact(row.avg_salary_usd)}</p>
                    <p className="text-xs text-muted-foreground">avg base salary</p>
                  </div>
                  <p className="text-right text-sm font-medium tabular-nums">
                    {formatCount(row.headcount)}
                    <span className="block text-xs font-normal text-muted-foreground">people</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Progress value={share} aria-label={`${share.toFixed(1)}% of payroll`} />
                  <p className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {share.toFixed(1)}% of payroll · {formatUsd(row.total_payroll_usd)}
                    </span>
                    <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
