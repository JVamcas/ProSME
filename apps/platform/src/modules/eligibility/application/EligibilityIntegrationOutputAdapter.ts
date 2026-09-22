import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityScreeningSourceAdapter,
  EligibilityScreeningSourceResolution,
} from "../domain/EligibilityDataResolution";
import { readLatestEligibilityIntegrationExecutions } from "../infrastructure/EligibilityIntegrationRepository";
import type { DatabaseTransaction } from "@/db/client";

export function createEligibilityIntegrationOutputAdapter(
  database: DatabaseTransaction,
): EligibilityScreeningSourceAdapter {
  return {
    sourceKind: "INTEGRATION_OUTPUT",
    async resolve(requests) {
      const applicationId = requests[0]?.applicationId;
      if (!applicationId) return new Map();
      const invalid = requests.filter(
        (request) => request.binding.valuePath !== "value",
      );
      const valid = requests.filter(
        (request) => request.binding.valuePath === "value",
      );
      const versionIds = [...new Set(valid.map(
        (request) => request.binding.sourceVersionId!,
      ))];
      const executions = valid.length
        ? await readLatestEligibilityIntegrationExecutions(
            applicationId,
            versionIds,
            database,
          )
        : [];
      const byVersion = new Map(executions.map((execution) => [
        execution.integrationVersionId,
        execution,
      ]));
      const invalidEntries = invalid.map((request): [
        string,
        EligibilityScreeningSourceResolution,
      ] => [request.input.id, {
        message: "The configured integration output path is invalid.",
        status: "INVALID",
      }]);
      const resolvedEntries = valid.map((request): [
        string,
        EligibilityScreeningSourceResolution,
      ] => {
        const execution = byVersion.get(request.binding.sourceVersionId!);
        if (!execution) {
          return [request.input.id, {
            message: "The configured integration has not produced a result.",
            status: "MISSING",
          }];
        }
        if (execution.status === "TIMED_OUT") {
          return [request.input.id, {
            message: "The configured integration timed out after its retry policy.",
            status: "UNAVAILABLE",
          }];
        }
        if (execution.status === "UNAVAILABLE") {
          return [request.input.id, {
            message: execution.failureMessage
              ?? "The configured integration is unavailable.",
            status: "UNAVAILABLE",
          }];
        }
        const value = execution.normalizedOutputs[
          request.binding.sourceKey
        ] as JsonValue | undefined;
        if (value === undefined || value === null) {
          return [request.input.id, {
            message: `Integration output "${request.binding.sourceKey}" is missing.`,
            status: "MISSING",
          }];
        }
        return [request.input.id, {
          status: "RESOLVED",
          value: {
            sourceRecordId: execution.executionId,
            value,
          },
        }];
      });
      return new Map([...invalidEntries, ...resolvedEntries]);
    },
  };
}
