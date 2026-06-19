import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.postradamus.ai" }],
        destination: "https://postradamus.ai/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
