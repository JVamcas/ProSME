import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityScreeningSourceAdapter,
  EligibilityScreeningSourceRequest,
  EligibilityScreeningSourceResolution,
} from "../domain/EligibilityDataResolution";
import type {
  EligibilityScreeningSourceKind,
} from "../domain/EligibilityInputDefinition";

export type EligibilitySourceRecord = {
  sourceDefinitionId: string;
  sourceKey: string;
  sourceRecordId: string;
  sourceVersionId: string | null;
  values: Readonly<Record<string, JsonValue>>;
};

export interface EligibilitySourceReader {
  read(
    requests: readonly EligibilityScreeningSourceRequest[],
  ): Promise<readonly EligibilitySourceRecord[]>;
}

function recordIdentity(
  sourceDefinitionId: string,
  sourceVersionId: string | null,
  sourceKey: string,
) {
  return `${sourceDefinitionId}:${sourceVersionId ?? ""}:${sourceKey}`;
}

function valueAtPath(
  values: Readonly<Record<string, JsonValue>>,
  path: string,
):
  | { kind: "INVALID_PATH" }
  | { kind: "MISSING" }
  | { kind: "VALUE"; value: JsonValue } {
  const segments = path.split(".");
  if (
    !segments.length
    || segments.some((segment) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(segment))
  ) {
    return { kind: "INVALID_PATH" };
  }
  let current: JsonValue = values;
  for (const segment of segments) {
    if (
      current === null
      || Array.isArray(current)
      || typeof current !== "object"
      || !Object.hasOwn(current, segment)
    ) {
      return { kind: "MISSING" };
    }
    current = current[segment];
  }
  return { kind: "VALUE", value: current };
}

export function createEligibilitySourceAdapter(
  sourceKind: EligibilityScreeningSourceKind,
  reader: EligibilitySourceReader,
): EligibilityScreeningSourceAdapter {
  return {
    sourceKind,
    async resolve(requests) {
      let records: readonly EligibilitySourceRecord[];
      try {
        records = await reader.read(requests);
      } catch {
        return new Map(requests.map((request) => [
          request.input.id,
          {
            message: `The ${sourceKind} source could not be read.`,
            status: "UNAVAILABLE",
          } satisfies EligibilityScreeningSourceResolution,
        ]));
      }
      const byIdentity = new Map<string, EligibilitySourceRecord[]>();
      for (const record of records) {
        const identity = recordIdentity(
          record.sourceDefinitionId,
          record.sourceVersionId,
          record.sourceKey,
        );
        const matching = byIdentity.get(identity) ?? [];
        matching.push(record);
        byIdentity.set(identity, matching);
      }
      const entries = requests.map((request): [
        string,
        EligibilityScreeningSourceResolution,
      ] => {
        const matching = byIdentity.get(recordIdentity(
          request.binding.sourceDefinitionId,
          request.binding.sourceVersionId,
          request.binding.sourceKey,
        ));
        if (!matching?.length) {
          return [request.input.id, {
            message: `No source record exists for "${request.input.stableKey}".`,
            status: "MISSING",
          } satisfies EligibilityScreeningSourceResolution];
        }
        if (matching.length > 1) {
          return [request.input.id, {
            message: `More than one source record exists for "${request.input.stableKey}".`,
            status: "INVALID",
          } satisfies EligibilityScreeningSourceResolution];
        }
        const record = matching[0]!;
        const resolved = valueAtPath(
          record.values,
          request.binding.valuePath,
        );
        if (resolved.kind === "INVALID_PATH") {
          return [request.input.id, {
            message: `The configured value path is invalid for "${request.input.stableKey}".`,
            status: "INVALID",
          } satisfies EligibilityScreeningSourceResolution];
        }
        if (resolved.kind === "MISSING" || resolved.value === null) {
          return [request.input.id, {
            message: `The configured value path is missing for "${request.input.stableKey}".`,
            status: "MISSING",
          } satisfies EligibilityScreeningSourceResolution];
        }
        return [request.input.id, {
          status: "RESOLVED",
          value: {
            sourceRecordId: record.sourceRecordId,
            value: resolved.value,
          },
        } satisfies EligibilityScreeningSourceResolution];
      });
      return new Map(entries);
    },
  };
}
