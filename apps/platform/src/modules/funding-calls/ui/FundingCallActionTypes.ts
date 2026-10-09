import type { ReactNode } from "react";
import type { DropdownButtonItem } from "@/shared/ui/DropdownButton";

export type FundingCallActionRenderer = (
  items: DropdownButtonItem[],
) => ReactNode;

export type FundingCallActionPermissions = {
  canApprove: boolean;
  canArchive: boolean;
  canPublish: boolean;
  canReturn: boolean;
  canResume: boolean;
  canSubmit: boolean;
  canSuspend: boolean;
  canUpdate: boolean;
  canWithdraw: boolean;
  canWithdrawForAmendment: boolean;
  canWithdrawOwnRequest: boolean;
};
