import { Suspense } from "react";

import { EmployeeListView } from "@/components/employees/employee-list-view";

export const metadata = { title: "Employees · ACME Pay" };

export default function EmployeesPage() {
  // useSearchParams (deep-link filters) needs a Suspense boundary for prerendering.
  return (
    <Suspense>
      <EmployeeListView />
    </Suspense>
  );
}
