"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { SalaryFormDialog } from "@/components/employees/salary-form-dialog";
import { SalaryHistory } from "@/components/employees/salary-history";
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { ErrorBanner } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function EmployeeDetailView({ employeeId }: { employeeId: number }) {
  const router = useRouter();
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
        <Button variant="link" size="sm" className="px-0" asChild>
          <Link href="/employees">
            <ArrowLeftIcon />
            Back to employees
          </Link>
        </Button>
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
    <div className="space-y-8">
        <Button variant="link" size="sm" className="px-0" asChild>
        <Link href="/employees">
          <ArrowLeftIcon />
          Back to employees
        </Link>
      </Button>

      <PageHeader
        reference="B3"
        eyebrow={`${employee.department.name} · ${employee.country.country_name}`}
        title={`${employee.first_name} ${employee.last_name}`}
        description={employee.job_title}
        actions={
        <>
          <Button variant="outline" size="lg" className="h-10" onClick={() => setModal({ kind: "edit-employee" })}>
            <PencilIcon />
            Edit
          </Button>
          <Button variant="destructive" size="lg" className="h-10" onClick={() => setModal({ kind: "delete-employee" })}>
            <Trash2Icon />
            Delete
          </Button>
        </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="shadow-hard lg:col-span-2">
          <CardHeader>
            <CardTitle className="eyebrow text-[11px] text-muted-foreground">Profile</CardTitle>
          </CardHeader>
          <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Email">{employee.email}</Detail>
            <Detail label="Employment type">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Detail>
            <Detail label="Hire date">{formatDate(employee.hire_date)}</Detail>
            <Detail label="Department">{employee.department.name}</Detail>
            <Detail label="Country">{employee.country.country_name}</Detail>
            <Detail label="Currency">{currency}</Detail>
          </dl>
          </CardContent>
        </Card>
        <Card className="bg-lilac shadow-hard">
          <CardHeader>
            <CardTitle className="eyebrow text-[11px] text-muted-foreground">Current compensation</CardTitle>
            {comp && <CardDescription>Effective {formatDate(comp.effective_date)}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {comp ? (
              <>
                <div>
                  <p className="headline text-4xl tabular-nums">{formatUsd(comp.annual_base_usd)}</p>
                  <p className="text-xs text-muted-foreground">Annual base salary (USD)</p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Detail label={`Base (${PAY_FREQUENCY_LABELS[comp.pay_frequency].toLowerCase()})`}>{formatMoney(comp.base_salary, currency)}</Detail>
                  <Detail label="Annual bonus">{formatMoney(comp.bonus, currency)}</Detail>
                  <Detail label="Total comp (USD)">{formatUsd(comp.total_comp_usd)}</Detail>
                  {employee.employment_type !== "FULL_TIME" && (
                    <div className="self-end">
                      <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Badge>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No current salary on record.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="pb-0 shadow-hard">
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold tracking-[-0.03em]">Salary history</CardTitle>
          <CardDescription>Amounts in {currency}</CardDescription>
          <CardAction>
            <Button onClick={() => setModal({ kind: "add-salary" })}>
              <PlusIcon />
              Add record
            </Button>
          </CardAction>
        </CardHeader>
        <SalaryHistory
          salaries={employee.salaries}
          currency={currency}
          onEdit={(salary) => setModal({ kind: "edit-salary", salary })}
          onDelete={(salary) => setModal({ kind: "delete-salary", salary })}
        />
      </Card>

      {modal?.kind === "edit-employee" && (
        <EmployeeFormDialog
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
