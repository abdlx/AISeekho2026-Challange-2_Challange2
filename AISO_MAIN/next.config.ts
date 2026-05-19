import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Whitelist local IP for development HMR and cross-origin dev resources
  allowedDevOrigins: ['192.168.1.7', 'localhost'],
};

export default nextConfig;
