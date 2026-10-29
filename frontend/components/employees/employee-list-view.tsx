"use client";

import { LayoutGridIcon, PlusIcon, TableIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorBanner } from "@/components/common/states";
import { EmployeeCard } from "@/components/employees/employee-card";
import { EmployeeFilters, EMPTY_FILTERS, type FilterState } from "@/components/employees/employee-filters";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Pagination } from "@/components/employees/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { EmployeeListItem, EmployeeQuery, Page, SortField, SortOrder } from "@/lib/types";
import { useDebounce } from "@/lib/use-debounce";
import { useReferenceData } from "@/lib/use-reference-data";

const parseAmount = (value: string) => (value.trim() === "" || Number.isNaN(Number(value)) ? undefined : Number(value));

type View = "table" | "cards";

/** Deep links, e.g. from the dashboard: /employees?department=3&country=2&view=cards */
function filtersFromUrl(params: URLSearchParams): FilterState {
  const ids = (key: string) => params.getAll(key).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return { ...EMPTY_FILTERS, departmentIds: ids("department"), countryIds: ids("country") };
}

export function EmployeeListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { departments, countries, error: referenceError } = useReferenceData();
  const [filters, setFilters] = useState<FilterState>(() => filtersFromUrl(searchParams));
  const [view, setView] = useState<View>(() => (searchParams.get("view") === "cards" ? "cards" : "table"));
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
      departmentIds: filters.departmentIds,
      countryIds: filters.countryIds,
      employmentTypes: filters.employmentTypes,
      minSalary: parseAmount(minSalary),
      maxSalary: parseAmount(maxSalary),
    }),
    [page, pageSize, sort, search, filters.departmentIds, filters.countryIds, filters.employmentTypes, minSalary, maxSalary],
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
    <div className="space-y-6">
      <PageHeader
        reference="B2"
        eyebrow="Employee directory"
        title="Everyone on payroll."
        description={data ? `${formatCount(data.total)} matching employees · open anyone for their salary history` : "Loading…"}
        actions={
          <>
            <ToggleGroup type="single" variant="outline" value={view} onValueChange={(next) => next && setView(next as View)} aria-label="View">
              <ToggleGroupItem value="table" aria-label="Table view" className="h-11 px-3">
                <TableIcon />
                Table
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Card view" className="h-11 px-3">
                <LayoutGridIcon />
                Cards
              </ToggleGroupItem>
            </ToggleGroup>
            <Button size="lg" className="h-11 px-4" onClick={() => setCreating(true)}>
              <PlusIcon />
              Add employee
            </Button>
          </>
        }
      />

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

      {view === "cards" && (
        <div className={loading && data ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {!data ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState>No employees match your filters.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          )}
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0 shadow-hard">
        {view === "table" && <EmployeeTable rows={data?.items ?? []} loading={loading} sortBy={sort.by} sortOrder={sort.order} onSort={toggleSort} />}
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
        <EmployeeFormDialog onClose={() => setCreating(false)} onSaved={(employee) => router.push(`/employees/${employee.id}`)} />
      )}
    </div>
  );
}
