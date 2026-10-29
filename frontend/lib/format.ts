import type { EmploymentType, PayFrequency } from "@/lib/types";

const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US");

export const formatUsd = (value: number) => usdWhole.format(value);
export const formatUsdCompact = (value: number) => usdCompact.format(value);
export const formatCount = (value: number) => integer.format(value);

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDate(iso: string): string {
  // Dates are calendar dates; format in UTC so the day never shifts with the viewer's timezone.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  ANNUAL: "Annual",
  MONTHLY: "Monthly",
  BIWEEKLY: "Bi-weekly",
};

export const todayIso = () => new Date().toISOString().slice(0, 10);
