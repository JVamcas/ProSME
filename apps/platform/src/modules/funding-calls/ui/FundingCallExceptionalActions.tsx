"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { toast } from "@/shared/ui/Toast";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { FormTextarea } from "@/components/ui/form-fields";
import type { FundingCallLifecycleCommandInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import { useChangeFundingCallLifecycleStatus } from "../FundingCallHooks";
import type { FundingCallActionRenderer } from "./FundingCallActionTypes";

type Command = FundingCallLifecycleCommandInput["command"];
type Props = {
  call: FundingCallView;
  canArchive: boolean;
  canResume: boolean;
  canSuspend: boolean;
  canWithdraw: boolean;
  canWithdrawForAmendment?: boolean;
  display?: "buttons" | "menu";
  renderActions?: FundingCallActionRenderer;
};

const reasonSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
});
type ReasonInput = z.infer<typeof reasonSchema>;

const labels: Record<Command, string> = {
  ARCHIVE: "Archive",
  RESUME: "Resume",
  SUSPEND: "Suspend",
  WITHDRAW: "Permanently withdraw",
  WITHDRAW_FOR_AMENDMENT: "Withdraw and return to Draft",
};

function availableActions(props: Props): Command[] {
  const actions: Command[] = [];
  if (
    props.canWithdrawForAmendment &&
    !props.call.currentPublishedVersionId &&
    ["APPROVED", "SCHEDULED", "LIVE", "SUSPENDED"].includes(props.call.status)
  ) {
    actions.push("WITHDRAW_FOR_AMENDMENT");
  }
  if (
    props.canSuspend &&
    (props.call.status === "SCHEDULED" || props.call.status === "LIVE")
  )
    actions.push("SUSPEND");
  if (props.canResume && props.call.status === "SUSPENDED") {
    actions.push("RESUME");
  }
  if (
    props.canWithdraw &&
    ["SCHEDULED", "LIVE", "SUSPENDED"].includes(props.call.status)
  )
    actions.push("WITHDRAW");
  if (
    props.canArchive &&
    (props.call.status === "CLOSED" || props.call.status === "WITHDRAWN")
  )
    actions.push("ARCHIVE");
  return actions;
}

function renderActionControls(
  props: Props,
  actions: Command[],
  pending: boolean,
  select: (command: Command) => void,
) {
  const items = actions.map((action) => ({
    id: action,
    label: labels[action],
    disabled: pending,
    destructive: action === "WITHDRAW",
    onAction: () => select(action),
  }));
  if (props.renderActions) return props.renderActions(items);
  if (props.display === "menu") {
    return (
      <ActionMenu
        label={`Funding call actions for ${props.call.title}`}
        items={items}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <GeneralButton
          disabled={pending}
          key={action}
          onClick={() => select(action)}
          type="button"
          variant={action === "WITHDRAW" ? "danger" : "outlineOrange"}
        >
          {labels[action]}
        </GeneralButton>
      ))}
    </div>
  );
}

export function FundingCallExceptionalActions(props: Props) {
  const router = useRouter();
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
    try {
      await mutation.mutateAsync({
        command,
        expectedRowVersion: props.call.rowVersion,
        reason,
      });
      form.reset();
      setCommand(null);
      if (command === "WITHDRAW_FOR_AMENDMENT") {
        toast.success(
          "Funding call returned to Draft. Fresh approval is required before publishing.",
        );
        router.push(`/admin/funding-calls/${props.call.id}`);
      }
    } catch {
      // The mutation error is shown in the dialog; keep the reason for retry.
    }
  });

  if (!actions.length && !props.renderActions) return null;
  return (
    <>
      {renderActionControls(props, actions, mutation.isPending, setCommand)}
      <DraggableDialog
        isOpen={Boolean(command)}
        onClose={close}
        size="md"
        title={
          command ? `${labels[command]} funding call` : "Funding call action"
        }
      >
        <FormProvider {...form}>
          <form className="space-y-5" onSubmit={submit}>
            {command === "WITHDRAW_FOR_AMENDMENT" ? (
              <p className="text-sm leading-6 text-brand-navy/75">
                This call will return to Draft for editing and require fresh
                approval before publishing. New applications and draft
                submissions will stop. Existing submitted applications, tasks
                and deadlines will continue unchanged.
              </p>
            ) : command === "WITHDRAW" || command === "SUSPEND" ? (
              <p className="text-sm leading-6 text-brand-navy/75">
                New applications and draft submissions will stop. Existing
                submitted applications, tasks and deadlines will continue
                unchanged.
                {command === "WITHDRAW" ? " This withdrawal is permanent." : ""}
              </p>
            ) : null}
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
