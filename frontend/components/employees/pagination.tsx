import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCount } from "@/lib/format";

export const PAGE_SIZES = [10, 25, 50, 100];

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs">Rows</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon-sm" variant="outline" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">
          <ChevronsLeftIcon />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeftIcon />
        </Button>
        <span className="px-1 tabular-nums">
          Page {pages === 0 ? 0 : page} of {formatCount(pages)}
        </span>
        <Button size="icon-sm" variant="outline" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRightIcon />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={() => onPageChange(pages)} disabled={page >= pages} aria-label="Last page">
          <ChevronsRightIcon />
        </Button>
      </div>
    </div>
  );
}
