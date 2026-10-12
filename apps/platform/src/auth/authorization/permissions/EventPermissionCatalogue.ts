import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

export const eventPermissionCatalogue: readonly PermissionDefinition[] = [
  {
    code: permissionCodes.eventRegistrationsReadAll,
    label: "Read participants for all events",
    description: "Read and search participant records for any event. Does not grant registration settings or email delivery access.",
  },
  {
    code: permissionCodes.eventRegistrationSettingsReadAll,
    label: "Read registration settings for all events",
    description: "Read registration windows and event email configuration for any event without access to participants.",
  },
  {
    code: permissionCodes.eventRegistrationSettingsUpdateAll,
    label: "Update registration settings for all events",
    description: "Change registration windows and confirmation/reminder configuration for any event. Does not grant CMS publication or participant access.",
  },
  {
    code: permissionCodes.eventEmailDeliveryReadAll,
    label: "Read email delivery for all events",
    description: "Read confirmation and reminder delivery status for any event. Does not grant event editing or participant administration.",
  },
];
