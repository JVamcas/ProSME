"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { Checkbox, FieldError } from "@/shared/ui/FormPrimitives";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";

import { useWithdrawApplication } from "../ApplicationHooks";
import type { ApplicationSummary } from "../ApplicationTypes";
import {
  applicationWithdrawalSchema,
  type ApplicationWithdrawalInput,
} from "../api/ApplicationWithdrawalSchemas";

type Props = {
  application: ApplicationSummary;
  onCancel: () => void;
  onWithdrawn: () => void;
};

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === ""
    ? undefined
    : value;
}

export function ApplicationWithdrawalForm({
  application,
  onCancel,
  onWithdrawn,
}: Props) {
  const withdrawal = useWithdrawApplication();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const form = useForm<ApplicationWithdrawalInput>({
    resolver: zodResolver(applicationWithdrawalSchema),
  });
  const confirmationError = form.formState.errors.confirmed?.message;

  return (
    <DraggableDialog
      isOpen
      onClose={() => {
        if (!withdrawal.isPending) onCancel();
      }}
      size="md"
      title="Withdraw application"
    >
      <FormProvider {...form}>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((input) => {
            withdrawal.mutate(
              {
                id: application.id,
                idempotencyKey,
                input,
              },
              { onSuccess: onWithdrawn },
            );
          })}
        >
          <p className="text-sm text-brand-navy/75">
            {application.reference} will remain in your records. This action
            cannot be undone from the portal.
          </p>
          <FormInput
            label="Reason code (if applicable)"
            name="reasonCode"
            registrationOptions={{ setValueAs: emptyToUndefined }}
          />
          <FormTextarea
            label="Comment (optional)"
            name="comment"
            registrationOptions={{ setValueAs: emptyToUndefined }}
          />
          <div>
            <label className="flex items-start gap-2 text-sm text-brand-navy">
              <Checkbox
                aria-describedby={confirmationError ? "withdrawal-confirmed-error" : undefined}
                aria-invalid={Boolean(confirmationError)}
                {...form.register("confirmed")}
              />
              <span>I confirm that I want to withdraw this application.</span>
            </label>
            <FieldError
              id="withdrawal-confirmed-error"
              message={confirmationError}
            />
          </div>
          {withdrawal.error ? (
            <p className="text-sm text-red-700" role="alert">
              {withdrawal.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <GeneralButton
              disabled={withdrawal.isPending}
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </GeneralButton>
            <GeneralButton
              disabled={withdrawal.isPending}
              type="submit"
              variant="danger"
            >
              {withdrawal.isPending ? "Withdrawing…" : "Withdraw application"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
