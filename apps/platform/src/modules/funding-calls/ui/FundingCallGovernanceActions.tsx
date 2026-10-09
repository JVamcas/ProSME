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
import type { FundingCallActionRenderer } from "./FundingCallActionTypes";
import type { DropdownButtonItem } from "@/shared/ui/DropdownButton";

const returnSchema = z.object({
  reason: z.string().trim().min(1, "A return reason is required.").max(1000),
});

type ReturnInput = z.infer<typeof returnSchema>;

function actionButtonLabel(item: DropdownButtonItem, pending: boolean) {
  if (pending && item.id === "submit-for-approval") return "Submitting…";
  if (pending && item.id === "approve") return "Processing…";
  return item.label;
}

export function FundingCallGovernanceActions({
  call,
  canApprove,
  canReturn,
  canSubmit,
  canWithdrawOwnRequest,
  renderActions,
}: {
  call: FundingCallView;
  canApprove: boolean;
  canReturn: boolean;
  canSubmit: boolean;
  canWithdrawOwnRequest: boolean;
  renderActions?: FundingCallActionRenderer;
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

  const approve = () =>
    governance.mutate(
      {
        command: "APPROVE",
        expectedRowVersion: call.rowVersion,
      },
      mutationOptions,
    );
  const submitForApproval = () =>
    governance.mutate(
      {
        command: "SUBMIT_FOR_APPROVAL",
        expectedRowVersion: call.rowVersion,
      },
      mutationOptions,
    );
  const withdraw = () =>
    governance.mutate(
      {
        command: "WITHDRAW_APPROVAL_REQUEST",
        expectedRowVersion: call.rowVersion,
      },
      mutationOptions,
    );
  const returnForAmendment = form.handleSubmit(({ reason }) => {
    governance.mutate(
      {
        command: "RETURN_FOR_AMENDMENT",
        expectedRowVersion: call.rowVersion,
        reason,
      },
      {
        ...mutationOptions,
        onSuccess: () => {
          form.reset();
          setReturnDialogOpen(false);
        },
      },
    );
  });
  const closeReturnDialog = () => {
    if (governance.isPending) return;
    form.reset();
    setReturnDialogOpen(false);
  };

  const canActOnDraft = call.status === "DRAFT" && canSubmit;
  const canActOnPending =
    call.status === "APPROVAL_PENDING" &&
    (canApprove || canReturn || canWithdrawOwnRequest);
  if (!canActOnDraft && !canActOnPending && !renderActions) {
    return null;
  }
  const menuItems: DropdownButtonItem[] = [];
  if (canActOnDraft)
    menuItems.push({
      id: "submit-for-approval",
      label: "Submit for approval",
      onAction: submitForApproval,
      disabled: governance.isPending,
    });
  if (call.status === "APPROVAL_PENDING") {
    if (canApprove)
      menuItems.push({
        id: "approve",
        label: "Approve",
        onAction: approve,
        disabled: governance.isPending,
      });
    if (canWithdrawOwnRequest)
      menuItems.push({
        id: "withdraw-approval",
        label: "Withdraw approval request",
        onAction: withdraw,
        disabled: governance.isPending,
      });
    if (canReturn)
      menuItems.push({
        id: "return-for-amendment",
        label: "Return for amendment",
        onAction: () => setReturnDialogOpen(true),
        disabled: governance.isPending,
      });
  }

  return (
    <>
      {renderActions ? (
        renderActions(menuItems)
      ) : (
        <div className="flex flex-wrap gap-3">
          {menuItems.map((item) => (
            <GeneralButton
              key={item.id}
              disabled={item.disabled}
              onClick={item.onAction}
              type="button"
              size="compact"
              variant={
                item.id === "withdraw-approval" ||
                item.id === "return-for-amendment"
                  ? "outlineOrange"
                  : "primary"
              }
            >
              {actionButtonLabel(item, governance.isPending)}
            </GeneralButton>
          ))}
        </div>
      )}

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
