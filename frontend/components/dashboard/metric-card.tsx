import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";

export function MetricCard({ label, value, detail }: { label: string; value: string | null; detail?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</p>
      {value === null ? <Skeleton className="mt-2 h-8 w-32" /> : <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>}
      {detail && <p className="mt-1 text-xs text-fg-subtle">{detail}</p>}
    </Card>
  );
}
