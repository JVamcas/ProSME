import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const applicationRoot = fileURLToPath(new URL("..", import.meta.url));

function applyFallbackValue(target, fallbackNames) {
  if (process.env[target]) {
    return;
  }

  for (const fallbackName of fallbackNames) {
    if (process.env[fallbackName]) {
      process.env[target] = process.env[fallbackName];
      return;
    }
  }
}

export function loadEnvironment() {
  config({ path: path.join(applicationRoot, "../../.env"), quiet: true });
  config({ path: path.join(applicationRoot, ".env"), quiet: true });

  applyFallbackValue("PUBLIC_FIREBASE_API_KEY", [
    "FIREBASE_WEB_API_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
  ]);
  applyFallbackValue("PUBLIC_FIREBASE_APP_ID", [
    "FIREBASE_WEB_APP_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ]);
  applyFallbackValue("PUBLIC_FIREBASE_AUTH_DOMAIN", [
    "FIREBASE_WEB_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  ]);
  applyFallbackValue("PUBLIC_FIREBASE_PROJECT_ID", [
    "FIREBASE_WEB_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ]);
  applyFallbackValue("PUBLIC_SITE_URL", ["SITE_URL", "NEXT_PUBLIC_SITE_URL"]);
}
