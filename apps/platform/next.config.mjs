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
  serverExternalPackages: ["libpg-query", "pdf-parse", "mammoth"],
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
    "/api/portal/applications/*/documents": [
      "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "../../node_modules/@napi-rs/canvas/**/*",
      "../../node_modules/@napi-rs/canvas-*/*.node",
      "../../node_modules/@napi-rs/canvas-*/package.json",
    ],
    "/api/admin/chatbot/knowledge/documents": [
      "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      // PDF.js uses createRequire at runtime, which tracing can miss.
      "../../node_modules/@napi-rs/canvas/**/*",
      "../../node_modules/@napi-rs/canvas-*/*.node",
      "../../node_modules/@napi-rs/canvas-*/package.json",
    ],
    "/api/internal/notifications/process": [
      "./src/modules/notifications/templates/email/auth-*.html",
      "./src/modules/notifications/templates/email/application-appeal-acknowledged.html",
    ],
  },
  reactStrictMode: true,
};

const payloadConfig = withPayload(nextConfig);
const payloadHeaders = payloadConfig.headers;
payloadConfig.headers = async () =>
  scopeCmsThemeHeaders(await payloadHeaders());

export default payloadConfig;
