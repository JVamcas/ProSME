import { applicationDeclarationsSectionSchema } from "../ApplicationDeclarationSchemas";
import {
  declarationVersion,
  privacyNoticeVersion,
} from "../ApplicationDeclarations";
import type { ApplicationDocumentView } from "../api/ApplicationDocumentSchemas";
import { applicationDocumentRequirements } from "./ApplicationDocumentPolicy";
import { activeFormDefinition } from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type ApplicationReadinessBlocker = {
  category:
    | "application"
    | "authority"
    | "business"
    | "configuration"
    | "declaration"
    | "document"
    | "duplicate"
    | "form"
    | "funding_call"
    | "service"
    | "workflow";
  code: string;
  message: string;
  requirementKey?: string;
  sectionKey?: string;
};

export type ApplicationSectionProgress = {
  completedRequired: number;
  key: string;
  percent: number;
  ready: boolean;
  required: number;
  title: string;
};

export type ApplicationReadiness = {
  applicationRowVersion: number;
  blockers: ApplicationReadinessBlocker[];
  evaluatedAt: string;
  formVersionId: string;
  ready: boolean;
  responseRowVersion: number;
  sections: ApplicationSectionProgress[];
};

export type ApplicationPreflight = ApplicationReadiness & {
  readinessToken: string | null;
};

type ReadinessInput = {
  application: {
    businessId: string | null;
    declarationAcceptance: {
      acceptedAt: string;
      declarationVersion: string;
      privacyVersion: string;
    } | null;
    declarationsSection: Record<string, unknown>;
    formVersionId: string;
    rowVersion: number;
    status: string;
  };
  callOpen: boolean;
  configurationAvailable: boolean;
  documents: ApplicationDocumentView[];
  evaluatedAt: Date;
  form: FormRuntimeSchema;
  response: {
    formVersionId: string;
    rowVersion: number;
    values: Record<string, unknown>;
  };
};

function valuesForFields(
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
) {
  const keys = new Set(fields.map((field) => field.key));
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => keys.has(key)),
  );
}

function formSectionProgress(
  input: ReadinessInput,
  blockers: ApplicationReadinessBlocker[],
) {
  const active = activeFormDefinition(input.form, input.response.values);
  const requirements = applicationDocumentRequirements(
    input.form,
    input.response.values,
  );
  const documents = new Map(
    input.documents.map((document) => [document.requirementKey, document]),
  );
  return active.sections.map((section): ApplicationSectionProgress => {
    const sectionFields = active.fields.filter(
      (field) => field.sectionId === section.id && field.type !== "DOCUMENT",
    );
    const requiredFields = sectionFields.filter((field) => field.required);
    const sectionRequirements = requirements.filter(
      (requirement) => requirement.sectionKey === section.key && requirement.required,
    );
    let completedRequired = requiredFields.filter((field) => (
      validateFormValues(
        [field],
        valuesForFields([field], input.response.values),
        true,
      )
    )).length;
    for (const requirement of sectionRequirements) {
      const document = documents.get(requirement.key);
      if (document?.storageStatus === "finalized") {
        completedRequired += 1;
        continue;
      }
      const state = document
        ? "is still being finalized"
        : "has not been uploaded";
      blockers.push({
        category: "document",
        code: document ? "DOCUMENT_PENDING" : "DOCUMENT_MISSING",
        message: `${requirement.label} ${state}.`,
        requirementKey: requirement.key,
        sectionKey: section.key,
      });
    }
    const supplied = valuesForFields(sectionFields, input.response.values);
    if (!validateFormValues(sectionFields, supplied, true)) {
      blockers.push({
        category: "form",
        code: "SECTION_INCOMPLETE",
        message: `Complete the required or invalid fields in ${section.title}.`,
        sectionKey: section.key,
      });
    }
    const required = requiredFields.length + sectionRequirements.length;
    return {
      completedRequired,
      key: section.key,
      percent: required === 0
        ? 100
        : Math.round(completedRequired / required * 100),
      ready: completedRequired === required
        && validateFormValues(sectionFields, supplied, true),
      required,
      title: section.title,
    };
  });
}

function contextualBlockers(input: ReadinessInput) {
  const blockers: ApplicationReadinessBlocker[] = [];
  if (input.application.status !== "draft") {
    blockers.push({
      category: "application",
      code: "APPLICATION_NOT_DRAFT",
      message: "This application is not an editable draft.",
    });
  }
  if (!input.application.businessId) {
    blockers.push({
      category: "business",
      code: "BUSINESS_REQUIRED",
      message: "Select the business represented by this application.",
    });
  }
  const acceptance = input.application.declarationAcceptance;
  const declarationsValid = applicationDeclarationsSectionSchema.safeParse(
    input.application.declarationsSection,
  ).success;
  if (
    !acceptance
    || !declarationsValid
    || acceptance.declarationVersion !== declarationVersion
    || acceptance.privacyVersion !== privacyNoticeVersion
  ) {
    blockers.push({
      category: "declaration",
      code: "DECLARATIONS_REQUIRED",
      message: "Review and accept all current declarations.",
    });
  }
  if (!input.callOpen) {
    blockers.push({
      category: "funding_call",
      code: "SUBMISSION_WINDOW_CLOSED",
      message: "This funding call is not currently accepting submissions.",
    });
  }
  if (!input.configurationAvailable) {
    blockers.push({
      category: "configuration",
      code: "CONFIGURATION_UNAVAILABLE",
      message: "A required application configuration is unavailable.",
    });
  }
  return blockers;
}

export function evaluateApplicationReadiness(
  input: ReadinessInput,
): ApplicationReadiness {
  const blockers = contextualBlockers(input);
  if (input.response.formVersionId !== input.application.formVersionId) {
    blockers.push({
      category: "configuration",
      code: "FORM_VERSION_UNAVAILABLE",
      message: "The application form configuration is unavailable.",
    });
  }
  const sections = formSectionProgress(input, blockers);
  return {
    applicationRowVersion: input.application.rowVersion,
    blockers,
    evaluatedAt: input.evaluatedAt.toISOString(),
    formVersionId: input.application.formVersionId,
    ready: blockers.length === 0 && sections.every((section) => section.ready),
    responseRowVersion: input.response.rowVersion,
    sections,
  };
}
