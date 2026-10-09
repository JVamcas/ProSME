import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scopeCmsThemeHeaders } from "./config/scope-cms-theme-headers.js";
import { loadEnvironment } from "./config/load-environment.js";

loadEnvironment();

const applicationRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(applicationRoot, "../..");

/** @type {import("next").NextConfig} */
const nextConfig = {
  agentRules: false,
  experimental: {
    useTypeScriptCli: false,
  },
  output: "standalone",
  // The PostgreSQL parser resolves its WASM file relative to its own loader.
  serverExternalPackages: ["libpg-query"],
  typescript: {
    tsconfigPath:
      process.env.NODE_ENV === "production"
        ? "tsconfig.build.json"
        : "tsconfig.json",
  },
  images: {
    localPatterns: [
      { pathname: "/api/media/file/**" },
      { pathname: "**", search: "" },
    ],
  },
  outputFileTracingRoot: repositoryRoot,
  outputFileTracingIncludes: {
    "/*": ["./node_modules/libpg-query/wasm/libpg-query.wasm"],
    "/api/internal/notifications/process": [
      "./src/modules/notifications/templates/email/auth-*.html",
    ],
  },
  reactStrictMode: true,
};

const payloadConfig = withPayload(nextConfig);
const payloadHeaders = payloadConfig.headers;
payloadConfig.headers = async () =>
  scopeCmsThemeHeaders(await payloadHeaders());

export default payloadConfig;
