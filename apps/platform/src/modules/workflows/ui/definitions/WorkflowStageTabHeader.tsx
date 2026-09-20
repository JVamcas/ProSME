import type { ReactNode } from "react";

type Props = {
  action?: ReactNode;
  count: number;
  description: string;
  title: string;
};

export function WorkflowStageTabHeader({
  action,
  count,
  description,
  title,
}: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <h4 className="text-sm font-bold text-brand-navy">
          {title} ({count})
        </h4>
        <p className="mt-1 text-xs text-brand-navy/55">{description}</p>
      </div>
      {action}
    </div>
  );
}
