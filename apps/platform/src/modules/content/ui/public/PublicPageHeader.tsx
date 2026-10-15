import type { CmsImage as CmsImageValue } from "@/modules/content/ContentTypes";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";

export function PublicPageHeader({
  eyebrow,
  image,
  title,
  summary,
  variant = "banner",
}: {
  eyebrow: string;
  image?: CmsImageValue;
  title: string;
  summary: string;
  variant?: "banner" | "centered";
}) {
  const centered = variant === "centered";

  return (
    <section
      className={
        centered
          ? "mb-9 text-center text-brand-navy sm:mb-10"
          : "bg-brand-navy py-16 text-brand-white"
      }
    >
      <div
        className={
          centered
            ? "mx-auto max-w-4xl"
            : `mx-auto grid w-[min(1180px,calc(100%-2rem))] gap-9 ${
                image ? "lg:grid-cols-[1fr_420px] lg:items-center" : "max-w-4xl"
              }`
        }
      >
        <div>
          <p
            className={
              centered
                ? "text-sm font-bold uppercase tracking-[0.16em] text-brand-orange"
                : "text-xs font-extrabold uppercase tracking-[.16em] text-brand-orange"
            }
          >
            {eyebrow}
          </p>
          <h1
            className={
              centered
                ? "mt-3 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                : "display mt-4 text-4xl font-semibold sm:text-6xl"
            }
          >
            {title}
          </h1>
          <p
            className={
              centered
                ? "mx-auto mt-4 max-w-3xl text-lg leading-7 sm:text-xl"
                : "mt-5 max-w-2xl text-lg leading-8 text-brand-white/70"
            }
          >
            {summary}
          </p>
        </div>
        <CmsImage
          className="aspect-4/3 w-full rounded-3xl object-cover"
          image={image}
          priority
        />
      </div>
    </section>
  );
}
