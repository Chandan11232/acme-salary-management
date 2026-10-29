"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatUsd } from "@/lib/format";
import type { EmployeeListItem, SortField, SortOrder } from "@/lib/types";

const COLUMNS: { key: SortField; label: string; className?: string }[] = [
  { key: "last_name", label: "Name" },
  { key: "job_title", label: "Job title", className: "hidden md:table-cell" },
  { key: "department", label: "Department" },
  { key: "country", label: "Country", className: "hidden sm:table-cell" },
  { key: "hire_date", label: "Hired", className: "hidden lg:table-cell" },
  { key: "salary", label: "Base salary (USD)", className: "text-right" },
];

export function EmployeeTable({
  rows,
  loading,
  sortBy,
  sortOrder,
  onSort,
}: {
  rows: EmployeeListItem[];
  loading: boolean;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const router = useRouter();

  return (
    <div className="relative overflow-x-auto">
      <table className={cn("w-full text-sm transition-opacity", loading && rows.length > 0 && "opacity-60")}>
        <thead className="border-b border-line bg-surface-muted/50 text-left text-xs text-fg-muted">
          <tr>
            {COLUMNS.map((col) => {
              const active = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("px-4 py-2.5 font-medium", col.className)}
                >
                  <button type="button" onClick={() => onSort(col.key)} className={cn("inline-flex items-center gap-1 hover:text-fg", active && "text-fg")}>
                    {col.label}
                    <span aria-hidden className="text-[10px]">
                      {active ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading && rows.length === 0
            ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={COLUMNS.length} className="px-4 py-3">
                    <Skeleton />
                  </td>
                </tr>
              ))
            : rows.map((employee) => (
                <tr
                  key={employee.id}
                  tabIndex={0}
                  onClick={() => router.push(`/employees/${employee.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/employees/${employee.id}`)}
                  className="cursor-pointer hover:bg-surface-muted/60 focus-visible:bg-accent-soft focus-visible:outline-none"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </div>
                    <div className="text-xs text-fg-subtle">{employee.email}</div>
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    <div>{employee.job_title}</div>
                    {employee.employment_type !== "FULL_TIME" && <Badge>{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Badge>}
                  </td>
                  <td className="px-4 py-2.5">{employee.department.name}</td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">{employee.country.country_name}</td>
                  <td className="hidden px-4 py-2.5 text-fg-muted lg:table-cell">{formatDate(employee.hire_date)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {employee.current_compensation ? formatUsd(employee.current_compensation.annual_base_usd) : <span className="text-fg-subtle">—</span>}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && <EmptyState>No employees match your filters.</EmptyState>}
    </div>
  );
}
