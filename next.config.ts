import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  // Esconde o indicador flutuante do Next em `npm run dev` (overlay de erro continua).
  devIndicators: false,
};

export default nextConfig;
