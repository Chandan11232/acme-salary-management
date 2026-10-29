"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatUsd } from "@/lib/format";
import type { EmployeeListItem, SortField, SortOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const open = (id: number) => router.push(`/employees/${id}`);

  return (
    <>
      <Table className={cn("transition-opacity", loading && rows.length > 0 && "opacity-60")}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((col) => {
              const active = sortBy === col.key;
              const Icon = active ? (sortOrder === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;
              return (
                <TableHead
                  key={col.key}
                  aria-sort={active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("px-4", col.className)}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn("inline-flex items-center gap-1 text-xs hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}
                  >
                    {col.label}
                    <Icon className={cn("size-3", !active && "opacity-50")} />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0
            ? Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS.length} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : rows.map((employee) => (
                <TableRow
                  key={employee.id}
                  tabIndex={0}
                  onClick={() => open(employee.id)}
                  onKeyDown={(e) => e.key === "Enter" && open(employee.id)}
                  className="cursor-pointer focus-visible:bg-accent focus-visible:outline-none"
                >
                  <TableCell className="px-4">
                    <div className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                  </TableCell>
                  <TableCell className="hidden px-4 md:table-cell">
                    <div>{employee.job_title}</div>
                    {employee.employment_type !== "FULL_TIME" && (
                      <Badge variant="secondary" className="mt-0.5">
                        {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4">{employee.department.name}</TableCell>
                  <TableCell className="hidden px-4 sm:table-cell">{employee.country.country_name}</TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground lg:table-cell">{formatDate(employee.hire_date)}</TableCell>
                  <TableCell className="px-4 text-right font-medium tabular-nums">
                    {employee.current_compensation ? (
                      formatUsd(employee.current_compensation.annual_base_usd)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {!loading && rows.length === 0 && <EmptyState>No employees match your filters.</EmptyState>}
    </>
  );
}
