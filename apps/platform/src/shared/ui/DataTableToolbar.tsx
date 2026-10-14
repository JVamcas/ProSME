import type { ReactNode } from "react";

export type DataTableToolbarConfig = {
  actions?: ReactNode;
  description?: string;
  filters?: ReactNode;
  title?: string;
};

export function DataTableToolbar({
  actions,
  description,
  filters,
  title,
}: DataTableToolbarConfig) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        {title ? <h2 className="font-bold text-brand-navy">{title}</h2> : null}
        {description ? (
          <p className="mt-1 text-xs text-brand-navy/55">{description}</p>
        ) : null}
        {filters}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
