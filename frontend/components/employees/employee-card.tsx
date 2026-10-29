import { CalendarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, formatUsd } from "@/lib/format";
import type { EmployeeListItem } from "@/lib/types";

export function EmployeeCard({ employee }: { employee: EmployeeListItem }) {
  const comp = employee.current_compensation;
  return (
    <Link href={`/employees/${employee.id}`} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange">
      <Card className="h-full gap-4 shadow-hard-sm transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0_var(--orange)]">
        <CardHeader className="flex flex-row items-center gap-3">
          <EmployeeAvatar firstName={employee.first_name} lastName={employee.last_name} departmentId={employee.department.id} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold tracking-[-0.02em]">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{employee.job_title}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-ink">
              {employee.department.code}
            </Badge>
            {employee.employment_type !== "FULL_TIME" && <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Badge>}
          </div>
          <div>
            <p className="headline text-2xl tabular-nums">{comp ? formatUsd(comp.annual_base_usd) : "—"}</p>
            <p className="text-xs text-muted-foreground">
              {comp && comp.currency_code !== "USD" ? `${formatMoney(comp.base_salary, comp.currency_code)} ${comp.pay_frequency.toLowerCase()}` : "annual base, USD"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2 border-ink/15 bg-transparent text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {employee.country.country_name}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            {formatDate(employee.hire_date)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
