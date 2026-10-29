import { formatCount, formatUsd } from "@/lib/format";
import type { AIAnswer } from "@/lib/types";

export function AnswerTable({ table, unit }: { table: NonNullable<AIAnswer["table"]>; unit: AIAnswer["unit"] }) {
  const format = (cell: string | number) => (typeof cell === "number" ? (unit === "count" ? formatCount(cell) : formatUsd(cell)) : cell);
  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-line">
      <table className="w-full text-xs">
        <thead className="bg-surface-muted/60 text-left text-fg-muted">
          <tr>
            {table.columns.map((column, i) => (
              <th key={column} className={`px-3 py-2 font-medium ${i === table.columns.length - 1 ? "text-right" : ""}`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={`px-3 py-1.5 ${typeof cell === "number" ? "text-right font-medium tabular-nums" : ""}`}>
                  {format(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
