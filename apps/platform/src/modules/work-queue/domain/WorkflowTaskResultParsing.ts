import {
  documentResultSchema,
  scoreResultSchema,
  validateChecklistResult,
  validateEligibilityResult,
} from "@/modules/workflows/WorkflowTaskRegistry";
import type {
  ChecklistResultItem,
  DocumentResultItem,
  ScoreResultItem,
} from "../TaskTypes";

export function parseChecklistResult(result: unknown) {
  if (result === null) return [];
  const parsed = validateChecklistResult(result);
  return parsed.success
    ? (parsed.data as { items: ChecklistResultItem[] }).items
    : [];
}

export function parseEligibilityResult(result: unknown) {
  if (result === null) return null;
  const parsed = validateEligibilityResult(result);
  return parsed.success ? parsed.data : null;
}

export function parseDocumentResult(result: unknown): DocumentResultItem[] {
  const parsed = documentResultSchema.safeParse(result);
  return parsed.success ? parsed.data.documents : [];
}

export function parseScoreResult(result: unknown): ScoreResultItem[] {
  const parsed = scoreResultSchema.safeParse(result);
  return parsed.success ? parsed.data.scores : [];
}
