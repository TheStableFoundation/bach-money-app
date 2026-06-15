import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for smbCloud nextjs-ssr deploys.
  output: "standalone",
  // Trace workspace dependencies (e.g. @bach-money/sdk) from the monorepo root.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
