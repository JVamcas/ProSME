"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useAssignWorkflow,
  usePublishedWorkflows,
  useWorkflowAssignments,
  useWorkflowOpportunities,
} from "@/modules/workflows/WorkflowHooks";

const formSchema = z.object({
  fundingOpportunityId: z.coerce.number().int().positive(),
  workflowVersionId: z.string().uuid(),
});
export function WorkflowAssignmentPanel() {
  const assignments = useWorkflowAssignments();
  const opportunities = useWorkflowOpportunities();
  const workflows = usePublishedWorkflows();
  const mutation = useAssignWorkflow();
  const form = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({ resolver: zodResolver(formSchema) });
  const submit = form.handleSubmit(async (values) => {
    const current = assignments.data?.find(
      (item) => item.fundingOpportunityId === values.fundingOpportunityId,
    );
    const opportunity = opportunities.data?.items.find(
      (item) => item.id === values.fundingOpportunityId,
    );
    await mutation.mutateAsync({
      ...values,
      expectedRowVersion: current?.rowVersion ?? 0,
      fundingOpportunityTitle: opportunity?.title ?? "Funding opportunity",
    });
  });
  if (assignments.isLoading || opportunities.isLoading || workflows.isLoading) {
    return (
      <p className="rounded-2xl bg-brand-cream p-6 text-brand-navy">
        Loading assignment options…
      </p>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
      <section className="overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white">
        <div className="border-b border-brand-navy/10 p-5">
          <h2 className="font-bold text-brand-navy">Current assignments</h2>
          <p className="mt-1 text-sm text-brand-navy/65">
            Only published versions can be used for submission.
          </p>
        </div>
        <div className="divide-y divide-brand-navy/10">
          {assignments.data?.length ? (
            assignments.data.map((item) => (
              <article
                className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                key={item.fundingOpportunityId}
              >
                <div>
                  <h3 className="font-semibold text-brand-navy">
                    {item.fundingOpportunityTitle}
                  </h3>
                  <p className="text-sm text-brand-navy/65">
                    {item.workflowName} · Version {item.versionNumber}
                  </p>
                </div>
                <StatusBadge status="published" label="Assigned" />
              </article>
            ))
          ) : (
            <p className="p-6 text-sm text-brand-navy/65">
              No opportunities have a workflow assigned yet.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-brand-navy/15 bg-brand-cream p-5">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-brand-orange" />
          <h2 className="font-bold text-brand-navy">Assign workflow</h2>
        </div>
        <FormProvider {...form}>
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <FormSelect
              label="Funding opportunity"
              name="fundingOpportunityId"
              placeholder="Select an opportunity"
              items={(opportunities.data?.items ?? []).map((item) => ({
                label: item.title,
                value: item.id,
              }))}
            />
            <FormSelect
              label="Published workflow version"
              name="workflowVersionId"
              placeholder="Select a workflow"
              items={(workflows.data ?? []).map((item) => ({
                label: `${item.name} · v${item.versionNumber}`,
                value: item.versionId,
              }))}
            />
            <GeneralButton
              disabled={mutation.isPending || !workflows.data?.length}
              type="submit"
            >
              {mutation.isPending ? "Assigning…" : "Assign workflow"}
            </GeneralButton>
            {mutation.error ? (
              <p className="text-sm text-brand-navy" role="alert">
                {mutation.error.message}
              </p>
            ) : null}
            {mutation.isSuccess ? (
              <p
                className="text-sm font-semibold text-brand-green"
                role="status"
              >
                Assignment saved and audited.
              </p>
            ) : null}
          </form>
        </FormProvider>
      </section>
    </div>
  );
}
