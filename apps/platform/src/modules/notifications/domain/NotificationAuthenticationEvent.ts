import { z } from "zod";
import { snapshotEmailSchema } from "./NotificationEventSchemaFields";

export const authenticationEventContextSchema = z
  .object({
    firebaseUid: z.string().min(1).max(128),
    recipientEmail: snapshotEmailSchema,
  })
  .strict();

export type AuthenticationEventKey =
  "auth.email.verification" | "auth.password.reset";
