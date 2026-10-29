"use client";

import { useState, type FormEvent } from "react";

import { SalaryFields, toSalaryInput, type SalaryFormState } from "@/components/employees/salary-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { EMPLOYMENT_TYPE_LABELS, todayIso } from "@/lib/format";
import type { EmployeeDetail, EmployeeInput, EmploymentType } from "@/lib/types";
import { useReferenceData } from "@/lib/use-reference-data";

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department_id: string;
  country_id: string;
  hire_date: string;
  employment_type: EmploymentType;
}

function initialState(employee?: EmployeeDetail): FormState {
  return {
    first_name: employee?.first_name ?? "",
    last_name: employee?.last_name ?? "",
    email: employee?.email ?? "",
    job_title: employee?.job_title ?? "",
    department_id: employee ? String(employee.department.id) : "",
    country_id: employee ? String(employee.country.id) : "",
    hire_date: employee?.hire_date ?? todayIso(),
    employment_type: employee?.employment_type ?? "FULL_TIME",
  };
}

/** Create (no `employee`) or edit an employee. Mount with a `key` to reset between uses. */
export function EmployeeFormDialog({
  open,
  onClose,
  employee,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  employee?: EmployeeDetail;
  onSaved: (employee: EmployeeDetail) => void;
}) {
  const toast = useToast();
  const { departments, countries } = useReferenceData();
  const [form, setForm] = useState<FormState>(() => initialState(employee));
  const [salary, setSalary] = useState<SalaryFormState>({ base_salary: "", bonus: "", effective_date: todayIso(), pay_frequency: "ANNUAL" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(employee);
  const currency = countries.find((c) => String(c.id) === form.country_id)?.currency_code ?? "local";
  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: EmployeeInput = {
      ...form,
      department_id: Number(form.department_id),
      country_id: Number(form.country_id),
      ...(!isEdit && salary.base_salary ? { salary: toSalaryInput(salary) } : {}),
    };
    try {
      const saved = employee ? await api.updateEmployee(employee.id, payload) : await api.createEmployee(payload);
      toast.success(isEdit ? "Employee updated" : `${saved.first_name} ${saved.last_name} added`);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit employee" : "Add employee"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="emp-first">
            <Input id="emp-first" required maxLength={100} value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} />
          </Field>
          <Field label="Last name" htmlFor="emp-last">
            <Input id="emp-last" required maxLength={100} value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="emp-email">
            <Input id="emp-email" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Job title" htmlFor="emp-title">
            <Input id="emp-title" required maxLength={150} value={form.job_title} onChange={(e) => set({ job_title: e.target.value })} />
          </Field>
          <Field label="Department" htmlFor="emp-dept">
            <Select id="emp-dept" required value={form.department_id} onChange={(e) => set({ department_id: e.target.value })}>
              <option value="" disabled>
                Select…
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Country" htmlFor="emp-country">
            <Select id="emp-country" required value={form.country_id} onChange={(e) => set({ country_id: e.target.value })}>
              <option value="" disabled>
                Select…
              </option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.country_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hire date" htmlFor="emp-hire">
            <Input id="emp-hire" type="date" required value={form.hire_date} onChange={(e) => set({ hire_date: e.target.value })} />
          </Field>
          <Field label="Employment type" htmlFor="emp-type">
            <Select id="emp-type" value={form.employment_type} onChange={(e) => set({ employment_type: e.target.value as EmploymentType })}>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {!isEdit && (
          <fieldset className="space-y-3 rounded-md border border-line p-3">
            <legend className="px-1 text-xs font-medium text-fg-muted">Initial salary (optional)</legend>
            <SalaryFields value={salary} onChange={setSalary} currency={currency} idPrefix="new-emp-salary" />
          </fieldset>
        )}
      </form>
    </Dialog>
  );
}
