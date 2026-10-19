import { defineConfig } from "vitest/config";

// Inline postcss stops vitest loading Next's postcss.config.mjs (string plugins it can't parse).
export default defineConfig({
  css: { postcss: {} },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") } },
});
