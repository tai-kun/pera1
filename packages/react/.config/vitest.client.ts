import { playwright } from "@vitest/browser-playwright";
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
    __CLIENT__: "true",
    __SERVER__: "false",
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      reportsDirectory: "./coverage/client",
    },
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [".config/_debugging.ts"],
  },
});
