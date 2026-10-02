import { z } from "zod";

export const uuidSchema = z.uuid();
export const snapshotNameSchema = z.string().trim().min(1).max(200);
export const snapshotEmailSchema = z.email().max(320);
export const identifierSchema = z.string().trim().min(1).max(500);
export const timestampSchema = z.iso.datetime({ offset: true });

export const applicationOwnerSnapshotSchema = z
  .object({
    displayName: snapshotNameSchema,
    email: snapshotEmailSchema,
    userId: uuidSchema,
  })
  .strict();

