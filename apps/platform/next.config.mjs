import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvironment } from "./config/load-environment.js";

loadEnvironment();

const applicationRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(applicationRoot, "../..");

/** @type {import("next").NextConfig} */
const nextConfig = {
  agentRules: false,
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  reactStrictMode: true,
};

export default withPayload(nextConfig);
