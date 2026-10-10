import { permissionCodes } from "./PermissionCodes";

export const chatbotPermissionCatalogue = [
  {
    code: permissionCodes.chatbotSettingsReadAll,
    label: "Read all chatbot settings",
    description:
      "Read application-wide chatbot availability and AI answer settings. Does not grant knowledge or conversation access.",
  },
  {
    code: permissionCodes.chatbotSettingsUpdateAll,
    label: "Update all chatbot settings",
    description:
      "Turn application-wide chatbot availability and AI answers on or off. Does not grant knowledge or conversation access.",
  },
  {
    code: permissionCodes.chatbotKnowledgeReadAll,
    label: "Read chatbot knowledge resources",
    description:
      "Read published Funding, FAQ and Contact resources and their chatbot activation status. Does not grant conversation access.",
  },
  {
    code: permissionCodes.chatbotKnowledgeActivateAll,
    label: "Activate chatbot knowledge resources",
    description: "Activate published resources, individually or in bulk, for chatbot answers.",
  },
  {
    code: permissionCodes.chatbotKnowledgeDeactivateAll,
    label: "Deactivate chatbot knowledge resources",
    description: "Deactivate resources, individually or in bulk, so the chatbot stops using them.",
  },
  {
    code: permissionCodes.chatbotKnowledgePrepareAll,
    label: "Select and prepare chatbot knowledge",
    description:
      "Select existing published calls and approved FAQs and prepare immutable review snapshots across all calls.",
  },
  {
    code: permissionCodes.chatbotKnowledgeApproveAll,
    label: "Approve exact chatbot knowledge",
    description:
      "Approve an exact prepared content hash after public source revalidation. Does not grant publication or transcript access.",
  },
  {
    code: permissionCodes.chatbotKnowledgePublishAll,
    label: "Publish approved chatbot knowledge",
    description:
      "Publish verified artifacts and activate an approved release across all public sources.",
  },
  {
    code: permissionCodes.chatbotKnowledgeWithdrawAll,
    label: "Withdraw chatbot knowledge",
    description:
      "Withdraw active approved knowledge releases across all public sources.",
  },
  {
    code: permissionCodes.chatbotEscalationReadAssigned,
    label: "Read assigned chatbot follow-up cases",
    description:
      "Read protected history only for cases whose current assignment matches the authenticated user.",
  },
  {
    code: permissionCodes.chatbotEscalationReadAll,
    label: "Read all chatbot follow-up cases",
    description: "Read protected follow-up histories across all cases.",
  },
  {
    code: permissionCodes.chatbotEscalationAssignAll,
    label: "Assign all chatbot follow-up cases",
    description:
      "Assign or reassign protected follow-up cases across all support staff with case access.",
  },
  {
    code: permissionCodes.chatbotEscalationResolveAssigned,
    label: "Resolve assigned chatbot follow-up cases",
    description:
      "Record resolution only for a case whose current assignment matches the authenticated user.",
  },
  {
    code: permissionCodes.chatbotEscalationResolveAll,
    label: "Resolve all chatbot follow-up cases",
    description: "Record resolutions across all protected follow-up cases.",
  },
  {
    code: permissionCodes.chatbotRetentionUpdateAll,
    label: "Configure chatbot retention",
    description:
      "Configure bounded retention and expiry for protected chatbot histories and contact details.",
  },
] as const;
