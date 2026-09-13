import type { CmsImage as CmsImageValue } from "@/modules/content/ContentTypes";
import { CmsImage } from "./cms-image";

export function PublicPageHeader({ eyebrow, image, title, summary }: { eyebrow: string; image?: CmsImageValue; title: string; summary: string }) {
  return <section className="bg-brand-navy py-16 text-brand-white"><div className={`container grid gap-9 ${image ? "lg:grid-cols-[1fr_420px] lg:items-center" : "max-w-4xl"}`}><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand-orange">{eyebrow}</p><h1 className="display mt-4 text-4xl font-semibold sm:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-brand-white/70">{summary}</p></div><CmsImage className="aspect-[4/3] w-full rounded-3xl object-cover" image={image} priority /></div></section>;
}
