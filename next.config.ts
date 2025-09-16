import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set the correct root directory to avoid warnings
  outputFileTracingRoot: __dirname,
  
  // Disable turbopack by default for stability
  experimental: {
    turbo: undefined
  }
};

export default nextConfig;
