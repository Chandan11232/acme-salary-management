import { formatCount, formatUsd } from "@/lib/format";
import type { AIAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Result rows rendered on the dark answer panel. */
export function AnswerTable({ table, unit }: { table: NonNullable<AIAnswer["table"]>; unit: AIAnswer["unit"] }) {
  const format = (cell: string | number) => (typeof cell === "number" ? (unit === "count" ? formatCount(cell) : formatUsd(cell)) : cell);
  const last = table.columns.length - 1;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#fffef8]/20 text-left">
            {table.columns.map((column, i) => (
              <th key={column} className={cn("eyebrow py-2 pr-4 text-[10px] font-semibold text-[#fffef8]/55", i === last && "pr-0 text-right")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-b border-[#fffef8]/10 last:border-0">
              {row.map((cell, c) => (
                <td key={c} className={cn("py-2 pr-4", c === last && "pr-0 text-right font-medium tabular-nums", c === 0 && "text-[#fffef8]")}>
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
