import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requirePermission,
  requireAnyPermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedApplication,
  findOwnedApplication,
  findOwnedApplicationByOpportunity,
  findAllApplications,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
  findApplicationById,
  listOwnedApplications,
  updateOwnedApplication,
} from "@/modules/applications/infrastructure/ApplicationRepository";
import { findOwnedBusiness } from "@/db/repositories/BusinessRepository";
import {
  ResourceConflictError,
  ResourceNotFoundError,
  RequestValidationError,
} from "@/lib/resource-errors";
import { resolvePublishedApplicationFormBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { applicationDeclarationsSectionSchema } from "./ApplicationDeclarationSchemas";
import { applicationDocumentRequirements } from "./domain/ApplicationDocumentPolicy";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
  ApplicationUpdateInput,
} from "./ApplicationSchemas";
import {
  applicationBusinessSectionSchema,
  applicationFinancialSectionSchema,
  applicationProjectSectionSchema,
} from "./ApplicationSchemas";
import type { ApplicationListInput, ApplicationPage } from "./ApplicationTypes";
import { listLatestOwnedApplicationDocumentVersions } from "./infrastructure/ApplicationDocumentRepository";
import { readOwnedApplicationDraftResponse } from "./infrastructure/ApplicationResponseRepository";
import {
  decodeApplicationCursor,
  encodeApplicationCursor,
  toApplicationSummary,
  toApplicationView,
} from "./ApplicationRepresentation";

export class ApplicationNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("application draft");
    this.name = "ApplicationNotFoundError";
  }
}

export class ApplicationConflictError extends ResourceConflictError {
  constructor() {
    super(
      "This draft changed in another session. Reload it before saving again.",
    );
    this.name = "ApplicationConflictError";
  }
}

export class ApplicationOpportunityUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("open funding opportunity");
    this.name = "ApplicationOpportunityUnavailableError";
  }
}

export class ApplicationBusinessUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("selected business");
    this.name = "ApplicationBusinessUnavailableError";
  }
}

export class ApplicationBusinessConflictError extends ResourceConflictError {
  constructor() {
    super(
      "This business already has an application for this funding opportunity.",
    );
    this.name = "ApplicationBusinessConflictError";
  }
}

function nextSection(
  section: ApplicationSection,
  completion: ApplicationSectionCompletion,
): ApplicationSection {
  if (section === "business") return "project";
  if (section === "project") return "financial";
  if (section === "financial") return "documents";
  if (section === "documents") return "declarations";
  return completion.business ? "declarations" : "business";
}

function sectionIsComplete(input: ApplicationUpdateInput) {
  if (input.section === "business") {
    return applicationBusinessSectionSchema.safeParse(input.data).success;
  }
  if (input.section === "project") {
    return applicationProjectSectionSchema.safeParse(input.data).success;
  }
  if (input.section === "financial") {
    return applicationFinancialSectionSchema.safeParse(input.data).success;
  }
  if (input.section === "declarations") {
    return applicationDeclarationsSectionSchema.safeParse(input.data).success;
  }
  return false;
}

async function documentsAreComplete(
  ownerUserId: string,
  application: Awaited<ReturnType<typeof findOwnedApplication>> & {},
) {
  if (!application.formVersionId) return false;
  const [documents, form, response] = await Promise.all([
    listLatestOwnedApplicationDocumentVersions(ownerUserId, application.id),
    getFormRuntime(application.formVersionId),
    readOwnedApplicationDraftResponse(ownerUserId, application.id),
  ]);
  if (!form || !response || response.formVersionId !== application.formVersionId) {
    return false;
  }
  const current = new Map(
    documents.map((document) => [document.requirementKey, document]),
  );
  return applicationDocumentRequirements(form, response.values)
    .filter((requirement) => requirement.required)
    .every((requirement) => {
      const document = current.get(requirement.key);
      return document?.storageStatus === "finalized"
        && document.scanStatus === "clean";
    });
}

async function loadOwnedApplication(ownerUserId: string, id: string) {
  const application = await findOwnedApplication(ownerUserId, id);
  if (!application) throw new ApplicationNotFoundError();
  return application;
}

