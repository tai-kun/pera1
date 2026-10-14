import { chromium, type Browser, type Page } from "playwright";
import { test as vitest } from "vitest";

/**
 * テストごとに独立したページを提供するフィクスチャーです。
 * ブラウザーはワーカー内で共有し、コンテキストはテストごとに作り直します。
 */
export const test = vitest.extend<{ browser: Browser; page: Page }>({
  browser: [
    async ({}, use) => {
      const browser = await chromium.launch();
      await use(browser);
      await browser.close();
    },
    { scope: "worker" },
  ],
  page: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
