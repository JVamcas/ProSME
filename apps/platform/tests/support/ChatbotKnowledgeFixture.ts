import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { FundingCallKnowledgeProjection } from "@/modules/funding-calls/application/ServerFundingCallKnowledgeService";
import type { PublicEligibilityKnowledge } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import { operator } from "@/modules/conditions/domain/Operator";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";

export const chatbotId = (number: number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

export function chatbotActor(
  grants: string[] = [
    permissionCodes.chatbotKnowledgeReadAll,
    permissionCodes.chatbotKnowledgePrepareAll,
    permissionCodes.chatbotKnowledgeApproveAll,
  ],
): AuthenticatedUser {
  return {
    id: chatbotId(1),
    displayName: "Content reviewer",
    email: "review@example.test",
    status: "active",
    userType: "staff",
    identitySubject: "review-fixture",
    capabilities: new Set(grants),
    roleCodes: new Set(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };
}

export function chatbotCall(
  id = chatbotId(10),
  version = chatbotId(20),
): FundingCallKnowledgeProjection {
  return {
    id,
    revisionId: chatbotId(30),
    revisionNumber: 2,
    status: "LIVE",
    eligibilityVersionId: version,
    publicFields: {
      title: "Enterprise fund",
      reference: "CALL-2",
      slug: "enterprise-fund",
      description: "<p>Public enterprise support.</p>",
      eligibilitySummary: "<p>See the self-check criteria.</p>",
      opensAt: "2026-10-01T00:00:00Z",
      closesAt: "2026-11-01T00:00:00Z",
      minimumGrantAmount: "1000.50",
      maximumGrantAmount: "50000.00",
      totalBudgetEnvelope: "1000000.00",
      fundingInstrument: "Grant",
      thematicArea: "Enterprise",
      publicContactName: null,
      publicContactEmail: "public@example.test",
      publicContactPhone: null,
      publicDocuments: [{ label: "Public guide", url: "/resources/guide" }],
    },
  };
}

export function chatbotEligibility(
  version = chatbotId(20),
): PublicEligibilityKnowledge {
  return {
    versions: [{ id: version, versionNumber: 3 }],
    inputs: [
      {
        versionId: version,
        stableKey: "employees",
        label: "Employee count",
        type: "NUMBER",
        selfCheck: {
          prompt: "How many employees?",
          helpText: "Count all employees.",
          explanation: "Use the current count.",
          answerType: "NUMBER",
          required: true,
          options: [],
        },
      },
    ],
    groups: [
      {
        id: chatbotId(40),
        definition: {
          id: chatbotId(40),
          kind: "GROUP",
          combinator: "AND",
          children: [
            {
              id: chatbotId(41),
              kind: "CONDITION",
              operator: operator("LESS_THAN_OR_EQUAL"),
              leftOperand: { kind: "FIELD", key: "eligibility.employees" },
              rightOperand: { kind: "CONSTANT", value: 50 },
            },
          ],
        },
      },
    ],
    rules: [
      {
        id: chatbotId(50),
        versionId: version,
        conditionGroupId: chatbotId(40),
        conditionId: null,
        conditionKind: "GROUP",
        failureType: "HARD_FAIL",
        order: 1,
        applicantMessage:
          "Businesses with more than 50 employees do not meet this criterion.",
      },
    ],
  };
}

export function chatbotFaq(id = "1") {
  return {
    id,
    question: `Question ${id}?`,
    answer: paragraphsToRichText([`Public answer ${id}.`]),
  };
}

export function chatbotSourceFixture() {
  return {
    calls: [chatbotCall()],
    eligibility: chatbotEligibility(),
    faqs: [chatbotFaq()],
  };
}
