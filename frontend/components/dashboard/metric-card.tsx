import { Skeleton } from "@/components/ui/skeleton";

/** One cell of the ruled metric grid; place inside <MetricGrid>. */
export function MetricCard({ index, label, value, detail }: { index: number; label: string; value: string | null; detail?: string }) {
  return (
    <div className="bg-card px-5 py-5">
      <p className="eyebrow text-muted-foreground">
        <span className="mr-2 text-orange-deep">{String(index).padStart(2, "0")}</span>
        {label}
      </p>
      {value === null ? <Skeleton className="mt-4 h-9 w-36" /> : <p className="headline mt-4 text-4xl tabular-nums">{value}</p>}
      <p className="mt-2 min-h-4 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-[1.5px] overflow-hidden rounded-sm rule bg-ink sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
