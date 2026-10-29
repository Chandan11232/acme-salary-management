import type { PayFrequency, Salary } from "@/lib/types";

const PERIODS_PER_YEAR: Record<PayFrequency, number> = { ANNUAL: 1, MONTHLY: 12, BIWEEKLY: 26 };

/** Annual base pay in local currency (mirrors the backend's calculation). */
export const annualBase = (salary: Pick<Salary, "base_salary" | "pay_frequency">) => salary.base_salary * PERIODS_PER_YEAR[salary.pay_frequency];

export function yearsBetween(fromIso: string, to: Date = new Date()): number {
  return (to.getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / (365.25 * 24 * 3600 * 1000);
}
