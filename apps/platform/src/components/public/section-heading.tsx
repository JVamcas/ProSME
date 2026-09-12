import { ArrowLink } from "@/components/ui/arrow-link";

export function SectionHeading({ title, text, link, href = "/funding" }: { title: string; text: string; link?: string; href?: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-navy">{title}</h2>
        <p className="mt-1 text-sm text-[#486786]">{text}</p>
      </div>
      {link ? (
        <ArrowLink href={href}>{link}</ArrowLink>
      ) : null}
    </div>
  );
}
