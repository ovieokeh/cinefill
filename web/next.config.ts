import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The cinefill repo also contains the RN app's package-lock.json at the root.
  // Pinning turbopack.root keeps Next from walking up and selecting the wrong
  // workspace when both lockfiles exist.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
