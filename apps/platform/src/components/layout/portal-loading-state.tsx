import { LoaderCircle } from "lucide-react";

type PortalLoadingStateProps = {
  description: React.ReactNode;
  title: React.ReactNode;
};

export function PortalLoadingState({
  description,
  title,
}: PortalLoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className="mx-auto mt-16 flex max-w-lg items-center gap-4 rounded-2xl border border-brand-navy/15 bg-brand-white p-6 shadow-sm"
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 animate-spin text-brand-orange"
      />
      <div>
        <p className="font-bold text-brand-navy">{title}</p>
        <p className="mt-1 text-sm text-brand-navy/70">
          {description}
        </p>
      </div>
    </div>
  );
}
