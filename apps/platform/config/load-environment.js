import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const applicationRoot = fileURLToPath(new URL("..", import.meta.url));

export function loadEnvironment() {
  config({ path: path.join(applicationRoot, "../../.env.local"), quiet: true });
  config({ path: path.join(applicationRoot, ".env.local"), quiet: true });
}
