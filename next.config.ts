import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_API_URL || "https://taskflow-api-h6pq.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: BACKEND_URL + "/:path*",
      },
      {
        source: "/auth/:path*",
        destination: BACKEND_URL + "/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
