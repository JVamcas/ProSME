import { Clock3 } from "lucide-react";

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-brand-blue/25 bg-brand-white p-8 text-center shadow-[0_12px_35px_rgba(10,24,59,0.08)]">
      <Clock3 className="mx-auto size-9 text-brand-orange" />
      <h2 className="mt-4 text-xl font-bold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/75">{message}</p>
    </div>
  );
}
