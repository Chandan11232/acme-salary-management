"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-4">Effective</TableHead>
          <TableHead className="px-4 text-right">Base ({currency})</TableHead>
          <TableHead className="px-4">Frequency</TableHead>
          <TableHead className="px-4 text-right">Bonus ({currency})</TableHead>
          <TableHead className="px-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salaries.map((salary) => (
          <TableRow key={salary.id}>
            <TableCell className="px-4">
              <span className="mr-2">{formatDate(salary.effective_date)}</span>
              {salary.id === currentId && <Badge>Current</Badge>}
              {salary.effective_date > today && <Badge variant="outline">Scheduled</Badge>}
            </TableCell>
            <TableCell className="px-4 text-right tabular-nums">{formatMoney(salary.base_salary, currency)}</TableCell>
            <TableCell className="px-4 text-muted-foreground">{PAY_FREQUENCY_LABELS[salary.pay_frequency]}</TableCell>
            <TableCell className="px-4 text-right tabular-nums">{formatMoney(salary.bonus, currency)}</TableCell>
            <TableCell className="px-4 text-right">
              <Button size="icon-sm" variant="ghost" aria-label="Edit salary record" onClick={() => onEdit(salary)}>
                <PencilIcon />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete salary record" className="hover:text-destructive" onClick={() => onDelete(salary)}>
                <Trash2Icon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
