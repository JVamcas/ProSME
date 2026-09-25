import type { getDatabase } from "@/db/client";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type { SequentialTransitionResult } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";

export type FormTaskCompletionTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type ExecuteFormTaskTransition = (
  transaction: FormTaskCompletionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    correlationId: string;
    sourceStageInstanceId: string;
  },
) => Promise<SequentialTransitionResult>;

export type FormTaskCompletionInput = {
  actionKey: string | null;
  actorId: string;
  correlationId: string;
  expectedTaskRowVersion: number;
  expectedResponseRowVersion?: number;
  idempotencyKey: string;
  taskInstanceId: string;
  formVersionId: string;
  definitionSnapshot: FormRuntimeSchema;
  values: Record<string, unknown>;
};

export type FormTaskCompletionResult = {
  actionKey: string | null;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "IN_PROGRESS" | "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};
