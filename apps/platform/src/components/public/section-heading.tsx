import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function SectionHeading({ title, text, link }: { title: string; text: string; link?: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-navy">{title}</h2>
        <p className="mt-1 text-sm text-[#486786]">{text}</p>
      </div>
      {link ? (
        <Link href="/funding" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-orange-dark">
          {link}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
