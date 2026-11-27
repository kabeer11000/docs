import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Inline postcss stops vitest loading Next's postcss.config.mjs (string plugins it can't parse).
// fileURLToPath decodes the path (a URL pathname keeps "%20" for spaces and breaks the alias).
export default defineConfig({
  css: { postcss: {} },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
