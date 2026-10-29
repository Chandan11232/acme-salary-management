import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-fg-muted">
      <span className="tabular-nums">
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="text-xs">Rows</span>
          <Select className="h-8 w-20" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((size) => (
              <option key={size}>{size}</option>
            ))}
          </Select>
        </label>
        <Button size="sm" variant="secondary" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">
          «
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <span className="px-1 tabular-nums">
          Page {pages === 0 ? 0 : page} of {formatCount(pages)}
        </span>
        <Button size="sm" variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
          Next
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPageChange(pages)} disabled={page >= pages} aria-label="Last page">
          »
        </Button>
      </div>
    </div>
  );
}
