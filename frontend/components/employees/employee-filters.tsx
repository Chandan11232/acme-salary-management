"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/format";
import type { Country, Department, EmploymentType } from "@/lib/types";

export interface FilterState {
  search: string;
  departmentId?: number;
  countryId?: number;
  employmentType?: EmploymentType;
  minSalary: string;
  maxSalary: string;
}

export const EMPTY_FILTERS: FilterState = { search: "", minSalary: "", maxSalary: "" };

const toId = (value: string) => (value ? Number(value) : undefined);

export function EmployeeFilters({
  value,
  onChange,
  departments,
  countries,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  departments: Department[];
  countries: Country[];
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const isFiltered = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(8rem,1fr))_7rem_7rem_auto]">
      <Input
        type="search"
        aria-label="Search employees"
        placeholder="Search name, email, title…"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        className="col-span-2 md:col-span-1"
      />
      <Select aria-label="Department" value={value.departmentId ?? ""} onChange={(e) => set({ departmentId: toId(e.target.value) })}>
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <Select aria-label="Country" value={value.countryId ?? ""} onChange={(e) => set({ countryId: toId(e.target.value) })}>
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c.id} value={c.id}>
            {c.country_name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Employment type"
        value={value.employmentType ?? ""}
        onChange={(e) => set({ employmentType: (e.target.value || undefined) as EmploymentType | undefined })}
      >
        <option value="">All types</option>
        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        min={0}
        step={1000}
        aria-label="Minimum salary (USD)"
        placeholder="Min $"
        value={value.minSalary}
        onChange={(e) => set({ minSalary: e.target.value })}
      />
      <Input
        type="number"
        min={0}
        step={1000}
        aria-label="Maximum salary (USD)"
        placeholder="Max $"
        value={value.maxSalary}
        onChange={(e) => set({ maxSalary: e.target.value })}
      />
      <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)} disabled={!isFiltered}>
        Clear
      </Button>
    </div>
  );
}
