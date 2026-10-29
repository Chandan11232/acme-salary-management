import type { ReactNode } from "react";

/** Mono eyebrow with a drawing-style reference ("A1"), a tight display headline, and optional actions. */
export function PageHeader({
  reference,
  eyebrow,
  title,
  description,
  actions,
}: {
  reference: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 pb-2">
      <div className="max-w-2xl">
        <p className="eyebrow mb-4 text-muted-foreground">
          <span className="mr-2 text-orange-deep">{reference}</span>
          {eyebrow}
        </p>
        <h1 className="headline text-[clamp(2.5rem,5vw,3.75rem)]">{title}</h1>
        {description && <p className="mt-4 text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
