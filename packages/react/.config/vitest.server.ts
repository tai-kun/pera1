import { defineConfig } from "vitest/config";

import isDebugMode from "./_is-debug-mode.js";

export default defineConfig({
  oxc: {
    target: "es2020",
    jsx: {
      runtime: "automatic",
      development: true,
      importSource: "react",
    },
  },
  define: {
    __DEBUG__: `${isDebugMode}`,
    __CLIENT__: "false",
    __SERVER__: "true",
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/**/*.client.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      reportsDirectory: "./coverage/server",
    },
    setupFiles: [".config/_debugging.ts"],
  },
});
