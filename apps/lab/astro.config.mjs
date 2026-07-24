// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnv(process.env.NODE_ENV ?? "development", root, "");

export default defineConfig({
  site: env.SITE_URL || "http://localhost:3002",
  output: "static",
});
