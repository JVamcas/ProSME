import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityIntegrationExecutionResult,
  EligibilityIntegrationOutputDefinition,
  EligibilityIntegrationProviderAdapter,
  EligibilityIntegrationVersion,
} from "./EligibilityIntegration";

type Sleep = (milliseconds: number) => Promise<void>;

function valueMatchesType(value: JsonValue, type: string) {
  if (type === "BOOLEAN") return typeof value === "boolean";
  if (type === "NUMBER") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (type === "DATE") {
    return typeof value === "string"
      && !Number.isNaN(Date.parse(value));
  }
  return typeof value === "string";
}

export function validateIntegrationOutputs(
  schema: readonly EligibilityIntegrationOutputDefinition[],
  outputs: Readonly<Record<string, JsonValue>>,
) {
  const issues = schema.flatMap((output) => {
    if (!Object.hasOwn(outputs, output.key)) {
      return [`Output "${output.key}" is missing.`];
    }
    return valueMatchesType(outputs[output.key]!, output.type)
      ? []
      : [`Output "${output.key}" is not a valid ${output.type} value.`];
  });
  const declared = new Set(schema.map((output) => output.key));
  for (const key of Object.keys(outputs)) {
    if (!declared.has(key)) issues.push(`Output "${key}" is not declared.`);
  }
  return issues;
}

function timeout<T>(promise: Promise<T>, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException(
      "The integration request timed out.",
      "TimeoutError",
    )), milliseconds);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

function retainedRawResponse(
  version: EligibilityIntegrationVersion,
  rawResponse: JsonValue | undefined,
) {
  return version.rawResponsePolicy.kind === "RETAIN"
    ? rawResponse ?? null
    : null;
}

export async function executeEligibilityIntegration(input: {
  adapter: EligibilityIntegrationProviderAdapter;
  applicationId: string;
  fundingCallId: string;
  provider: {
    secretReference: string | null;
  };
  sleep?: Sleep;
  version: EligibilityIntegrationVersion;
}): Promise<EligibilityIntegrationExecutionResult> {
  const sleep = input.sleep ?? ((milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastFailure = "The integration provider is unavailable.";
  let lastStatus: "UNAVAILABLE" | "TIMED_OUT" = "UNAVAILABLE";

  for (let attempt = 1; attempt <= input.version.retryPolicy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    try {
      const result = await timeout(input.adapter.execute({
        applicationId: input.applicationId,
        fundingCallId: input.fundingCallId,
        secretReference: input.provider.secretReference,
        signal: controller.signal,
      }), input.version.retryPolicy.timeoutMs);
      const issues = validateIntegrationOutputs(
        input.version.outputSchema,
        result.normalizedOutputs,
      );
      if (issues.length) {
        return {
          attemptCount: attempt,
          failureMessage: issues.join(" "),
          normalizedOutputs: {},
          rawResponse: retainedRawResponse(input.version, result.rawResponse),
          status: "UNAVAILABLE",
        };
      }
      return {
        attemptCount: attempt,
        failureMessage: null,
        normalizedOutputs: result.normalizedOutputs,
        rawResponse: retainedRawResponse(input.version, result.rawResponse),
        status: result.status,
      };
    } catch (error) {
      controller.abort();
      const timedOut = error instanceof DOMException
        && error.name === "TimeoutError";
      lastStatus = timedOut ? "TIMED_OUT" : "UNAVAILABLE";
      lastFailure = timedOut
        ? "The integration request timed out."
        : "The integration provider is unavailable.";
      if (attempt < input.version.retryPolicy.maxAttempts) {
        await sleep(input.version.retryPolicy.initialBackoffMs * attempt);
      }
    }
  }
  return {
    attemptCount: input.version.retryPolicy.maxAttempts,
    failureMessage: lastFailure,
    normalizedOutputs: {},
    rawResponse: null,
    status: lastStatus,
  };
}
