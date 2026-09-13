import { cn } from "@/lib/utils";

type ProfilePageHeaderProps = {
  className?: string;
  eyebrow?: string;
  title: string;
  description: string;
};

export function ProfilePageHeader({
  className,
  description,
  eyebrow,
  title,
}: ProfilePageHeaderProps) {
  return (
    <header className={className}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "display text-3xl font-bold text-brand-navy sm:text-4xl",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-navy/70 sm:text-base">
        {description}
      </p>
    </header>
  );
}
