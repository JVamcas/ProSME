import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { getServerEnvironment } from "@/lib/env/server";

const tokenLifetimeMilliseconds = 5 * 60 * 1000;

const payloadSchema = z.object({
  applicationId: z.uuid(),
  applicationRowVersion: z.number().int().positive(),
  businessUpdatedAt: z.iso.datetime(),
  configurationFingerprint: z.string().length(64),
  documentFingerprint: z.string().length(64),
  expiresAt: z.iso.datetime(),
  issuedAt: z.iso.datetime(),
  ownerUserId: z.uuid(),
  responseRowVersion: z.number().int().positive(),
}).strict();

export type ApplicationPreflightTokenPayload = z.infer<typeof payloadSchema>;

function signature(encodedPayload: string) {
  return createHmac("sha256", getServerEnvironment().PAYLOAD_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

export function createApplicationPreflightToken(
  input: Omit<ApplicationPreflightTokenPayload, "expiresAt" | "issuedAt">,
  issuedAt: Date,
) {
  const payload = payloadSchema.parse({
    ...input,
    expiresAt: new Date(
      issuedAt.getTime() + tokenLifetimeMilliseconds,
    ).toISOString(),
    issuedAt: issuedAt.toISOString(),
  });
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function readApplicationPreflightToken(token: string, now: Date) {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;
  const expected = Buffer.from(signature(encodedPayload));
  const actual = Buffer.from(encodedSignature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const parsed = payloadSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );
    const issuedAt = Date.parse(parsed.issuedAt);
    const expiresAt = Date.parse(parsed.expiresAt);
    if (issuedAt > now.getTime() || expiresAt <= now.getTime()) return null;
    if (expiresAt - issuedAt !== tokenLifetimeMilliseconds) return null;
    return parsed;
  } catch {
    return null;
  }
}
