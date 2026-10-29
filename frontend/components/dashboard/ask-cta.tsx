import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AskCta() {
  return (
    <section className="flex flex-col items-start justify-between gap-6 rounded-xl rule bg-lilac px-6 py-9 shadow-hard md:flex-row md:items-center md:px-11 md:py-12">
      <div>
        <p className="eyebrow mb-4">Your next question starts here</p>
        <h2 className="headline text-[clamp(1.9rem,3.6vw,2.6rem)] leading-[1.05]">
          The charts don&apos;t cover it?
          <br />
          Ask in plain English.
        </h2>
      </div>
      <Button asChild size="lg" className="h-12 gap-5 px-5 text-[15px]">
        <Link href="/assistant">
          Ask the assistant
          <ArrowRightIcon />
        </Link>
      </Button>
    </section>
  );
}
