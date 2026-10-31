"use client";

import { useEffect, useState } from "react";

import { referenceData } from "@/lib/prefetch";
import type { Country, Department } from "@/lib/types";

interface ReferenceData {
  departments: Department[];
  countries: Country[];
  error: string | null;
}

/** Departments and countries for filters and forms (small, static lists). */
export function useReferenceData(): ReferenceData {
  const [data, setData] = useState<ReferenceData>({ departments: [], countries: [], error: null });
  useEffect(() => {
    let cancelled = false;
    referenceData()
      .then(([departments, countries]) => !cancelled && setData({ departments, countries, error: null }))
      .catch((error: Error) => !cancelled && setData((prev) => ({ ...prev, error: error.message })));
    return () => {
      cancelled = true;
    };
  }, []);
  return data;
}
