import { CalendarClockIcon, TrendingUpIcon, WalletIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { annualBase, yearsBetween } from "@/lib/compensation";
import { formatUsd, todayIso } from "@/lib/format";
import type { EmployeeDetail } from "@/lib/types";

function Stat({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <Card className="shadow-hard-sm">
      <CardContent className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm rule bg-lilac text-[#1a1a17]">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="eyebrow text-[10px] text-muted-foreground">{label}</p>
          <p className="headline mt-1 text-2xl tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmployeeStats({ employee }: { employee: EmployeeDetail }) {
  const today = todayIso();
  const effective = employee.salaries.filter((s) => s.effective_date <= today).sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  const tenure = yearsBetween(employee.hire_date);
  const first = effective[0];
  const latest = effective[effective.length - 1];
  const growth = first && latest && first !== latest ? (annualBase(latest) / annualBase(first) - 1) * 100 : null;
  const scheduled = employee.salaries.length - effective.length;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <Stat icon={CalendarClockIcon} label="Tenure" value={tenure < 1 ? `${Math.max(1, Math.round(tenure * 12))} mo` : `${tenure.toFixed(1)} yrs`} detail="since hire date" />
      <Stat
        icon={TrendingUpIcon}
        label="Pay growth"
        value={growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
        detail={`${Math.max(effective.length - 1, 0)} change${effective.length === 2 ? "" : "s"} on record${scheduled ? ` · ${scheduled} scheduled` : ""}`}
      />
      <Stat
        icon={WalletIcon}
        label="Total comp"
        value={employee.current_compensation ? formatUsd(employee.current_compensation.total_comp_usd) : "—"}
        detail="base + bonus, annual USD"
      />
    </div>
  );
}
