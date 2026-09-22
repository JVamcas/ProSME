import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

export const integrationPermissionCatalogue: readonly PermissionDefinition[] = [
  {
    code: permissionCodes.integrationEligibilityRead,
    label: "Read eligibility integrations",
    description:
      "Read eligibility integration definitions, versions and output catalogues.",
  },
  {
    code: permissionCodes.integrationEligibilityCreate,
    label: "Create eligibility integrations",
    description: "Create eligibility integration definitions and draft versions.",
  },
  {
    code: permissionCodes.integrationEligibilityPublish,
    label: "Publish eligibility integrations",
    description: "Publish versioned eligibility integration contracts.",
  },
  {
    code: permissionCodes.integrationEligibilityBind,
    label: "Bind eligibility integrations",
    description:
      "Bind published eligibility integration versions to draft Funding Calls.",
  },
  {
    code: permissionCodes.integrationEligibilityExecute,
    label: "Execute eligibility integrations",
    description: "Execute a bound eligibility integration for an application.",
  },
  {
    code: permissionCodes.integrationEligibilityManualVerify,
    label: "Manually verify eligibility integrations",
    description:
      "Record manual verification for an allowed eligibility integration fallback.",
  },
  {
    code: permissionCodes.integrationErpEnqueue,
    label: "Enqueue ERP events",
    description: "Enqueue an approved ERP integration event.",
  },
];
