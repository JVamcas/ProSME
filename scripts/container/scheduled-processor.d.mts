export type ScheduledProcessorConfiguration = {
  endpoint: URL;
  intervalMs: number;
  name: string;
  requestTimeoutMs: number;
  resultFields: readonly string[];
  secret: string;
};

export type ScheduledProcessorDependencies = {
  fetch: (endpoint: URL, options: {
    method: string;
    headers: Record<string, string>;
    signal: AbortSignal;
  }) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;
  heartbeat: (name: string, consecutiveFailures: number) => Promise<void>;
  log: (level: string, event: string, context: Record<string, unknown>) => void;
};

export function createScheduledProcessor(
  configuration: ScheduledProcessorConfiguration,
  dependencies: ScheduledProcessorDependencies,
): { run: () => Promise<void>; stop: () => void };

export function positiveInteger(
  environment: Record<string, string | undefined>,
  name: string,
  fallback: number,
  minimum?: number,
): number;
export function processorEndpoint(value: string): URL;
export function isBatchResult(value: unknown, fields: readonly string[]): boolean;
