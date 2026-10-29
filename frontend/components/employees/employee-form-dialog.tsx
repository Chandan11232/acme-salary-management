"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/common/form-error";
import { FormField } from "@/components/common/form-field";
import { SalaryFields, toSalaryInput, type SalaryFormState } from "@/components/employees/salary-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/** Create (no `employee`) or edit an employee. Mount conditionally so state resets between uses. */
export function EmployeeFormDialog({
  onClose,
  employee,
  onSaved,
}: {
  onClose: () => void;
  employee?: EmployeeDetail;
  onSaved: (employee: EmployeeDetail) => void;
}) {
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
    if (!form.department_id || !form.country_id) {
      setError("Please choose a department and a country.");
      return;
    }
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
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update profile details. Salary changes are recorded in the salary history." : "Create a new employee record."}</DialogDescription>
        </DialogHeader>
        <form id="employee-form" onSubmit={submit} className="max-h-[60vh] space-y-4 overflow-y-auto">
          <FormError message={error} />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="emp-first">
              <Input id="emp-first" required maxLength={100} value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} />
            </FormField>
            <FormField label="Last name" htmlFor="emp-last">
              <Input id="emp-last" required maxLength={100} value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} />
            </FormField>
            <FormField label="Email" htmlFor="emp-email">
              <Input id="emp-email" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </FormField>
            <FormField label="Job title" htmlFor="emp-title">
              <Input id="emp-title" required maxLength={150} value={form.job_title} onChange={(e) => set({ job_title: e.target.value })} />
            </FormField>
            <FormField label="Department" htmlFor="emp-dept">
              <Select value={form.department_id} onValueChange={(v) => set({ department_id: v })}>
                <SelectTrigger id="emp-dept" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Country" htmlFor="emp-country">
              <Select value={form.country_id} onValueChange={(v) => set({ country_id: v })}>
                <SelectTrigger id="emp-country" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Hire date" htmlFor="emp-hire">
              <Input id="emp-hire" type="date" required value={form.hire_date} onChange={(e) => set({ hire_date: e.target.value })} />
            </FormField>
            <FormField label="Employment type" htmlFor="emp-type">
              <Select value={form.employment_type} onValueChange={(v) => set({ employment_type: v as EmploymentType })}>
                <SelectTrigger id="emp-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {!isEdit && (
            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Initial salary (optional)</legend>
              <SalaryFields value={salary} onChange={setSalary} currency={currency} idPrefix="new-emp-salary" required={Boolean(salary.base_salary)} />
            </fieldset>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
