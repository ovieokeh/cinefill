import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Static export — all routes prerender; Coolify serves from `out/` via nginx.
  output: "export",
  // next/image's server-side optimizer doesn't run without a Node runtime;
  // images ship at their source dimensions instead.
  images: { unoptimized: true },
  // The cinefill repo also contains the RN app's package-lock.json at the root.
  // Pinning turbopack.root keeps Next from walking up and selecting the wrong
  // workspace when both lockfiles exist.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
