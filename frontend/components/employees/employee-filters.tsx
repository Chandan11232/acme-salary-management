"use client";

import { FilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { FormField } from "@/components/common/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EMPLOYMENT_TYPE_LABELS, formatUsd } from "@/lib/format";
import type { Country, Department, EmploymentType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FilterState {
  search: string;
  departmentIds: number[];
  countryIds: number[];
  employmentTypes: EmploymentType[];
  minSalary: string;
  maxSalary: string;
}

export const EMPTY_FILTERS: FilterState = { search: "", departmentIds: [], countryIds: [], employmentTypes: [], minSalary: "", maxSalary: "" };

type DrawerFilters = Omit<FilterState, "search">;

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function ChipGroup<T extends string | number>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Search box inline; everything else in a drawer with multi-select chips and removable active-filter badges. */
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DrawerFilters>(value);

  const active: { key: string; label: string; remove: () => void }[] = [
    ...value.departmentIds.map((id) => ({
      key: `d${id}`,
      label: departments.find((d) => d.id === id)?.name ?? `Department ${id}`,
      remove: () => onChange({ ...value, departmentIds: value.departmentIds.filter((x) => x !== id) }),
    })),
    ...value.countryIds.map((id) => ({
      key: `c${id}`,
      label: countries.find((c) => c.id === id)?.country_name ?? `Country ${id}`,
      remove: () => onChange({ ...value, countryIds: value.countryIds.filter((x) => x !== id) }),
    })),
    ...value.employmentTypes.map((type) => ({
      key: type,
      label: EMPLOYMENT_TYPE_LABELS[type],
      remove: () => onChange({ ...value, employmentTypes: value.employmentTypes.filter((x) => x !== type) }),
    })),
    ...(value.minSalary || value.maxSalary
      ? [
          {
            key: "salary",
            label: `${value.minSalary ? formatUsd(Number(value.minSalary)) : "$0"} – ${value.maxSalary ? formatUsd(Number(value.maxSalary)) : "any"}`,
            remove: () => onChange({ ...value, minSalary: "", maxSalary: "" }),
          },
        ]
      : []),
  ];

  function openDrawer(next: boolean) {
    if (next) setDraft(value);
    setOpen(next);
  }

  function apply() {
    onChange({ ...value, ...draft });
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search employees"
            placeholder="Search name, email or job title…"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="h-9 pl-8"
          />
        </div>
        <Sheet open={open} onOpenChange={openDrawer}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg">
              <FilterIcon />
              Filters
              {active.length > 0 && <Badge className="ml-0.5 h-5 min-w-5 px-1.5">{active.length}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col">
            <SheetHeader>
              <SheetTitle>Filter employees</SheetTitle>
              <SheetDescription>Combine any filters; each group matches any selected value.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-4">
              <ChipGroup
                legend="Department"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                selected={draft.departmentIds}
                onToggle={(id) => setDraft((d) => ({ ...d, departmentIds: toggle(d.departmentIds, id) }))}
              />
              <Separator />
              <ChipGroup
                legend="Country"
                options={countries.map((c) => ({ value: c.id, label: c.country_name }))}
                selected={draft.countryIds}
                onToggle={(id) => setDraft((d) => ({ ...d, countryIds: toggle(d.countryIds, id) }))}
              />
              <Separator />
              <ChipGroup
                legend="Employment type"
                options={(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((t) => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] }))}
                selected={draft.employmentTypes}
                onToggle={(type) => setDraft((d) => ({ ...d, employmentTypes: toggle(d.employmentTypes, type) }))}
              />
              <Separator />
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted-foreground">Annual base salary (USD)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Minimum" htmlFor="filter-min">
                    <Input
                      id="filter-min"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0"
                      value={draft.minSalary}
                      onChange={(e) => setDraft((d) => ({ ...d, minSalary: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Maximum" htmlFor="filter-max">
                    <Input
                      id="filter-max"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Any"
                      value={draft.maxSalary}
                      onChange={(e) => setDraft((d) => ({ ...d, maxSalary: e.target.value }))}
                    />
                  </FormField>
                </div>
              </fieldset>
            </div>
            <SheetFooter className="flex-row justify-end">
              <Button variant="ghost" onClick={() => setDraft({ ...EMPTY_FILTERS })}>
                Reset
              </Button>
              <Button onClick={apply}>Apply filters</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 pr-1">
              {filter.label}
              <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={filter.remove} className="rounded-full p-0.5 hover:bg-foreground/10">
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="link" size="xs" onClick={() => onChange({ ...EMPTY_FILTERS, search: value.search })}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
