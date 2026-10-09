import { RequestValidationError } from "@/lib/resource-errors";

export const reportQueryLimits = {
  sqlBytes: 32_768,
  astNodes: 10_000,
  astDepth: 40,
  parameters: 32,
  statementTimeoutMs: 30_000,
  lockTimeoutMs: 1_000,
  executionTimeoutMs: 60_000,
  rows: 100_000,
  bytes: 25 * 1024 * 1024,
  batchRows: 250,
  concurrency: 2,
} as const;

export class ReportQueryValidationError extends RequestValidationError {
  constructor(message: string) {
    super(message);
    this.name = "ReportQueryValidationError";
  }
}
