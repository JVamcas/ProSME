import "server-only";

import type { DatabaseTransaction } from "@/db/client";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import { readWorkflowEligibilityValueRecords } from "@/modules/workflows/infrastructure/WorkflowEligibilityValueRepository";
import type {
  EligibilityEvaluationRuleSet,
} from "../domain/EligibilityEvaluation";
import type {
  EligibilityScreeningSourceKind,
} from "../domain/EligibilityInputDefinition";
import { listEligibilityInputs } from "../infrastructure/EligibilityInputRepository";
import {
  eligibilityInputPathsForEvaluation,
  resolveScreeningEligibilityInputs,
} from "./EligibilityInputResolver";
import {
  createEligibilitySourceAdapter,
  type EligibilitySourceReader,
  type EligibilitySourceRecord,
} from "./EligibilitySourceAdapter";
import { createEligibilityIntegrationOutputAdapter } from "./EligibilityIntegrationOutputAdapter";

type SourceObject = Readonly<Record<string, JsonValue>>;

type ScreeningResolutionInput = {
  applicationId: string;
  applicationSourceVersionId: string | null;
  applicationValues: SourceObject;
  database: DatabaseTransaction;
  evaluatedAt: Date;
  fundingCallId: string;
  fundingCallValues: SourceObject;
  ruleSet: EligibilityEvaluationRuleSet;
};

function valueAtPath(
  values: SourceObject,
  path: string,
): JsonValue | undefined {
  let current: JsonValue = values;
  for (const segment of path.split(".")) {
    if (
      current === null
      || Array.isArray(current)
      || typeof current !== "object"
      || !Object.hasOwn(current, segment)
    ) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function objectReader(input: {
  recordId: string;
  sourceVersionId: string | null;
  values: SourceObject;
}): EligibilitySourceReader {
  return {
    async read(requests) {
      return requests.flatMap((request): EligibilitySourceRecord[] => {
        if (request.binding.sourceVersionId !== input.sourceVersionId) return [];
        const value = valueAtPath(input.values, request.binding.sourceKey);
        if (value === undefined) return [];
        return [{
          sourceDefinitionId: request.binding.sourceDefinitionId,
          sourceKey: request.binding.sourceKey,
          sourceRecordId: input.recordId,
          sourceVersionId: input.sourceVersionId,
          values: { value },
        }];
      });
    },
  };
}

function workflowReader(
  database: DatabaseTransaction,
  sourceKind: EligibilityScreeningSourceKind,
): EligibilitySourceReader {
  return {
    read(requests) {
      return readWorkflowEligibilityValueRecords(
        requests.filter((request) => request.binding.sourceKind === sourceKind),
        database,
      );
    },
  };
}

export async function resolveAuthoritativeEligibilityData(
  input: ScreeningResolutionInput,
) {
  const inputs = await listEligibilityInputs(
    input.ruleSet.versionId,
    input.database,
  );
  const workflowKinds = [
    "WORKFLOW_FORM_FIELD",
    "SCREENING_CHECKLIST_ITEM",
    "DOCUMENT_REQUIREMENT_FACT",
    "MANUAL_ASSESSMENT",
  ] as const;
  return resolveScreeningEligibilityInputs({
    adapters: [
      createEligibilitySourceAdapter(
        "APPLICATION_FORM_FIELD",
        objectReader({
          recordId: input.applicationId,
          sourceVersionId: input.applicationSourceVersionId,
          values: input.applicationValues,
        }),
      ),
      createEligibilitySourceAdapter(
        "FUNDING_CALL_FIELD",
        objectReader({
          recordId: input.fundingCallId,
          sourceVersionId: null,
          values: input.fundingCallValues,
        }),
      ),
      ...workflowKinds.map((sourceKind) => createEligibilitySourceAdapter(
        sourceKind,
        workflowReader(input.database, sourceKind),
      )),
      createEligibilityIntegrationOutputAdapter(input.database),
    ],
    applicationId: input.applicationId,
    evaluatedAt: input.evaluatedAt,
    inputs,
    paths: eligibilityInputPathsForEvaluation(input.ruleSet, "SCREENING"),
  });
}
