import { randomBytes } from "node:crypto";

export function createCsrfToken() {
  return randomBytes(32).toString("base64url");
}
