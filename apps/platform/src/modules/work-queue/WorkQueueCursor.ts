import { z } from "zod";

const cursorSchema = z.object({
  dueAt: z.iso.datetime().nullable(),
  id: z.uuid(),
});

export type WorkQueueCursor = {
  dueAt: Date | null;
  id: string;
};

export function decodeWorkQueueCursor(value: string): WorkQueueCursor {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return { dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null, id: parsed.id };
  } catch {
    throw new z.ZodError([{
      code: "custom",
      message: "The pagination cursor is invalid.",
      path: ["after"],
    }]);
  }
}

export function encodeWorkQueueCursor(row: {
  dueAt: string | null;
  taskInstanceId: string;
}) {
  return Buffer.from(JSON.stringify({
    dueAt: row.dueAt,
    id: row.taskInstanceId,
  })).toString("base64url");
}
