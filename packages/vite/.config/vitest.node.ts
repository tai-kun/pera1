import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    target: "es2020",
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      // CLI の配線だけを行うエントリーは単体テストの対象外にします。
      exclude: ["src/cli.ts"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
