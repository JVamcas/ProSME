import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "./section-heading";

const stories = [
  { image: "/brand/pic6.png", focal: "50% 8%", label: "SUCCESS STORY", title: "From idea to export: A Namibian maker’s journey", text: "How SME Fund support helped a local manufacturer scale beyond borders.", link: "Read story" },
  { image: "/brand/pic7.png", focal: "50% 10%", label: "BUSINESS TIPS", title: "5 ways to strengthen your funding application", text: "Practical tips to help you stand out and improve your chances.", link: "Read more" },
  { image: "/brand/pic8.png", focal: "50% 50%", label: "INSIGHTS", title: "Why green business is Namibia’s next big opportunity", text: "Exploring the role of SMEs in a more sustainable and resilient economy.", link: "Read more" },
];

export function HomeStories() {
  return (
    <section className="container py-10">
      <SectionHeading title="Success stories & insights" text="Real stories. Practical resources. Useful insights for your business journey." link="View all stories and resources" />
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {stories.map((story) => (
          <article key={story.title} className="story-card flex min-h-[390px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="story-image relative shrink-0 overflow-hidden">
              <Image src={story.image} alt={story.title} fill className="object-cover" style={{ objectPosition: story.focal }} sizes="(min-width: 768px) 33vw, 100vw" />
              <span className="absolute left-4 top-4 rounded bg-white/90 px-3 py-1 text-[10px] font-bold text-navy">{story.label}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-bold leading-5 text-navy">{story.title}</h3>
              <p className="mt-2 text-sm leading-5 text-[#486786]">{story.text}</p>
              <Link href="/funding" className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-orange-dark">{story.link}<ArrowRight className="size-4" /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
