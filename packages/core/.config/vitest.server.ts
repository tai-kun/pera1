import { defineConfig } from "vitest/config";

import isDebugMode from "./_is-debug-mode.js";

export default defineConfig({
  oxc: {
    target: "es2020",
  },
  define: {
    __DEBUG__: `${isDebugMode}`,
    __CLIENT__: "false",
    __SERVER__: "true",
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.client.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      // ブラウザー専用のファイルはクライアント側の実行で測定します。
      exclude: [
        "src/engines/navigation-api-engine.ts",
        "src/core/form-data-to-html-form-element.ts",
      ],
      reportsDirectory: "./coverage/server",
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    setupFiles: [".config/_debugging.ts"],
  },
});
