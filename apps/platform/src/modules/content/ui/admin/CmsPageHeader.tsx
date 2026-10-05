import { cn } from "@/lib/utils";
import { PageHeader } from "@/shared/ui/PageShell";

type CmsPageHeaderProps = {
  eyebrow: string;
  title: string;
  className?: string;
};

export function CmsPageHeader({
  eyebrow,
  title,
  className,
}: CmsPageHeaderProps) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      className={cn(
        "mb-0 rounded-none border-0 bg-transparent p-0 ring-0 sm:p-0",
        "[&_h1]:m-0 [&_p]:mt-0 [&_p]:text-xs [&_p]:tracking-widest",
        className,
      )}
    />
  );
}
