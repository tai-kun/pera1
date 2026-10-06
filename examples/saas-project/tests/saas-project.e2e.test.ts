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

describe("SaaS Project Management", () => {
  test("未認証で /app/dashboard を開くと /login に遷移しログイン後に戻る", async ({
    expect,
    page,
  }) => {
    // 準備と実行: 未認証で保護URLを直接開く
    await page.goto(`${BASE_URL}/app/dashboard`);

    // 検証: ログインへ redirect され redirectTo が受け渡されること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/login");
    expect(page.url()).toContain(`redirectTo=${encodeURIComponent("/app/dashboard")}`);
    const loginHeading = page.getByRole("main").getByRole("heading", { name: "ログイン" });
    await expect.poll(() => loginHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: ログインする
    const main = page.getByRole("main");
    await main.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
    await main.getByLabel("パスワード").fill(PASSWORD);
    await main.getByRole("button", { name: "ログイン", exact: true }).click();

    // 検証: 元のURLに戻ること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/app/dashboard`);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("プロジェクトを選択してタブを切り替え Back で戻る", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    await page.goto(`${BASE_URL}/app/projects`);
    const main = page.getByRole("main");
    const projects = main.getByRole("heading", { name: "Projects" });
    await expect.poll(() => projects.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Apollo を選択
    await main.getByRole("link", { name: "Apollo" }).first().click();

    // 検証: overview に誘導されること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/app/projects/apollo/overview`);
    const projectHeading = main.getByRole("heading", { name: "Project: Apollo" });
    await expect.poll(() => projectHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const overview = main.getByRole("heading", { name: "Overview" });
    await expect.poll(() => overview.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Tasks を選択
    const projectNav = main.getByRole("navigation", { name: "プロジェクト" });
    await projectNav.getByRole("link", { name: "Tasks", exact: true }).click();

    // 検証: /tasks に遷移したこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/app/projects/apollo/tasks`);
    const tasks = main.getByRole("heading", { name: "Tasks" });
    await expect.poll(() => tasks.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Members を選択
    await projectNav.getByRole("link", { name: "Members", exact: true }).click();

    // 検証: /members に遷移したこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/app/projects/apollo/members`);
    const members = main.getByRole("heading", { name: "Members" });
    await expect.poll(() => members.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Browser Back
    await page.goBack();

    // 検証: Tasks に戻ったこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/app/projects/apollo/tasks`);
    const backTasks = main.getByRole("heading", { name: "Tasks" });
    await expect.poll(() => backTasks.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Index Route で /app は Dashboard を /app/projects/xxx は Overview を表示する", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");

    // 実行: /app を開く
    await page.goto(`${BASE_URL}/app`);

    // 検証: Dashboard に誘導されること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/app/dashboard`);
    const dashboard = main.getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: /app/projects/zephyr を開く
    await page.goto(`${BASE_URL}/app/projects/zephyr`);

    // 検証: overview に誘導されること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/app/projects/zephyr/overview`);
    const projectHeading = main.getByRole("heading", { name: "Project: Zephyr" });
    await expect.poll(() => projectHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const overview = main.getByRole("heading", { name: "Overview" });
    await expect.poll(() => overview.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("New Project を作成すると詳細に遷移する", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    await page.goto(`${BASE_URL}/app/projects/new`);
    const main = page.getByRole("main");

    // 検証: new が正しく表示されること (/:projectId との競合なし)
    const newHeading = main.getByRole("heading", { name: "New Project" });
    await expect.poll(() => newHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/app/projects/new`);

    // 実行: フォームを送信する
    const projectName = `E2E Project ${Date.now()}`;
    await main.getByLabel("プロジェクト名").fill(projectName);
    await main.getByLabel("説明").fill("E2E テストで作成しました。");
    await main.getByRole("button", { name: "作成" }).click();

    // 検証: 作成したプロジェクトの詳細に遷移すること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toMatch(/\/app\/projects\/.+/);
    expect(page.url()).not.toBe(`${BASE_URL}/app/projects/new`);
    const projectHeading = main.getByRole("heading", { name: `Project: ${projectName}` });
    await expect.poll(() => projectHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Deep Link でタスクを直接開く", async ({ expect, page }) => {
    // 準備: 先にログインする
    await loginAs(page);

    // 実行: Deep Link
    await page.goto(`${BASE_URL}/app/projects/apollo/tasks`);

    // 検証
    const main = page.getByRole("main");
    const projectHeading = main.getByRole("heading", { name: "Project: Apollo" });
    await expect.poll(() => projectHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const tasks = main.getByRole("heading", { name: "Tasks" });
    await expect.poll(() => tasks.isVisible(), { timeout: 10_000 }).toBe(true);
    const taskItem = main.getByText("プロトタイプを構築する");
    await expect.poll(() => taskItem.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Dynamic Route で内容が変わり存在しない ID は Not Found になる", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");

    // 準備と実行: /app/projects/apollo/overview
    await page.goto(`${BASE_URL}/app/projects/apollo/overview`);
    const apollo = main.getByRole("heading", { name: "Project: Apollo" });
    await expect.poll(() => apollo.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: /app/projects/zephyr/overview
    await page.goto(`${BASE_URL}/app/projects/zephyr/overview`);
    const zephyr = main.getByRole("heading", { name: "Project: Zephyr" });
    await expect.poll(() => zephyr.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 存在しない ID
    await page.goto(`${BASE_URL}/app/projects/no-such-project/overview`);
    const notFound = main.getByRole("heading", { name: "プロジェクトが見つかりません" });
    await expect.poll(() => notFound.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Sidebar から Notifications と Settings に遷移できる", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    const main = page.getByRole("main");
    const menu = page.getByRole("navigation", { name: "アプリメニュー" });

    // 実行: Notifications を選択
    await menu.getByRole("link", { name: "Notifications", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/app/notifications`);
    const notifications = main.getByRole("heading", { name: "Notifications" });
    await expect.poll(() => notifications.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Settings を選択
    await menu.getByRole("link", { name: "Settings", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/app/settings`);
    const settings = main.getByRole("heading", { name: "Settings" });
    await expect.poll(() => settings.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ログアウトすると /login に遷移する", async ({ expect, page }) => {
    // 準備
    await loginAs(page);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "Dashboard" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Sidebar の Logout を押す
    const menu = page.getByRole("navigation", { name: "アプリメニュー" });
    await menu.getByRole("button", { name: "Logout", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/login`);
    const loginHeading = page.getByRole("main").getByRole("heading", { name: "ログイン" });
    await expect.poll(() => loginHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
