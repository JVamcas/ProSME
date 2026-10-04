"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { FormTextarea } from "@/components/ui/form-fields";
import type { FundingCallLifecycleCommandInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import { useChangeFundingCallLifecycleStatus } from "../FundingCallHooks";

type Command = FundingCallLifecycleCommandInput["command"];
type Props = {
  call: FundingCallView;
  canArchive: boolean;
  canResume: boolean;
  canSuspend: boolean;
  canWithdraw: boolean;
};

const reasonSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
});
type ReasonInput = z.infer<typeof reasonSchema>;

const labels: Record<Command, string> = {
  ARCHIVE: "Archive",
  RESUME: "Resume",
  SUSPEND: "Suspend",
  WITHDRAW: "Withdraw",
};

function availableActions(props: Props): Command[] {
  const actions: Command[] = [];
  if (
    props.canSuspend
    && (props.call.status === "SCHEDULED" || props.call.status === "LIVE")
  ) actions.push("SUSPEND");
  if (props.canResume && props.call.status === "SUSPENDED") {
    actions.push("RESUME");
  }
  if (
    props.canWithdraw
    && ["SCHEDULED", "LIVE", "SUSPENDED"].includes(props.call.status)
  ) actions.push("WITHDRAW");
  if (
    props.canArchive
    && (props.call.status === "CLOSED" || props.call.status === "WITHDRAWN")
  ) actions.push("ARCHIVE");
  return actions;
}

export function FundingCallExceptionalActions(props: Props) {
  const mutation = useChangeFundingCallLifecycleStatus(props.call.id);
  const [command, setCommand] = useState<Command | null>(null);
  const form = useForm<ReasonInput>({
    defaultValues: { reason: "" },
    resolver: zodResolver(reasonSchema),
  });
  const actions = availableActions(props);
  const close = () => {
    if (mutation.isPending) return;
    form.reset();
    setCommand(null);
  };
  const submit = form.handleSubmit(async ({ reason }) => {
    if (!command) return;
    await mutation.mutateAsync({
      command,
      expectedRowVersion: props.call.rowVersion,
      reason,
    });
    close();
  });

  if (!actions.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <GeneralButton
            disabled={mutation.isPending}
            key={action}
            onClick={() => setCommand(action)}
            type="button"
            variant={action === "WITHDRAW" ? "danger" : "outlineOrange"}
          >
            {labels[action]}
          </GeneralButton>
        ))}
      </div>
      <DraggableDialog
        isOpen={Boolean(command)}
        onClose={close}
        size="md"
        title={command ? `${labels[command]} funding call` : "Funding call action"}
      >
        <FormProvider {...form}>
          <form className="space-y-5" onSubmit={submit}>
            <FormTextarea
              disabled={mutation.isPending}
              label={`${command ? labels[command] : "Action"} reason`}
              name="reason"
              required
              rows={5}
            />
            {mutation.error ? (
              <p className="text-sm text-red-700" role="alert">
                {mutation.error.message}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <GeneralButton
                disabled={mutation.isPending}
                onClick={close}
                type="button"
                variant="outline"
              >
                Cancel
              </GeneralButton>
              <GeneralButton
                disabled={mutation.isPending}
                type="submit"
                variant={command === "WITHDRAW" ? "danger" : "primary"}
              >
                {mutation.isPending ? "Processing…" : "Confirm"}
              </GeneralButton>
            </div>
          </form>
        </FormProvider>
      </DraggableDialog>
    </>
  );
}
