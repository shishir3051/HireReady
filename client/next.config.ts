import path from "node:path";
import type { NextConfig } from "next";

// Express API origin. Browser code calls relative /api/* (proxied below, so auth cookies are same-origin);
// server components call `${API_URL}/api/*` directly.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Extra hostnames (no scheme/port) allowed to use dev-only resources such as hot reload, e.g. your LAN IP when
// opening the "Network" URL from another device. Comma-separated in client/.env.local: DEV_ALLOWED_ORIGINS=192.168.1.20
const allowedDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    // client/ has its own lockfile next to the repo-root one; pin the root so Next doesn't guess.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
