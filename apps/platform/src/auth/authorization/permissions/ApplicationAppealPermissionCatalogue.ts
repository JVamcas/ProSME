import { permissionCodes } from "./PermissionCodes";

export const applicationAppealPermissionCatalogue = [
  {
    code: permissionCodes.applicationAppealReadAll,
    label: "Read all application appeals",
    description:
      "Read application appeal submissions and contact details across all applications. Application records require separate access.",
  },
  {
    code: permissionCodes.applicationAppealAssignAll,
    label: "Assign all application appeals",
    description:
      "Assign or reassign appeals to active staff with appeal read access. Requires appeal read permission.",
  },
  {
    code: permissionCodes.applicationAppealResolveAll,
    label: "Resolve all application appeals",
    description:
      "Record a resolution note and resolve appeals across all applications. Requires appeal read permission; does not change application decisions.",
  },
] as const;
