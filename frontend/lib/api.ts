import type {
  AIAnswer,
  AnalyticsSummary,
  Country,
  Department,
  EmployeeDetail,
  EmployeeInput,
  EmployeeListItem,
  EmployeeQuery,
  Page,
  Salary,
  SalaryInput,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

function describeError(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (detail as ValidationIssue[])
      .map((issue) => `${issue.loc.filter((part) => part !== "body").join(".")}: ${issue.msg}`)
      .join("; ");
  }
  return status >= 500 ? "The server hit an unexpected error. Please try again." : `Request failed (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Cannot reach the API server. Is the backend running?", 0);
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(describeError(response.status, body), response.status);
  return body as T;
}

function employeeParams(query: EmployeeQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.departmentId) params.set("department_id", String(query.departmentId));
  if (query.countryId) params.set("country_id", String(query.countryId));
  if (query.employmentType) params.set("employment_type", query.employmentType);
  if (query.minSalary !== undefined) params.set("min_salary", String(query.minSalary));
  if (query.maxSalary !== undefined) params.set("max_salary", String(query.maxSalary));
  return params;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const api = {
  departments: () => request<Department[]>("/api/departments"),
  countries: () => request<Country[]>("/api/countries"),

  employees: (query: EmployeeQuery, signal?: AbortSignal) =>
    request<Page<EmployeeListItem>>(`/api/employees?${employeeParams(query)}`, { signal }),
  employee: (id: number) => request<EmployeeDetail>(`/api/employees/${id}`),
  createEmployee: (data: EmployeeInput) => request<EmployeeDetail>("/api/employees", json("POST", data)),
  updateEmployee: (id: number, data: Partial<EmployeeInput>) =>
    request<EmployeeDetail>(`/api/employees/${id}`, json("PATCH", data)),
  deleteEmployee: (id: number) => request<void>(`/api/employees/${id}`, { method: "DELETE" }),

  createSalary: (employeeId: number, data: SalaryInput) =>
    request<Salary>(`/api/employees/${employeeId}/salaries`, json("POST", data)),
  updateSalary: (id: number, data: Partial<SalaryInput>) => request<Salary>(`/api/salaries/${id}`, json("PATCH", data)),
  deleteSalary: (id: number) => request<void>(`/api/salaries/${id}`, { method: "DELETE" }),

  summary: (filters: { departmentId?: number; countryId?: number }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (filters.departmentId) params.set("department_id", String(filters.departmentId));
    if (filters.countryId) params.set("country_id", String(filters.countryId));
    return request<AnalyticsSummary>(`/api/analytics/summary?${params}`, { signal });
  },

  askAssistant: (question: string) => request<AIAnswer>("/api/ai/query", json("POST", { question })),
};
