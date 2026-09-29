import { BarChart3, FileText, Send } from "lucide-react";
import type { HomepageContent } from "@/modules/content/ContentTypes";

const icons = [FileText, FileText, Send, BarChart3];

export function HomeProcess({ content }: { content: HomepageContent }) {
  return (
    <section className="container pb-14">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand-navy">
          {content.process.heading}
        </h2>
        <p className="mt-1 text-sm text-brand-navy/70">
          {content.process.introduction}
        </p>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {content.process.steps.map(({ title, description }, index) => {
          const Icon = icons[index] ?? FileText;
          return (
            <div key={title} className="relative text-center">
              {index < content.process.steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 left-[72%] top-9 hidden border-t-2 border-dotted border-brand-yellow lg:block"
                />
              ) : null}
              <span
                className={`absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full text-sm font-bold ${index % 2 ? "bg-brand-yellow text-brand-navy" : "bg-brand-orange text-brand-navy"}`}
              >
                {index + 1}
              </span>
              <span className="mx-auto grid size-21 place-items-center rounded-full bg-brand-orange/10 text-brand-orange">
                <Icon className="size-9" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-brand-navy">{title}</h3>
              <p className="mx-auto mt-2 max-w-55 text-sm leading-5 text-brand-navy/70">
                {description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
