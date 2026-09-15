import { z } from "zod";

const cursorSchema = z.object({
  id: z.uuid(),
  submittedAt: z.iso.datetime(),
});

export type AdminApplicationCursor = {
  id: string;
  submittedAt: Date;
};

export function decodeAdminApplicationCursor(
  value: string,
): AdminApplicationCursor {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return { id: parsed.id, submittedAt: new Date(parsed.submittedAt) };
  } catch {
    throw new z.ZodError([{
      code: "custom",
      message: "The pagination cursor is invalid.",
      path: ["after"],
    }]);
  }
}

export function encodeAdminApplicationCursor(row: {
  applicationId: string;
  submittedAt: string;
}) {
  return Buffer.from(JSON.stringify({
    id: row.applicationId,
    submittedAt: row.submittedAt,
  })).toString("base64url");
}
