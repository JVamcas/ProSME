import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

function define(
  code: PermissionDefinition["code"],
  label: string,
  description: string,
): PermissionDefinition {
  return { code, label, description };
}

export const fundingCallPermissionCatalogue: readonly PermissionDefinition[] = [
  define(
    permissionCodes.fundingCallRead,
    "Read funding calls",
    "Read funding calls.",
  ),
  define(
    permissionCodes.fundingCallCreate,
    "Create funding calls",
    "Create draft funding calls.",
  ),
  define(
    permissionCodes.fundingCallEditDraft,
    "Edit draft funding calls",
    "Edit draft funding calls without changing locked configuration attachments.",
  ),
  define(
    permissionCodes.fundingCallApproveAll,
    "Approve funding calls",
    "Approve pending funding calls subject to maker-checker policy.",
  ),
  define(
    permissionCodes.fundingCallSubmitAll,
    "Submit funding calls for approval",
    "Submit any draft funding call for fresh approval after readiness checks.",
  ),
  define(
    permissionCodes.fundingCallReturnAll,
    "Return funding calls for amendment",
    "Return any pending funding call to Draft with a reason.",
  ),
  define(
    permissionCodes.fundingCallWithdrawForAmendmentAll,
    "Withdraw funding calls for amendment",
    "Withdraw any Approved, Scheduled, Live or Suspended funding call to Draft for amendment and fresh approval. Existing application workflows continue.",
  ),
  define(
    permissionCodes.fundingCallApprovalRequestOwnWithdraw,
    "Withdraw own funding call approval requests",
    "Withdraw an approval request submitted by the signed-in user when policy permits.",
  ),
  define(
    permissionCodes.fundingCallPublish,
    "Publish funding calls",
    "Publish funding calls.",
  ),
  define(
    permissionCodes.fundingCallSuspend,
    "Suspend funding calls",
    "Suspend a Scheduled or Live funding call with a reason.",
  ),
  define(
    permissionCodes.fundingCallResume,
    "Resume funding calls",
    "Resume a suspended funding call according to its effective dates.",
  ),
  define(
    permissionCodes.fundingCallWithdraw,
    "Withdraw funding calls",
    "Permanently withdraw a published funding call with a reason.",
  ),
  define(
    permissionCodes.fundingCallArchive,
    "Archive funding calls",
    "Archive a Closed or Withdrawn funding call.",
  ),
  define(
    permissionCodes.fundingCallDelete,
    "Delete funding calls",
    "Delete funding calls.",
  ),
  define(
    permissionCodes.fundingCallEligibilityCreate,
    "Run eligibility checks",
    "Create a funding-call eligibility assessment.",
  ),
  define(
    permissionCodes.fundingCallEligibilityOwnRead,
    "Read own eligibility checks",
    "Read eligibility assessments owned by the signed-in user.",
  ),
];
