"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AuthoritativeEligibilityExecutionResult,
  clientWorkQueueService,
} from "@/modules/work-queue/ClientWorkQueueService";
import { useEvaluateAuthoritativeEligibility } from "@/modules/work-queue/ui/useWorkQueue";
import { EligibilityTerminationDialog } from "./EligibilityTerminationDialog";

type Input = Parameters<typeof clientWorkQueueService.evaluateEligibility>[1];
type PendingConfirmation = {
  input: Input;
  resolve: (result: AuthoritativeEligibilityExecutionResult | null) => void;
  reject: (error: unknown) => void;
};

export function useEligibilityTerminationConfirmation(taskId: string) {
  const evaluation = useEvaluateAuthoritativeEligibility(taskId);
  const mutate = evaluation.mutateAsync;
  const pending = useRef<PendingConfirmation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const cancel = useCallback(() => {
    const confirmation = pending.current;
    pending.current = null;
    setIsOpen(false);
    confirmation?.resolve(null);
  }, []);

  useEffect(() => cancel, [cancel, taskId]);

  const confirm = useCallback(() => {
    const confirmation = pending.current;
    if (!confirmation) return;
    pending.current = null;
    setIsOpen(false);
    void mutate({ ...confirmation.input, confirmHardFailure: true }).then(
      (result) => {
        if ("confirmationRequired" in result) {
          confirmation.reject(
            new Error("Eligibility confirmation could not be completed."),
          );
        } else {
          confirmation.resolve(result);
        }
      },
      confirmation.reject,
    );
  }, [mutate]);

  async function mutateAsync(input: Input) {
    const snapshot = structuredClone(input);
    const result = await mutate(snapshot);
    if (!("confirmationRequired" in result)) return result;
    return new Promise<AuthoritativeEligibilityExecutionResult | null>(
      (resolve, reject) => {
        pending.current = { input: snapshot, resolve, reject };
        setIsOpen(true);
      },
    );
  }

  return {
    error: evaluation.error,
    isPending: evaluation.isPending || isOpen,
    mutateAsync,
    confirmationDialog: isOpen ? (
      <EligibilityTerminationDialog onCancel={cancel} onConfirm={confirm} />
    ) : null,
  };
}
