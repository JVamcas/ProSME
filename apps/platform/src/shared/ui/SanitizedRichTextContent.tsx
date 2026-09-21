import { cn } from "@/lib/utils";

export function SanitizedRichTextContent({
  className,
  sanitizedHtml,
}: {
  className?: string;
  sanitizedHtml: string;
}) {
  return (
    <div
      className={cn(
        "rich-text-content leading-7 text-brand-navy/75",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
