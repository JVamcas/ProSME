"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
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
  });

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
      </div>

      {canReturn ? (
        <FormProvider {...form}>
          <form className="space-y-2" onSubmit={returnForAmendment}>
            <label className="block text-sm font-medium" htmlFor="return-reason">
              Return reason
            </label>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
              disabled={governance.isPending}
              id="return-reason"
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-red-700" role="alert">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
            <GeneralButton
              disabled={governance.isPending}
              type="submit"
              variant="outlineOrange"
            >
              Return for amendment
            </GeneralButton>
          </form>
        </FormProvider>
      ) : null}

      {governance.error ? (
        <p className="text-sm text-red-700" role="alert">
          {governance.error.message}
        </p>
      ) : null}
    </section>
  );
}
