import { notFound } from "next/navigation";

import { EmployeeDetailView } from "@/components/employees/employee-detail-view";

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) notFound();
  return <EmployeeDetailView employeeId={employeeId} />;
}
