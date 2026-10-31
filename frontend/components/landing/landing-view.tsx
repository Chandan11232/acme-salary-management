"use client";

import { ArrowRightIcon, BarChart3Icon, MessageSquareTextIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { formatCount, formatUsdCompact } from "@/lib/format";
import { prefetchSummary, referenceData } from "@/lib/prefetch";
import type { AnalyticsSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// After this long the backend is almost certainly cold-starting, so say so.
const SLOW_AFTER_MS = 1500;

const FEATURES = [
  {
    href: "/dashboard",
    icon: BarChart3Icon,
    title: "Dashboard",
    body: "Headcount, payroll, average and median pay, broken down by department and country.",
  },
  {
    href: "/employees",
    icon: UsersIcon,
    title: "Employees",
    body: "Search, filter and sort all 10,000 people, and keep each salary history up to date.",
  },
  {
    href: "/assistant",
    icon: MessageSquareTextIcon,
    title: "Ask AI",
    body: "Ask questions in plain English, like “median salary by department in India”.",
  },
];

type Status = "loading" | "slow" | "ready" | "error";

export function LandingView() {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  // Wake the backend and load the dashboard's numbers while the visitor reads this page.
  useEffect(() => {
    let cancelled = false;
    const slow = setTimeout(() => !cancelled && setStatus((s) => (s === "loading" ? "slow" : s)), SLOW_AFTER_MS);
    referenceData().catch(() => {});
    prefetchSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      clearTimeout(slow);
    };
  }, []);

  return (
    <div className="space-y-12">
      <PageHeader
        reference="00"
        eyebrow="Salary management for ACME HR"
        title={
          <>
            Every salary, <span className="text-orange">one place.</span>
          </>
        }
        description="See what ACME pays its 10,000 people across six countries, keep salary records current, and get answers without writing a report."
      />

      <div className="flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className="h-12 gap-5 px-5 text-[15px]">
          <Link href="/dashboard">
            Open the dashboard
            <ArrowRightIcon />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-5 text-[15px]">
          <Link href="/employees">Browse employees</Link>
        </Button>
        <ServerStatus status={status} summary={summary} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {FEATURES.map(({ href, icon: Icon, title, body }, i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group rounded-xl rule p-6 shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5",
              i === 1 ? "bg-lilac" : "bg-card",
            )}
          >
            <div className="mb-8 flex items-start justify-between">
              <p className="eyebrow text-[11px]">
                <span className="mr-2 text-orange-deep">{String(i + 1).padStart(2, "0")}</span>
                {title}
              </p>
              <span className="grid size-9 place-items-center rounded-sm rule bg-card text-[#1a1a17]">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{body}</p>
            <p className="mt-5 flex items-center gap-2 text-sm font-medium group-hover:text-orange-deep">
              Open <ArrowRightIcon className="size-4" />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ServerStatus({ status, summary }: { status: Status; summary: AnalyticsSummary | null }) {
  const text = {
    loading: "Loading live numbers…",
    slow: "Waking up the server, this takes about 10 seconds on the free tier…",
    ready: summary ? `Live: ${formatCount(summary.headcount)} people · ${formatUsdCompact(summary.total_payroll_usd)} payroll` : "Live",
    error: "Couldn't reach the server yet. The dashboard will retry.",
  }[status];
  const dot = { loading: "bg-muted-foreground animate-pulse", slow: "bg-orange animate-pulse", ready: "bg-success", error: "bg-destructive" }[status];
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden className={cn("size-2 rounded-full", dot)} />
      {text}
    </p>
  );
}
