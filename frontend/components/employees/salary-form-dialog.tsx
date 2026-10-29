"use client";

import { useState, type FormEvent } from "react";

import { SalaryFields, toSalaryInput, type SalaryFormState } from "@/components/employees/salary-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { todayIso } from "@/lib/format";
import type { Salary } from "@/lib/types";

/** Add a salary record (no `salary`) or edit one. Mount with a `key` to reset between uses. */
export function SalaryFormDialog({
  open,
  onClose,
  employeeId,
  currency,
  salary,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: number;
  currency: string;
  salary?: Salary;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<SalaryFormState>({
    base_salary: salary ? String(salary.base_salary) : "",
    bonus: salary ? String(salary.bonus) : "",
    effective_date: salary?.effective_date ?? todayIso(),
    pay_frequency: salary?.pay_frequency ?? "ANNUAL",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (salary) await api.updateSalary(salary.id, toSalaryInput(form));
      else await api.createSalary(employeeId, toSalaryInput(form));
      toast.success(salary ? "Salary record updated" : "Salary record added");
      onSaved();
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
      title={salary ? "Edit salary record" : "Add salary record"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="salary-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="salary-form" onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <SalaryFields value={form} onChange={setForm} currency={currency} idPrefix="salary" />
        <p className="text-xs text-fg-subtle">The record with the latest effective date (on or before today) is treated as the current salary.</p>
      </form>
    </Dialog>
  );
}
