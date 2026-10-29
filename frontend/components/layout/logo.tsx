import Link from "next/link";

const BARS = [8, 13, 18, 22];

/** Wordmark with a small rising bar-chart mark. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ACME Pay home">
      <span aria-hidden className="flex h-[22px] items-end gap-[2px]">
        {BARS.map((height, i) => (
          <i key={height} className={`w-[4px] rounded-[1px] ${i === BARS.length - 1 ? "bg-orange" : "bg-ink"}`} style={{ height }} />
        ))}
      </span>
      <span className="font-display text-[22px] font-bold tracking-[-0.04em]">acme pay</span>
    </Link>
  );
}
