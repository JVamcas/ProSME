"use client";

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";

export function WorkflowTaskDetailsStep() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput
        containerClassName="sm:col-span-2"
        label="Task name"
        name="name"
        placeholder="Review finance"
        required
      />
      <FormSelect
        containerClassName="sm:col-span-2"
        infoTooltip="Contributing tasks are manually completed. A stage-decision task is completed only through a decision action."
        items={[
          { label: "Contributing work", value: "CONTRIBUTING" },
          { label: "Stage decision", value: "STAGE_DECISION" },
        ]}
        label="Task type"
        name="taskType"
        required
      />
      <FormInput
        containerClassName="sm:col-span-2"
        label="Display order"
        min={1}
        name="displayOrder"
        registrationOptions={{ valueAsNumber: true }}
        required
        type="number"
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="Description"
        name="description"
        placeholder="Describe the unit of work."
        rows={4}
      />
    </div>
  );
}
