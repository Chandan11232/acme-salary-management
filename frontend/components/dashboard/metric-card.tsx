import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricCard({
  index,
  label,
  value,
  detail,
  icon: Icon,
  tone = "card",
}: {
  index: number;
  label: string;
  value: string | null;
  detail?: string;
  icon: LucideIcon;
  tone?: "card" | "lilac" | "orange";
}) {
  const background = { card: "bg-card", lilac: "bg-lilac", orange: "bg-orange text-[#1a1a17]" }[tone];
  return (
    <Card className={`${background} shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5`}>
      <CardHeader className="flex flex-row items-start justify-between">
        <p className="eyebrow text-[11px]">
          <span className={tone === "orange" ? "mr-2" : "mr-2 text-orange-deep"}>{String(index).padStart(2, "0")}</span>
          {label}
        </p>
        <span className="grid size-9 place-items-center rounded-sm rule bg-card text-[#1a1a17]">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        {value === null ? <Skeleton className="h-10 w-36" /> : <p className="headline text-[2.6rem] tabular-nums">{value}</p>}
        <p className={`mt-2 min-h-4 text-xs ${tone === "orange" ? "" : "text-muted-foreground"}`}>{detail}</p>
      </CardContent>
    </Card>
  );
}
