import type { Page } from "playwright";
import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

const ADMIN_EMAIL = "admin@example.com";
const PASSWORD = "password";

/**
 * ログインページから認証し、ダッシュボードへの遷移を待ちます。
 */
async function loginAs(page: Page, email: string = ADMIN_EMAIL): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  const main = page.getByRole("main");
  await main.getByLabel("メールアドレス").fill(email);
  await main.getByLabel("パスワード").fill(PASSWORD);
  await main.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.waitForURL(`${BASE_URL}/app/dashboard`, { timeout: 10_000 });
}

/**
 * AI エージェントの高速操作でもプロジェクト横断の表示が壊れないことを検証します。
 */
describe("SaaS Project Management / AIエージェント高速操作ストレス", () => {
  test("ログインボタンを高速連打してもダッシュボードに到達する", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/login`);
    const main = page.getByRole("main");
    await main.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
    await main.getByLabel("パスワード").fill(PASSWORD);
    const button = main.getByRole("button", { name: "ログイン", exact: true });

    // 実行 (遷移で detach されるため短い timeout で打ち切る)
    await Promise.allSettled([
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
    ]);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/app/dashboard`);
    const dashboard = main.getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("プロジェクト詳細をノーウェイト連続遷移しても最終表示が一致する", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");

    // 実行: 別プロジェクトの別タブを描画待ちなしで行き来する
    for (const target of [
      "/app/projects/apollo/overview",
      "/app/projects/zephyr/overview",
      "/app/projects/apollo/tasks",
      "/app/projects/zephyr/members",
      "/app/projects/apollo/members",
    ]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証: 最後の URL と表示が一致し古いプロジェクト名が残らないこと
    expect(page.url()).toBe(`${BASE_URL}/app/projects/apollo/members`);
    const apollo = main.getByRole("heading", { name: "Project: Apollo" });
    await expect.poll(() => apollo.isVisible(), { timeout: 10_000 }).toBe(true);
    const members = main.getByRole("heading", { name: "Members" });
    await expect.poll(() => members.isVisible(), { timeout: 10_000 }).toBe(true);
    const stale = main.getByRole("heading", { name: "Project: Zephyr" });
    await expect.poll(() => stale.count(), { timeout: 10_000 }).toBe(0);
  });

  test("プロジェクト内タブを高速連打しても最終タブに落ち着く", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    await page.goto(`${BASE_URL}/app/projects/apollo/overview`);
    const main = page.getByRole("main");
    const nav = main.getByRole("navigation", { name: "プロジェクト" });

    // 実行
    await nav.getByRole("link", { name: "Tasks", exact: true }).click();
    await nav.getByRole("link", { name: "Members", exact: true }).click().catch(() => undefined);
    await nav.getByRole("link", { name: "Tasks", exact: true }).click().catch(() => undefined);

    // 検証: URL と見出しのどちらかの正規タブに落ち着くこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/app\/projects\/apollo\/(tasks|members)$/);
    const bodyText = await main.textContent();
    expect(bodyText).toContain("Project: Apollo");
  });

  test("New Project作成ボタンを高速連打しても詳細のいずれかに到達する", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    await page.goto(`${BASE_URL}/app/projects/new`);
    const main = page.getByRole("main");
    const projectName = `Rapid Project ${Date.now()}`;
    await main.getByLabel("プロジェクト名").fill(projectName);
    await main.getByLabel("説明").fill("高速連打テスト");
    const button = main.getByRole("button", { name: "作成" });

    // 実行: 二重送信ラッシュ (重複作成は許容、detach 対策で短い timeout)
    await Promise.allSettled([button.click({ timeout: 3_000 }), button.click({ timeout: 3_000 })]);

    // 検証: 作成したプロジェクト詳細に到達すること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/app\/projects\/.+/);
    expect(page.url()).not.toBe(`${BASE_URL}/app/projects/new`);
    const heading = main.getByRole("heading", { name: `Project: ${projectName}` });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("存在しないプロジェクトを高速で叩いてもNot Foundから復帰できる", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");

    // 実行
    await page.goto(`${BASE_URL}/app/projects/no-such-a/overview`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/app/projects/no-such-b/overview`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/app/projects/apollo/overview`, { waitUntil: "commit" });

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/app/projects/apollo/overview`);
    const apollo = main.getByRole("heading", { name: "Project: Apollo" });
    await expect.poll(() => apollo.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未認証で保護URLを高速連打しても全てloginに誘導される", async ({
    expect,
    page,
  }) => {
    // 実行
    for (const target of ["/app/dashboard", "/app/projects", "/app/notifications"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
      await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/login");
    }
  });

  test("Sidebarを待機なしで連続切替しても表示が一致する", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");
    const menu = page.getByRole("navigation", { name: "アプリメニュー" });

    // 実行
    await menu.getByRole("link", { name: "Notifications", exact: true }).click();
    await menu.getByRole("link", { name: "Settings", exact: true }).click().catch(() => undefined);

    // 検証: いずれかの正規画面に落ち着くこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/(notifications|settings)$/);
    const bodyText = await main.textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });

  test("不正URLラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });
    const main = page.getByRole("main");

    // 実行
    for (const target of [
      "/app/projects/%00%3Cscript%3E/overview",
      `/app/projects/${"x".repeat(2_000)}/tasks`,
      "/app/%2e%2e/no-such-page",
    ]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
      await expect.poll(() => main.textContent(), { timeout: 10_000 }).not.toBe(null);
    }

    // 検証
    await page.goto(`${BASE_URL}/app/dashboard`);
    const dashboard = main.getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("認証済み2タブで別プロジェクトを同時展開しても混線しない", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/app/projects/apollo/overview`),
        secondPage.goto(`${BASE_URL}/app/projects/zephyr/overview`),
      ]);

      // 検証
      const first = page.getByRole("main").getByRole("heading", { name: "Project: Apollo" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("main").getByRole("heading", { name: "Project: Zephyr" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("高速操作ラッシュ中にpageerrorとconsole errorが出ない", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    const main = page.getByRole("main");

    // 実行
    for (const target of ["/app/dashboard", "/app/projects/apollo/tasks", "/app/notifications", "/app/settings", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/app/dashboard`);

    // 検証
    const dashboard = main.getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
