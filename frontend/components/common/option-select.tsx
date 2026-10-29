"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

/** Single-select with an "All …" option; Radix Select can't use "" as an item value, hence the sentinel. */
export function OptionSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: number | undefined;
  options: { value: number; label: string }[];
  onChange: (value: number | undefined) => void;
  className?: string;
}) {
  return (
    <Select value={value === undefined ? ALL : String(value)} onValueChange={(next) => onChange(next === ALL ? undefined : Number(next))}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
