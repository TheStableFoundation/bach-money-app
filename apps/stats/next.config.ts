import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for smbCloud nextjs-ssr deploys.
  output: "standalone",
  // Trace workspace deps from the monorepo root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
