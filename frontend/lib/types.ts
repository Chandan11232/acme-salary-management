export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type PayFrequency = "ANNUAL" | "MONTHLY" | "BIWEEKLY";
export type SortField = "last_name" | "first_name" | "hire_date" | "job_title" | "department" | "country" | "salary";
export type SortOrder = "asc" | "desc";

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface Country {
  id: number;
  country_name: string;
  currency_code: string;
  exchange_rate_to_usd: number;
}

export interface CurrentCompensation {
  base_salary: number;
  bonus: number;
  pay_frequency: PayFrequency;
  effective_date: string;
  currency_code: string;
  annual_base_usd: number;
  total_comp_usd: number;
}

export interface EmployeeListItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  hire_date: string;
  employment_type: EmploymentType;
  department: Department;
  country: Country;
  current_compensation: CurrentCompensation | null;
}

export interface Salary {
  id: number;
  employee_id: number;
  base_salary: number;
  bonus: number;
  effective_date: string;
  pay_frequency: PayFrequency;
}

export interface EmployeeDetail extends EmployeeListItem {
  salaries: Salary[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface EmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  country_id: number;
  job_title: string;
  hire_date: string;
  employment_type: EmploymentType;
  salary?: SalaryInput;
}

export interface SalaryInput {
  base_salary: number;
  bonus: number;
  effective_date: string;
  pay_frequency: PayFrequency;
}

export interface EmployeeQuery {
  page: number;
  pageSize: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  search?: string;
  departmentId?: number;
  countryId?: number;
  employmentType?: EmploymentType;
  minSalary?: number;
  maxSalary?: number;
}

export interface GroupBreakdown {
  id: number;
  name: string;
  headcount: number;
  avg_salary_usd: number;
  total_payroll_usd: number;
}

export interface AnalyticsSummary {
  headcount: number;
  total_payroll_usd: number;
  avg_salary_usd: number;
  median_salary_usd: number;
  avg_bonus_usd: number;
  by_department: GroupBreakdown[];
  by_country: GroupBreakdown[];
}

export interface AIAnswer {
  question: string;
  answer: string;
  interpretation: string | null;
  parser: "llm" | "rules";
  value: number | null;
  unit: "usd" | "count" | null;
  table: { columns: string[]; rows: (string | number)[][] } | null;
}
