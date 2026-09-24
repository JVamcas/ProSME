"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { WorkflowTaskCoiGate as CoiGate } from "../../ClientWorkflowCoiService";
import { useDeclareWorkflowCoi } from "./useWorkflowCoi";

const declarationSchema = z.object({
  decision: z.enum(["NO_CONFLICT", "DISCLOSE"]),
  disclosureText: z.string().max(4000),
}).refine(
  (value) => value.decision === "NO_CONFLICT"
    || value.disclosureText.trim().length > 0,
  { path: ["disclosureText"], message: "Describe the potential conflict." },
);

type Declaration = z.infer<typeof declarationSchema>;

export function WorkflowTaskCoiGate({ gate }: { gate: CoiGate }) {
  const mutation = useDeclareWorkflowCoi(gate.taskId);
  const form = useForm<Declaration>({
    defaultValues: { decision: "NO_CONFLICT", disclosureText: "" },
    resolver: zodResolver(declarationSchema),
  });
  const decision = useWatch({ control: form.control, name: "decision" });

  if (gate.state === "PENDING_REVIEW") {
    return (
      <section role="status">
        <h2>Conflict disclosure pending review</h2>
        <p>An independent reviewer must decide before you can access this task.</p>
      </section>
    );
  }
  if (gate.state === "RECUSED" || gate.state === "REVOKED") {
    return <p role="status">This assignment is no longer available.</p>;
  }
  if (gate.taskStatus === "PENDING") {
    return <p role="status">Claim this task before making a declaration.</p>;
  }

  async function submit(values: Declaration) {
    await mutation.mutateAsync({
      decision: values.decision,
      disclosureText: values.decision === "DISCLOSE"
        ? values.disclosureText.trim()
        : undefined,
      expectedRowVersion: gate.rowVersion,
    });
  }

  return (
    <section className="max-w-xl space-y-4 rounded-xl border p-5">
      <h2 className="text-lg font-semibold">{gate.taskName}</h2>
      <p>Declare any potential conflict before viewing the application.</p>
      <FormProvider {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <label className="block">
            <input
              type="radio"
              value="NO_CONFLICT"
              {...form.register("decision")}
            />
            I have no conflict
          </label>
          <label className="block">
            <input
              type="radio"
              value="DISCLOSE"
              {...form.register("decision")}
            />
            I need to disclose a potential conflict
          </label>
          {decision === "DISCLOSE" ? (
            <label className="block">
              Disclosure
              <textarea className="block w-full border p-2" {...form.register("disclosureText")} />
              {form.formState.errors.disclosureText ? (
                <span role="alert">{form.formState.errors.disclosureText.message}</span>
              ) : null}
            </label>
          ) : null}
          {mutation.isError ? <p role="alert">{mutation.error.message}</p> : null}
          <button type="submit" disabled={mutation.isPending}>
            Submit declaration
          </button>
        </form>
      </FormProvider>
    </section>
  );
}

