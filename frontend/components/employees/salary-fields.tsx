"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { PAY_FREQUENCY_LABELS } from "@/lib/format";
import type { PayFrequency } from "@/lib/types";

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
}: {
  value: SalaryFormState;
  onChange: (next: SalaryFormState) => void;
  currency: string;
  idPrefix: string;
}) {
  const set = (patch: Partial<SalaryFormState>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={`Base salary per period (${currency})`} htmlFor={`${idPrefix}-base`}>
        <Input
          id={`${idPrefix}-base`}
          type="number"
          min={0.01}
          step="0.01"
          required
          value={value.base_salary}
          onChange={(e) => set({ base_salary: e.target.value })}
        />
      </Field>
      <Field label="Pay frequency" htmlFor={`${idPrefix}-frequency`}>
        <Select id={`${idPrefix}-frequency`} value={value.pay_frequency} onChange={(e) => set({ pay_frequency: e.target.value as PayFrequency })}>
          {Object.entries(PAY_FREQUENCY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`Annual bonus (${currency})`} htmlFor={`${idPrefix}-bonus`}>
        <Input id={`${idPrefix}-bonus`} type="number" min={0} step="0.01" value={value.bonus} onChange={(e) => set({ bonus: e.target.value })} />
      </Field>
      <Field label="Effective date" htmlFor={`${idPrefix}-effective`}>
        <Input
          id={`${idPrefix}-effective`}
          type="date"
          required
          value={value.effective_date}
          onChange={(e) => set({ effective_date: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function toSalaryInput(state: SalaryFormState) {
  return {
    base_salary: Number(state.base_salary),
    bonus: state.bonus ? Number(state.bonus) : 0,
    effective_date: state.effective_date,
    pay_frequency: state.pay_frequency,
  };
}
