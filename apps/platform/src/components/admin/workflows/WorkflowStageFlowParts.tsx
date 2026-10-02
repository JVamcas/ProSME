import { Plus } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";

export function WorkflowStagesHeader({
  disabled,
  onAddStage,
}: {
  disabled: boolean;
  onAddStage: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-navy/55">
          Approval stages
        </p>
        <h2 className="mt-1 text-2xl font-bold text-brand-navy">
          Build the approval flow
        </h2>
        <p className="mt-2 text-sm text-brand-navy/60">
          Create, reorder, and manage approval stages.
        </p>
      </div>
      <GeneralButton
        disabled={disabled}
        onClick={onAddStage}
        variant="primary"
        type="button"
        size={"compact"}
      >
        <Plus className="size-4 text-white" />
        Add Workflow stage
      </GeneralButton>
    </div>
  );
}
