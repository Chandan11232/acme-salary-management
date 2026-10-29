"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { SalaryFormDialog } from "@/components/employees/salary-form-dialog";
import { SalaryHistory } from "@/components/employees/salary-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBanner, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, formatUsd, PAY_FREQUENCY_LABELS } from "@/lib/format";
import type { EmployeeDetail, Salary } from "@/lib/types";

type Modal =
  | { kind: "edit-employee" }
  | { kind: "delete-employee" }
  | { kind: "add-salary" }
  | { kind: "edit-salary"; salary: Salary }
  | { kind: "delete-salary"; salary: Salary }
  | null;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function EmployeeDetailView({ employeeId }: { employeeId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(
    () =>
      api
        .employee(employeeId)
        .then((data) => {
          setEmployee(data);
          setError(null);
        })
        .catch((err: Error) => setError(err.message)),
    [employeeId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const close = () => setModal(null);
  const afterSave = () => {
    close();
    load();
  };

  if (error && !employee) {
    return (
      <div className="space-y-4">
        <Link href="/employees" className="text-sm text-accent hover:underline">
          ← Back to employees
        </Link>
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }
  if (!employee) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const comp = employee.current_compensation;
  const currency = employee.country.currency_code;

  return (
    <div className="space-y-5">
      <Link href="/employees" className="text-sm text-accent hover:underline">
        ← Back to employees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-sm text-fg-muted">
            {employee.job_title} · {employee.department.name} · {employee.country.country_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModal({ kind: "edit-employee" })}>
            Edit
          </Button>
          <Button variant="secondary" className="hover:text-danger" onClick={() => setModal({ kind: "delete-employee" })}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile" />
          <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3">
            <Detail label="Email">{employee.email}</Detail>
            <Detail label="Employment type">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Detail>
            <Detail label="Hire date">{formatDate(employee.hire_date)}</Detail>
            <Detail label="Department">{employee.department.name}</Detail>
            <Detail label="Country">{employee.country.country_name}</Detail>
            <Detail label="Currency">{currency}</Detail>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Current compensation" description={comp ? `Effective ${formatDate(comp.effective_date)}` : undefined} />
          <div className="space-y-3 px-5 py-4">
            {comp ? (
              <>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{formatUsd(comp.annual_base_usd)}</p>
                  <p className="text-xs text-fg-muted">Annual base salary (USD)</p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Detail label={`Base (${PAY_FREQUENCY_LABELS[comp.pay_frequency].toLowerCase()})`}>{formatMoney(comp.base_salary, currency)}</Detail>
                  <Detail label="Annual bonus">{formatMoney(comp.bonus, currency)}</Detail>
                  <Detail label="Total comp (USD)">{formatUsd(comp.total_comp_usd)}</Detail>
                  {employee.employment_type !== "FULL_TIME" && (
                    <div className="self-end">
                      <Badge>{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Badge>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="text-sm text-fg-muted">No current salary on record.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Salary history"
          description={`Amounts in ${currency}`}
          action={
            <Button size="sm" onClick={() => setModal({ kind: "add-salary" })}>
              + Add record
            </Button>
          }
        />
        <SalaryHistory
          salaries={employee.salaries}
          currency={currency}
          onEdit={(salary) => setModal({ kind: "edit-salary", salary })}
          onDelete={(salary) => setModal({ kind: "delete-salary", salary })}
        />
      </Card>

      {modal?.kind === "edit-employee" && (
        <EmployeeFormDialog
          open
          employee={employee}
          onClose={close}
          onSaved={(saved) => {
            setEmployee(saved);
            close();
          }}
        />
      )}
      {(modal?.kind === "add-salary" || modal?.kind === "edit-salary") && (
        <SalaryFormDialog
          key={modal.kind === "edit-salary" ? modal.salary.id : "new"}
          open
          employeeId={employee.id}
          currency={currency}
          salary={modal.kind === "edit-salary" ? modal.salary : undefined}
          onClose={close}
          onSaved={afterSave}
        />
      )}
      <ConfirmDialog
        open={modal?.kind === "delete-employee"}
        title="Delete employee"
        message={`Permanently delete ${employee.first_name} ${employee.last_name} and their salary history? This cannot be undone.`}
        onClose={close}
        onConfirm={async () => {
          try {
            await api.deleteEmployee(employee.id);
            toast.success("Employee deleted");
            router.push("/employees");
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
      <ConfirmDialog
        open={modal?.kind === "delete-salary"}
        title="Delete salary record"
        message="Delete this salary record? If it is the current record, the previous one becomes current."
        onClose={close}
        onConfirm={async () => {
          if (modal?.kind !== "delete-salary") return;
          try {
            await api.deleteSalary(modal.salary.id);
            toast.success("Salary record deleted");
            afterSave();
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
    </div>
  );
}
