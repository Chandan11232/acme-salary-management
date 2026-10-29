"use client";

import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAY_FREQUENCY_LABELS } from "@/lib/format";
import type { PayFrequency, SalaryInput } from "@/lib/types";

export interface SalaryFormState {
  base_salary: string;
  bonus: string;
  effective_date: string;
  pay_frequency: PayFrequency;
}

export function SalaryFields({
  value,
  onChange,
  currency,
  idPrefix,
  required = true,
}: {
  value: SalaryFormState;
  onChange: (next: SalaryFormState) => void;
  currency: string;
  idPrefix: string;
  required?: boolean;
}) {
  const set = (patch: Partial<SalaryFormState>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label={`Base salary per period (${currency})`} htmlFor={`${idPrefix}-base`}>
        <Input
          id={`${idPrefix}-base`}
          type="number"
          min={0.01}
          step="0.01"
          required={required}
          value={value.base_salary}
          onChange={(e) => set({ base_salary: e.target.value })}
        />
      </FormField>
      <FormField label="Pay frequency" htmlFor={`${idPrefix}-frequency`}>
        <Select value={value.pay_frequency} onValueChange={(v) => set({ pay_frequency: v as PayFrequency })}>
          <SelectTrigger id={`${idPrefix}-frequency`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAY_FREQUENCY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={`Annual bonus (${currency})`} htmlFor={`${idPrefix}-bonus`}>
        <Input id={`${idPrefix}-bonus`} type="number" min={0} step="0.01" value={value.bonus} onChange={(e) => set({ bonus: e.target.value })} />
      </FormField>
      <FormField label="Effective date" htmlFor={`${idPrefix}-effective`}>
        <Input
          id={`${idPrefix}-effective`}
          type="date"
          required={required}
          value={value.effective_date}
          onChange={(e) => set({ effective_date: e.target.value })}
        />
      </FormField>
    </div>
  );
}

export function toSalaryInput(state: SalaryFormState): SalaryInput {
  return {
    base_salary: Number(state.base_salary),
    bonus: state.bonus ? Number(state.bonus) : 0,
    effective_date: state.effective_date,
    pay_frequency: state.pay_frequency,
  };
}
