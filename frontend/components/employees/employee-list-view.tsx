"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmployeeFilters, EMPTY_FILTERS, type FilterState } from "@/components/employees/employee-filters";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Pagination } from "@/components/employees/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { EmployeeListItem, EmployeeQuery, Page, SortField, SortOrder } from "@/lib/types";
import { useDebounce } from "@/lib/use-debounce";
import { useReferenceData } from "@/lib/use-reference-data";

const parseAmount = (value: string) => (value.trim() === "" || Number.isNaN(Number(value)) ? undefined : Number(value));

export function EmployeeListView() {
  const router = useRouter();
  const { departments, countries, error: referenceError } = useReferenceData();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ by: SortField; order: SortOrder }>({ by: "last_name", order: "asc" });
  const [data, setData] = useState<Page<EmployeeListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);

  // Free-text inputs are debounced so typing doesn't fire a request per keystroke.
  const search = useDebounce(filters.search);
  const minSalary = useDebounce(filters.minSalary);
  const maxSalary = useDebounce(filters.maxSalary);

  const query = useMemo<EmployeeQuery>(
    () => ({
      page,
      pageSize,
      sortBy: sort.by,
      sortOrder: sort.order,
      search,
      departmentId: filters.departmentId,
      countryId: filters.countryId,
      employmentType: filters.employmentType,
      minSalary: parseAmount(minSalary),
      maxSalary: parseAmount(maxSalary),
    }),
    [page, pageSize, sort, search, filters.departmentId, filters.countryId, filters.employmentType, minSalary, maxSalary],
  );

  useEffect(() => {
    const controller = new AbortController();
    api
      .employees(query, controller.signal)
      .then((result) => {
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  function updateFilters(next: FilterState) {
    setFilters(next);
    setPage(1);
    setLoading(true);
  }

  function toggleSort(field: SortField) {
    setSort((prev) => ({ by: field, order: prev.by === field && prev.order === "asc" ? "desc" : field === "salary" ? "desc" : "asc" }));
    setPage(1);
    setLoading(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-fg-muted">{data ? `${formatCount(data.total)} matching employees` : "Loading…"}</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Add employee</Button>
      </div>

      <EmployeeFilters value={filters} onChange={updateFilters} departments={departments} countries={countries} />

      {(error || referenceError) && (
        <ErrorBanner
          message={error ?? referenceError ?? ""}
          onRetry={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <Card className="overflow-hidden">
        <EmployeeTable rows={data?.items ?? []} loading={loading} sortBy={sort.by} sortOrder={sort.order} onSort={toggleSort} />
        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            pageSize={pageSize}
            onPageChange={(next) => {
              setPage(next);
              setLoading(true);
            }}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
              setLoading(true);
            }}
          />
        )}
      </Card>

      {creating && (
        <EmployeeFormDialog open onClose={() => setCreating(false)} onSaved={(employee) => router.push(`/employees/${employee.id}`)} />
      )}
    </div>
  );
}
