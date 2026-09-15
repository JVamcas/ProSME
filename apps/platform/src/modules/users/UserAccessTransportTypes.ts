import type { z } from "zod";

import {
  inviteUserSchema,
  promoteUserSchema,
  updateRoleSchema,
  updateUserSchema,
} from "./UserAccessSchemas";

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type PromoteUserInput = z.infer<typeof promoteUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
