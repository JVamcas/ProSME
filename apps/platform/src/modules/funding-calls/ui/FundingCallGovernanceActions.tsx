"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
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
  canWithdrawOwnRequest,
}: {
  call: FundingCallView;
  canApprove: boolean;
  canReturn: boolean;
  canWithdrawOwnRequest: boolean;
}) {
  const governance = useChangeFundingCallGovernanceStatus(call.id);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const form = useForm<ReturnInput>({
    defaultValues: { reason: "" },
    resolver: zodResolver(returnSchema),
  });

  const approve = () => governance.mutate({
    command: "APPROVE",
    expectedRowVersion: call.rowVersion,
  });
  const withdraw = () => governance.mutate({
    command: "WITHDRAW_APPROVAL_REQUEST",
    expectedRowVersion: call.rowVersion,
  });
  const returnForAmendment = form.handleSubmit(async ({ reason }) => {
    await governance.mutateAsync({
      command: "RETURN_FOR_AMENDMENT",
      expectedRowVersion: call.rowVersion,
      reason,
    });
    form.reset();
    setReturnDialogOpen(false);
  });
  const closeReturnDialog = () => {
    if (governance.isPending) return;
    form.reset();
    setReturnDialogOpen(false);
  };

  if (
    call.status !== "APPROVAL_PENDING"
    || (!canApprove && !canReturn && !canWithdrawOwnRequest)
  ) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        {canApprove ? (
          <GeneralButton
            disabled={governance.isPending}
            onClick={approve}
            type="button"
          >
            {governance.isPending ? "Processing…" : "Approve"}
          </GeneralButton>
        ) : null}
        {canWithdrawOwnRequest ? (
          <GeneralButton
            disabled={governance.isPending}
            onClick={withdraw}
            type="button"
            variant="outlineOrange"
          >
            Withdraw approval request
          </GeneralButton>
        ) : null}
        {canReturn ? (
          <GeneralButton
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
            {governance.error ? (
              <p className="text-sm text-red-700" role="alert">
                {governance.error.message}
              </p>
            ) : null}
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

      {governance.error ? (
        <p className="text-sm text-red-700" role="alert">
          {governance.error.message}
        </p>
      ) : null}
    </section>
  );
}
