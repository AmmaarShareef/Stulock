import type { NextConfig } from "next";
import path from "node:path";
import { securityHeaders } from "./lib/security-headers";
const nextConfig: NextConfig = { outputFileTracingRoot: path.join(process.cwd(), "../.."), async headers() { return [{ source: "/:path*", headers: [...securityHeaders] }]; } };
export default nextConfig;
