import { api } from "@/lib/api";
import type { AnalyticsSummary, Country, Department } from "@/lib/types";

/**
 * Requests started early (on the landing page) so the backend wakes from a cold start
 * and the dashboard's first numbers are already in flight when the user opens it.
 */

let summary: Promise<AnalyticsSummary> | null = null;
let reference: Promise<[Department[], Country[]]> | null = null;

/** Starts (or joins) the unfiltered dashboard summary request. */
export function prefetchSummary(): Promise<AnalyticsSummary> {
  summary ??= api.summary({}).catch((error: Error) => {
    summary = null;
    throw error;
  });
  return summary;
}

/** Hands the prefetched summary to its one consumer; later loads fetch fresh numbers after any edits. */
export function takePrefetchedSummary(): Promise<AnalyticsSummary> | null {
  const pending = summary;
  summary = null;
  return pending;
}

/** Departments and countries are static lists, so one request serves the whole session. */
export function referenceData(): Promise<[Department[], Country[]]> {
  reference ??= Promise.all([api.departments(), api.countries()]).catch((error: Error) => {
    reference = null;
    throw error;
  });
  return reference;
}
