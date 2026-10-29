"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/common/form-error";
import { SalaryFields, toSalaryInput, type SalaryFormState } from "@/components/employees/salary-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { todayIso } from "@/lib/format";
import type { Salary } from "@/lib/types";

/** Add a salary record (no `salary`) or edit one. Mount conditionally so state resets between uses. */
export function SalaryFormDialog({
  onClose,
  employeeId,
  currency,
  salary,
  onSaved,
}: {
  onClose: () => void;
  employeeId: number;
  currency: string;
  salary?: Salary;
  onSaved: () => void;
}) {
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
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{salary ? "Edit salary record" : "Add salary record"}</DialogTitle>
          <DialogDescription>The record with the latest effective date on or before today is the current salary.</DialogDescription>
        </DialogHeader>
        <form id="salary-form" onSubmit={submit} className="space-y-4">
          <FormError message={error} />
          <SalaryFields value={form} onChange={setForm} currency={currency} idPrefix="salary" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="salary-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
