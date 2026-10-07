import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.e2e.test.ts"],
    globalSetup: ["./tests/_global-setup.ts"],
    // AI エージェント高速操作ストレスは遷移ラッシュを含むため余裕を持たせます。
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
