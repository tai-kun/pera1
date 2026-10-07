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

describe("管理画面", () => {
  test("未認証で /dashboard を開くと /login に遷移しログイン後に戻る", async ({
    expect,
    page,
  }) => {
    // 準備と実行: 未認証で保護 URL を直接開く
    await page.goto(`${BASE_URL}/dashboard`);

    // 検証: ログインへ redirect され redirectTo が受け渡されること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/login");
    expect(page.url()).toContain(`redirectTo=${encodeURIComponent("/dashboard")}`);
    const loginHeading = page.getByRole("main").getByRole("heading", { name: "ログイン" });
    await expect.poll(() => loginHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: ログインする
    const main = page.getByRole("main");
    await main.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
    await main.getByLabel("パスワード").fill(PASSWORD);
    await main.getByRole("button", { name: "ログイン", exact: true }).click();

    // 検証: 元の URL に戻ること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("認証情報が誤っているときはエラーを表示する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/login`);
    const main = page.getByRole("main");
    const loginHeading = main.getByRole("heading", { name: "ログイン" });
    await expect.poll(() => loginHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await main.getByLabel("メールアドレス").fill(ADMIN_EMAIL);
    await main.getByLabel("パスワード").fill("wrong-password");
    await main.getByRole("button", { name: "ログイン", exact: true }).click();

    // 検証
    const alert = main.getByRole("alert");
    await expect.poll(() => alert.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await alert.textContent()).toBe("メールアドレスまたはパスワードが正しくありません。");
    expect(page.url()).toBe(`${BASE_URL}/login`);
  });

  test("設定のタブを切り替えると URL が変わりリロードで維持される", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`${BASE_URL}/settings/profile`);
    const main = page.getByRole("main");
    const profile = main.getByRole("heading", { name: "プロフィール設定" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);

    // 検証: Profile タブが選択状態であること
    const tabs = page.getByRole("navigation", { name: "設定" });
    expect(await tabs.getByRole("link", { name: "Profile", exact: true }).getAttribute("aria-current")).toBe(
      "page",
    );

    // 実行: Security タブをクリック
    await tabs.getByRole("link", { name: "Security", exact: true }).click();

    // 検証: URL と画面が切り替わること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/settings/security`);
    const security = main.getByRole("heading", { name: "セキュリティ設定" });
    await expect.poll(() => security.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(
      await tabs.getByRole("link", { name: "Security", exact: true }).getAttribute("aria-current"),
    ).toBe("page");

    // 実行: リロード
    await page.reload();

    // 検証: Security が維持されること
    const restored = main.getByRole("heading", { name: "セキュリティ設定" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/settings/security`);
  });

  test("/settings 単体は /settings/profile に誘導される", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);

    // 実行
    await page.goto(`${BASE_URL}/settings`);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/settings/profile`);
    const profile = page.getByRole("main").getByRole("heading", { name: "プロフィール設定" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("一般ユーザーは /admin から /dashboard に戻される", async ({ expect, page }) => {
    // 準備
    await loginAs(page, USER_EMAIL);

    // 実行
    await page.goto(`${BASE_URL}/admin`);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("管理者は /admin を表示できる", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);

    // 実行
    await page.goto(`${BASE_URL}/admin`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "管理者ページ" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ログアウトすると /login に遷移する", async ({ expect, page }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Sidebar の Logout を押す
    const menu = page.getByRole("navigation", { name: "管理メニュー" });
    await menu.getByRole("button", { name: "Logout", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/login`);
    const loginHeading = page.getByRole("main").getByRole("heading", { name: "ログイン" });
    await expect.poll(() => loginHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Deep Link でユーザー詳細を直接開き存在しない ID は Not Found になる", async ({
    expect,
    page,
  }) => {
    // 準備
    await loginAs(page, ADMIN_EMAIL);

    // 実行: Deep Link
    await page.goto(`${BASE_URL}/users/2`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Alice" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const email = main.getByText("alice@example.com");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 存在しない ID
    await page.goto(`${BASE_URL}/users/999`);

    // 検証
    const notFound = main.getByRole("heading", { name: "ユーザーが見つかりません" });
    await expect.poll(() => notFound.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ブラウザ履歴を戻る・進むで移動できる", async ({ expect, page }) => {
    // 準備: ログイン後に Dashboard → Users → User 詳細へ進む
    await loginAs(page, ADMIN_EMAIL);
    const dashboard = page.getByRole("main").getByRole("heading", { name: "ダッシュボード" });
    await expect.poll(() => dashboard.isVisible(), { timeout: 10_000 }).toBe(true);
    const menu = page.getByRole("navigation", { name: "管理メニュー" });
    await menu.getByRole("link", { name: "Users", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/users`);
    const users = page.getByRole("main").getByRole("heading", { name: "ユーザー一覧" });
    await expect.poll(() => users.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.getByRole("main").getByRole("link", { name: "Alice", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/users/2`);

    // 実行と検証: Back → Back → Forward
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/users`);
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/dashboard`);
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/users`);
    const forwarded = page.getByRole("main").getByRole("heading", { name: "ユーザー一覧" });
    await expect.poll(() => forwarded.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
