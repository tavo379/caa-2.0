// @ts-check
import { defineConfig } from "astro/config";
import sanity from "@sanity/astro";
import { loadEnv } from "vite";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnv(process.env.NODE_ENV ?? "development", root, "");

export default defineConfig({
  site: "http://localhost:4321",
  output: "static",
  integrations: [
    sanity({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || "production",
      apiVersion: env.SANITY_API_VERSION || "2025-02-19",
      useCdn: (env.SANITY_USE_CDN || "true") === "true",
    }),
  ],
});
