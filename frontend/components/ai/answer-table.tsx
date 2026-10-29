import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount, formatUsd } from "@/lib/format";
import type { AIAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AnswerTable({ table, unit }: { table: NonNullable<AIAnswer["table"]>; unit: AIAnswer["unit"] }) {
  const format = (cell: string | number) => (typeof cell === "number" ? (unit === "count" ? formatCount(cell) : formatUsd(cell)) : cell);
  return (
    <div className="mt-3 overflow-hidden rounded-lg border bg-card">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {table.columns.map((column, i) => (
              <TableHead key={column} className={cn("h-8 px-3", i === table.columns.length - 1 && "text-right")}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, r) => (
            <TableRow key={r}>
              {row.map((cell, c) => (
                <TableCell key={c} className={cn("px-3 py-1.5", typeof cell === "number" && "text-right font-medium tabular-nums")}>
                  {format(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
