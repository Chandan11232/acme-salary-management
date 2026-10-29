"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        <TableRow className="border-b-[1.5px] border-ink bg-muted/60 hover:bg-muted/60">
          <TableHead className="eyebrow px-4 text-[10px] text-muted-foreground">Effective</TableHead>
          <TableHead className="eyebrow px-4 text-[10px] text-muted-foreground text-right">Base ({currency})</TableHead>
          <TableHead className="eyebrow px-4 text-[10px] text-muted-foreground">Frequency</TableHead>
          <TableHead className="eyebrow px-4 text-[10px] text-muted-foreground text-right">Bonus ({currency})</TableHead>
          <TableHead className="eyebrow px-4 text-[10px] text-muted-foreground">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salaries.map((salary) => (
          <TableRow key={salary.id}>
            <TableCell className="px-4">
              <span className="mr-2">{formatDate(salary.effective_date)}</span>
              {salary.id === currentId && <Badge className="bg-orange text-[#1a1a17]">Current</Badge>}
              {salary.effective_date > today && <Badge variant="outline">Scheduled</Badge>}
            </TableCell>
            <TableCell className="px-4 text-right tabular-nums">{formatMoney(salary.base_salary, currency)}</TableCell>
            <TableCell className="px-4 text-muted-foreground">{PAY_FREQUENCY_LABELS[salary.pay_frequency]}</TableCell>
            <TableCell className="px-4 text-right tabular-nums">{formatMoney(salary.bonus, currency)}</TableCell>
            <TableCell className="px-4 text-right">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="Edit salary record" onClick={() => onEdit(salary)}>
                    <PencilIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit record</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="Delete salary record" className="hover:text-destructive" onClick={() => onDelete(salary)}>
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete record</TooltipContent>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
