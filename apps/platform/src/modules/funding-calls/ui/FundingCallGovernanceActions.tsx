"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { FormTextarea } from "@/components/ui/form-fields";
import type { FundingCallView } from "../api/FundingCallTransport";
import { useChangeFundingCallGovernanceStatus } from "../FundingCallHooks";

const returnSchema = z.object({
  reason: z.string().trim().min(1, "A return reason is required.").max(1000),
});

type ReturnInput = z.infer<typeof returnSchema>;

export function FundingCallGovernanceActions({
  call,
  canApprove,
  canReturn,
  canSubmit,
  canWithdrawOwnRequest,
}: {
  call: FundingCallView;
  canApprove: boolean;
  canReturn: boolean;
  canSubmit: boolean;
  canWithdrawOwnRequest: boolean;
}) {
  const governance = useChangeFundingCallGovernanceStatus(call.id);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const form = useForm<ReturnInput>({
    defaultValues: { reason: "" },
    resolver: zodResolver(returnSchema),
  });
  const mutationOptions = {
    onError: (error: Error) => toast.error(error.message),
  };

  const approve = () => governance.mutate({
    command: "APPROVE",
    expectedRowVersion: call.rowVersion,
  }, mutationOptions);
  const submitForApproval = () => governance.mutate({
    command: "SUBMIT_FOR_APPROVAL",
    expectedRowVersion: call.rowVersion,
  }, mutationOptions);
  const withdraw = () => governance.mutate({
    command: "WITHDRAW_APPROVAL_REQUEST",
    expectedRowVersion: call.rowVersion,
  }, mutationOptions);
  const returnForAmendment = form.handleSubmit(({ reason }) => {
    governance.mutate({
      command: "RETURN_FOR_AMENDMENT",
      expectedRowVersion: call.rowVersion,
      reason,
    }, {
      ...mutationOptions,
      onSuccess: () => {
        form.reset();
        setReturnDialogOpen(false);
      },
    });
  });
  const closeReturnDialog = () => {
    if (governance.isPending) return;
    form.reset();
    setReturnDialogOpen(false);
  };

  const canActOnDraft = call.status === "DRAFT" && canSubmit;
  const canActOnPending = call.status === "APPROVAL_PENDING"
    && (canApprove || canReturn || canWithdrawOwnRequest);
  if (!canActOnDraft && !canActOnPending) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {canActOnDraft ? (
          <GeneralButton
            disabled={governance.isPending}
            onClick={submitForApproval}
            type="button"
            size="compact"
          >
            {governance.isPending ? "Submitting…" : "Submit for approval"}
          </GeneralButton>
        ) : null}
        {call.status === "APPROVAL_PENDING" && canApprove ? (
          <GeneralButton
            size="compact"
            disabled={governance.isPending}
            onClick={approve}
            type="button"
          >
            {governance.isPending ? "Processing…" : "Approve"}
          </GeneralButton>
        ) : null}
        {call.status === "APPROVAL_PENDING" && canWithdrawOwnRequest ? (
          <GeneralButton
            size="compact"
            disabled={governance.isPending}
            onClick={withdraw}
            type="button"
            variant="outlineOrange"
          >
            Withdraw approval request
          </GeneralButton>
        ) : null}
        {call.status === "APPROVAL_PENDING" && canReturn ? (
          <GeneralButton
            size="compact"
            disabled={governance.isPending}
            onClick={() => setReturnDialogOpen(true)}
            type="button"
            variant="outlineOrange"
          >
            Return for amendment
          </GeneralButton>
        ) : null}
      </div>

      <DraggableDialog
        isOpen={returnDialogOpen}
        onClose={closeReturnDialog}
        size="md"
        title="Return for amendment"
      >
        <FormProvider {...form}>
          <form className="space-y-5" onSubmit={returnForAmendment}>
            <FormTextarea
              disabled={governance.isPending}
              id="return-reason"
              label="Return reason"
              name="reason"
              required
              rows={5}
            />
            <div className="flex justify-end gap-3">
              <GeneralButton
                disabled={governance.isPending}
                onClick={closeReturnDialog}
                type="button"
                variant="outline"
              >
                Cancel
              </GeneralButton>
              <GeneralButton
                disabled={governance.isPending}
                type="submit"
                variant="outlineOrange"
              >
                {governance.isPending ? "Returning…" : "Return for amendment"}
              </GeneralButton>
            </div>
          </form>
        </FormProvider>
      </DraggableDialog>
    </>
  );
}
