import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricCard({ label, value, detail }: { label: string; value: string | null; detail?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs font-medium tracking-wide uppercase">{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value === null ? <Skeleton className="h-8 w-32" /> : value}</CardTitle>
      </CardHeader>
      {detail && <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>}
    </Card>
  );
}