async function requireOwnedSelectedBusiness(
  ownerUserId: string,
  input: ApplicationUpdateInput,
) {
  if (input.section !== "business" || !input.data.businessId) return;
  const business = await findOwnedBusiness(ownerUserId, input.data.businessId);
  if (!business) throw new ApplicationBusinessUnavailableError();
}

export async function listOwnApplications(
  user: AuthenticatedUser | null,
  input: ApplicationListInput,
): Promise<ApplicationPage> {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  const result = await listOwnedApplications({
    after: input.after ? decodeApplicationCursor(input.after) : undefined,
    limit: input.limit,
    ownerUserId: actor.id,
    status: input.status,
  });
  const hasNextPage = result.items.length > input.limit;
  const items = result.items.slice(0, input.limit);
  return {
    counts: result.counts,
    items: items.map(toApplicationSummary),
    nextCursor: hasNextPage ? encodeApplicationCursor(items.at(-1)!) : null,
    total: result.total,
  };
}

export async function getOwnApplication(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  return toApplicationView(await loadOwnedApplication(actor.id, id));
}

export async function createApplication(
  user: AuthenticatedUser | null,
  fundingOpportunityId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationCreate,
  );
  const opportunity =
    await resolvePublishedApplicationFormBinding(fundingOpportunityId);
  if (!opportunity || opportunity.status !== "open") {
    throw new ApplicationOpportunityUnavailableError();
  }
  if (!opportunity.formVersionId) {
    throw new ApplicationOpportunityUnavailableError();
  }
  if (!opportunity.eligibilityRuleSetVersionId) {
    throw new ApplicationOpportunityUnavailableError();
  }
  const existing = await findOwnedApplicationByOpportunity(
    actor.id,
    opportunity.id,
  );
  if (existing) return toApplicationView(existing);
  const id = await createOwnedApplication({
    duplicatePolicy: opportunity.applicationDuplicatePolicy,
    eligibilityRuleSetVersionId: opportunity.eligibilityRuleSetVersionId,
    formVersionId: opportunity.formVersionId,
    fundingOpportunityId: opportunity.id,
    fundingOpportunityTitle: opportunity.title,
    ownerUserId: actor.id,
  });
  const application = id
    ? await loadOwnedApplication(actor.id, id)
    : await findOwnedApplicationByOpportunity(actor.id, opportunity.id);
  if (!application) throw new ApplicationConflictError();
  return toApplicationView(application);
}

export async function updateOwnApplication(
  user: AuthenticatedUser | null,
  id: string,
  input: ApplicationUpdateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnUpdate,
  );
  const current = await loadOwnedApplication(actor.id, id);
  if (current.rowVersion !== input.expectedRowVersion) {
    throw new ApplicationConflictError();
  }
  await requireOwnedSelectedBusiness(actor.id, input);
  const sectionComplete = input.section === "documents"
    ? await documentsAreComplete(actor.id, current)
    : sectionIsComplete(input);
  if (input.section === "documents" && !sectionComplete) {
    throw new RequestValidationError(
      "Upload all required supporting documents before continuing.",
    );
  }
  const completion = {
    ...current.sectionCompletion,
    [input.section]: sectionComplete,
  };
  const currentSection =
    input.intent === "continue"
      ? nextSection(input.section, completion)
      : current.currentSection;
  const update = await updateOwnedApplication(
    actor.id,
    id,
    input,
    completion,
    currentSection,
  );
  if (update.kind === "duplicate_business") {
    throw new ApplicationBusinessConflictError();
  }
  if (update.kind === "conflict") throw new ApplicationConflictError();
  return toApplicationView(await loadOwnedApplication(actor.id, update.id));
}

function requireApplicationReader(user: AuthenticatedUser | null) {
  return requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
}

export async function getApplications(user: AuthenticatedUser | null) {
  const actor = requireApplicationReader(user);
  return can(actor, permissionCodes.fundingApplicationAllRead)
    ? findAllApplications()
    : findApplicationsAssignedTo(actor.id);
}

export async function getApplication(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requireApplicationReader(user);
  return can(actor, permissionCodes.fundingApplicationAllRead)
    ? findApplicationById(id)
    : findAssignedApplicationById(actor.id, id);
}
