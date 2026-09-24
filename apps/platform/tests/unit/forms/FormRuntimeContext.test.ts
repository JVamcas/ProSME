import { describe, expect, it } from "vitest";

import {
  captureFormResponseValues,
  createFormRuntimeBinding,
  exposeFormRuntimeContext,
  InvalidFormRuntimeBindingError,
  readFormContextReference,
} from "@/modules/forms/engine/FormRuntimeContext";
import type { FormField } from "@/modules/forms/FormTypes";

const formVersion = {
  id: "10000000-0000-4000-8000-000000000001",
  status: "PUBLISHED" as const,
};

function binding(hostReferenceId: string) {
  return createFormRuntimeBinding({
    context: {
      exposedPaths: [
        "application.project_title",
        "application.requested_amount",
      ],
      validationReferences: ["application.requested_amount"],
      visibilityReferences: ["application.project_title"],
    },
    formVersion,
    host: {
      referenceId: hostReferenceId,
      type: "WORKFLOW_TASK_DEFINITION",
    },
    key: `TECHNICAL_REVIEW_${hostReferenceId}`,
    principal: { type: "ASSIGNED_REVIEWER" },
  });
}

describe("form runtime context contract", () => {
  it("reuses one published Form Version in distinct bindings", () => {
    const technicalReview = binding("TASK_ONE");
    const financialReview = binding("TASK_TWO");

    expect(technicalReview.formVersionId).toBe(formVersion.id);
    expect(financialReview.formVersionId).toBe(formVersion.id);
    expect(technicalReview.host).not.toEqual(financialReview.host);
  });

  it("rejects bindings to versions that are not published", () => {
    expect(() => createFormRuntimeBinding({
      ...binding("TASK_ONE"),
      formVersion: { ...formVersion, status: "DRAFT" },
    })).toThrow(InvalidFormRuntimeBindingError);
  });

  it("exposes only selected context as immutable runtime data", () => {
    const runtimeBinding = binding("TASK_ONE");
    const context = exposeFormRuntimeContext(runtimeBinding, {
      "application.internal_score": 95,
      "application.project_title": "Harbour expansion",
      "application.requested_amount": 2_000_000,
    });

    expect(context).toEqual({
      "application.project_title": "Harbour expansion",
      "application.requested_amount": 2_000_000,
    });
    expect(Object.isFrozen(context)).toBe(true);
    expect(context).not.toHaveProperty("application.internal_score");
  });

  it("allows only usage-specific context references", () => {
    const runtimeBinding = binding("TASK_ONE");
    const context = exposeFormRuntimeContext(runtimeBinding, {
      "application.project_title": "Harbour expansion",
      "application.requested_amount": 2_000_000,
    });

    expect(readFormContextReference(
      runtimeBinding,
      context,
      "application.project_title",
      "VISIBILITY",
    )).toBe("Harbour expansion");
    expect(() => readFormContextReference(
      runtimeBinding,
      context,
      "application.project_title",
      "VALIDATION",
    )).toThrow(InvalidFormRuntimeBindingError);
  });

  it("requires every allowed reference to be exposed", () => {
    expect(() => createFormRuntimeBinding({
      context: {
        exposedPaths: ["application.project_title"],
        validationReferences: ["application.requested_amount"],
        visibilityReferences: [],
      },
      formVersion,
      host: { referenceId: "TASK_ONE", type: "WORKFLOW_TASK_DEFINITION" },
      key: "TECHNICAL_REVIEW",
      principal: { type: "ASSIGNED_REVIEWER" },
    })).toThrow(InvalidFormRuntimeBindingError);
  });

  it("keeps context values out of captured Form responses", () => {
    const fields: FormField[] = [{
      columnSpan: 1,
      key: "RECOMMENDATION",
      label: "Recommendation",
      order: 1,
      required: true,
      sectionId: "20000000-0000-4000-8000-000000000001",
      type: "TEXTAREA",
    }];

    expect(captureFormResponseValues(fields, {
      RECOMMENDATION: "Proceed",
    })).toEqual({ RECOMMENDATION: "Proceed" });
    expect(() => captureFormResponseValues(fields, {
      "application.project_title": "Harbour expansion",
      RECOMMENDATION: "Proceed",
    })).toThrow(InvalidFormRuntimeBindingError);
  });
});
