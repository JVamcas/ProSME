import "server-only";

import { getDeploymentEnvironment } from "@/lib/env/server";

export const gcsObjectPathSegments = {
  cms: ["cms"],
  users: ["users"],
  utilities: {
    brand: ["utilities", "brand"],
    emailTemplates: ["utilities", "templates", "email"],
    fundingCalls: ["utilities", "funding-calls"],
  },
} as const;

export function resolveGcsObjectPath(...segments: readonly string[]) {
  return [getDeploymentEnvironment(), ...segments].join("/");
}
