import { withPayload } from "@payloadcms/next/withPayload";
import { loadEnvironment } from "./config/load-environment.js";

loadEnvironment();

/** @type {import("next").NextConfig} */
const nextConfig = {
  agentRules: false,
  reactStrictMode: true,
};

export default withPayload(nextConfig);
