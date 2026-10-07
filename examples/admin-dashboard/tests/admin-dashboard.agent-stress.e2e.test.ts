import type { Page } from "playwright";
import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

const ADMIN_EMAIL = "admin@example.com";
const USER_EMAIL = "alice@example.com";
const PASSWORD = "password";

/**
 * ログインページから認証し、ダッシュボードへの遷移を待ちます。
 */
async function loginAs(page: Page, email: string, password: string = PASSWORD): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  const main = page.getByRole("main");
  await main.getByLabel("メールアドレス").fill(email);
  await main.getByLabel("パスワード").fill(password);
  await main.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
}

/**
 * AI エージェントの高速操作 (認証連打・ガード回避ラッシュ・履歴スパム) でも壊れないことを検証します。
 */
describe("管理画面 / AIエージェント高速操作ストレス", () => {
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

    // 実行: 二重送信ラッシュ (遷移で detach されるため短い timeout で打ち切る)
    await Promise.allSettled([
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
    ]);

    // 検証: 重複ログインでも正しく誘導されること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    const dashboard = main.getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("0ms間隔タイピングでログインできる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/login`);
    const main = page.getByRole("main");
    const email = main.getByLabel("メールアドレス");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 人間では不可能な速度で入力して即送信
    await email.click();
    await email.pressSequentially(ADMIN_EMAIL, { delay: 0 });
    await main.getByLabel("パスワード").pressSequentially(PASSWORD, { delay: 0 });
    await main.getByRole("button", { name: "ログイン", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    const dashboard = main.getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未認証で保護URLを高速連打しても全てloginに誘導される", async ({
    expect,
    page,
  }) => {
    // 実行: 複数の保護URLを描画待ちなしで叩く
    const guards = ["/dashboard", "/users", "/admin", "/settings/profile"];
    for (const target of guards) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
      await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/login");
    }

    // 検証: 最後に正規ログインすれば dashboard に戻れること
    const main = page.getByRole("main");
    await main.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
    await main.getByLabel("パスワード").fill(PASSWORD);
    await main.getByRole("button", { name: "ログイン", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).not.toContain("/login");
  });

  test("認証後に保護ページをノーウェイト連続遷移しても表示が一致する", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    const main = page.getByRole("main");

    // 実行
    for (const target of ["/users", "/users/2", "/settings/security", "/dashboard", "/admin"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証: 最終画面が正しく表示されること
    expect(page.url()).toBe(`${BASE_URL}/admin`);
    const heading = main.getByRole("heading", { name: "管理者ページ" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("設定タブを高速切替してもURLと選択状態が一致する", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`${BASE_URL}/settings/profile`);
    const tabs = page.getByRole("navigation", { name: "設定" });

    // 実行: タブを待機なしで往復する
    await tabs.getByRole("link", { name: "Security", exact: true }).click();
    await tabs.getByRole("link", { name: "Profile", exact: true }).click().catch(() => undefined);
    await tabs.getByRole("link", { name: "Security", exact: true }).click().catch(() => undefined);

    // 検証: 最終 URL の画面が表示され aria-current が一致すること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/settings/");
    const main = page.getByRole("main");
    const bodyText = await main.textContent();
    expect(bodyText).toContain("設定");
    const current = await tabs
      .getByRole("link", { name: "Security", exact: true })
      .getAttribute("aria-current")
      .catch(() => null);
    const profileCurrent = await tabs
      .getByRole("link", { name: "Profile", exact: true })
      .getAttribute("aria-current")
      .catch(() => null);
    expect([current, profileCurrent]).toContain("page");
  });

  test("一般ユーザーで管理ページを高速で叩いてもdashboardに戻される", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page, USER_EMAIL);

    // 実行
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "commit" });

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    const main = page.getByRole("main");
    const dashboard = main.getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ログアウト直後に保護ページへ高速アクセスしてもloginに戻る", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    const menu = page.getByRole("navigation", { name: "管理メニュー" });
    await menu.getByRole("button", { name: "Logout", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/login`);

    // 実行: ログアウト直後に保護URLへ即アクセスする
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "commit" });

    // 検証: 再度 login に誘導されること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/login");
  });

  test("不正URLラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行
    for (const target of [
      "/users/%00%3Cscript%3E",
      `/users/${"9".repeat(2_000)}`,
      "/settings/%2e%2e/admin",
      "/no-such-page",
    ]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証: 正規ページに復帰できること
    await page.goto(`${BASE_URL}/dashboard`);
    const main = page.getByRole("main");
    const dashboard = main.getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("認証済み2タブで別画面を同時展開しても混線しない", async ({ expect, page }) => {
    // 準備: 2 枚目のタブにも認証状態を引き継ぐ (同一コンテキスト = localStorage 共有)
    await loginAs(page, ADMIN_EMAIL);
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/users`),
        secondPage.goto(`${BASE_URL}/dashboard`),
      ]);

      // 検証
      const users = page.getByRole("main").getByRole("heading", { name: "ユーザー一覧" });
      await expect.poll(() => users.isVisible(), { timeout: 10_000 }).toBe(true);
      const dashboard = secondPage.getByRole("main").getByRole("heading", { name: "ダッシュボード" });
      await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("高速操作ラッシュ中にpageerrorとconsole errorが出ない", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
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

    // 実行
    for (const target of ["/dashboard", "/users", "/users/2", "/settings/profile", "/admin", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/dashboard`);

    // 検証
    const main = page.getByRole("main");
    const dashboard = main.getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
