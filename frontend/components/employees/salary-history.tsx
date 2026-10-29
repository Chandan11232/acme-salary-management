"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatMoney, PAY_FREQUENCY_LABELS, todayIso } from "@/lib/format";
import type { Salary } from "@/lib/types";

export function SalaryHistory({
  salaries,
  currency,
  onEdit,
  onDelete,
}: {
  salaries: Salary[];
  currency: string;
  onEdit: (salary: Salary) => void;
  onDelete: (salary: Salary) => void;
}) {
  if (salaries.length === 0) return <EmptyState>No salary records yet.</EmptyState>;
  const today = todayIso();
  // Salaries arrive newest first; the current one is the first not dated in the future.
  const currentId = salaries.find((s) => s.effective_date <= today)?.id;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs text-fg-muted">
          <tr>
            <th className="px-5 py-2 font-medium">Effective</th>
            <th className="px-5 py-2 text-right font-medium">Base ({currency})</th>
            <th className="px-5 py-2 font-medium">Frequency</th>
            <th className="px-5 py-2 text-right font-medium">Bonus ({currency})</th>
            <th className="px-5 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {salaries.map((salary) => (
            <tr key={salary.id}>
              <td className="px-5 py-2.5">
                <span className="mr-2">{formatDate(salary.effective_date)}</span>
                {salary.id === currentId && <Badge tone="success">Current</Badge>}
                {salary.effective_date > today && <Badge tone="accent">Scheduled</Badge>}
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(salary.base_salary, currency)}</td>
              <td className="px-5 py-2.5 text-fg-muted">{PAY_FREQUENCY_LABELS[salary.pay_frequency]}</td>
              <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(salary.bonus, currency)}</td>
              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => onEdit(salary)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(salary)} className="hover:text-danger">
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
