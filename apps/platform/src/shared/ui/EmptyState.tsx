import { Clock3 } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  action,
  message,
  title,
}: {
  action?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-brand-orange/25 bg-brand-white p-8 text-center ">
      <Clock3 aria-hidden="true" className="mx-auto size-9 text-brand-orange" />
      <h2 className="mt-4 text-xl font-bold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/75">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
