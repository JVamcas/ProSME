import { z } from "zod";

import {
  permissionCatalogue,
  type PermissionCode,
} from "@/auth/authorization/permissions";
import { userStatuses } from "./UserAccessTypes";

const roleCodes = z.array(z.string().trim().min(1).max(120)).max(50);

export const listUsersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  search: z.string().trim().max(120).optional(),
  status: z.enum(userStatuses).optional(),
});

export const updateUserSchema = z
  .object({
    roleCodes: roleCodes.optional(),
    status: z.enum(userStatuses).optional(),
  })
  .refine((input) => input.status || input.roleCodes, {
    message: "Provide a status or role assignment change.",
  });

export const inviteUserSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  roleCodes: roleCodes.min(1),
});

export const promoteUserSchema = z.object({
  roleCodes: roleCodes.min(1),
});

export const updateRoleSchema = z.object({
  capabilityCodes: z
    .array(
      z.enum(
        permissionCatalogue.map((permission) => permission.code) as [
          PermissionCode,
          ...PermissionCode[],
        ],
      ),
    )
    .max(250),
  description: z.string().trim().max(500).nullable(),
  name: z.string().trim().min(2).max(160),
});

export const authorizationAuditListSchema = z.object({
  action: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
