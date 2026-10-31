"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/common/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/assistant", label: "Ask AI" },
];

const WRAP = "mx-auto w-[min(1240px,calc(100%-32px))]";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex min-h-full flex-col">
      <header className={cn(WRAP, "flex items-center justify-between gap-6 border-b py-5")}>
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "border-b-[1.5px] px-2 py-1 text-sm font-medium transition-colors sm:px-0",
                isActive(item.href) ? "border-ink text-foreground" : "border-transparent text-muted-foreground hover:text-orange-deep",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </header>
      <main className={cn(WRAP, "flex-1 py-10")}>{children}</main>
      <footer className={cn(WRAP, "flex flex-wrap justify-between gap-2 border-t py-8 text-xs text-muted-foreground")}>
        <span>ACME Pay · Salary management for 10,000 people across 6 countries</span>
        <span className="eyebrow">All figures annual · USD</span>
      </footer>
    </div>
  );
}
