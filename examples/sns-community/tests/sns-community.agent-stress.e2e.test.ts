import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * AI エージェントの高速操作 (タブ連打・会話切替ラッシュ・履歴スパム) でも壊れないことを検証します。
 */
describe("SNS / Community / AI エージェント高速操作ストレス", () => {
  test("プロフィール間をノーウェイト連続遷移しても最終表示が一致する", async ({
    expect,
    page,
  }) => {
    // 準備と実行
    for (const target of ["/users/alice", "/users/bob", "/users/alice/posts", "/users/bob", "/users/alice/followers"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証: 最後のプロフィールだけが表示されること
    expect(page.url()).toBe(`${BASE_URL}/users/alice/followers`);
    const main = page.getByRole("main");
    const profile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);
    const followers = main.getByRole("heading", { name: "Followers" });
    await expect.poll(() => followers.isVisible(), { timeout: 10_000 }).toBe(true);
    const stale = main.getByRole("heading", { name: "Bob Sato" });
    await expect.poll(() => stale.count(), { timeout: 10_000 }).toBe(0);
  });

  test("会話を高速切替しても最終会話の内容が一致する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/messages`);
    const main = page.getByRole("main");
    const listNav = main.getByRole("navigation", { name: "会話一覧" });
    await expect.poll(() => listNav.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 待機なしで A → B → A と切り替える
    await listNav.getByRole("link", { name: /Conversation a/ }).click();
    await listNav.getByRole("link", { name: /Conversation b/ }).click().catch(() => undefined);
    await listNav.getByRole("link", { name: /Conversation a/ }).click().catch(() => undefined);

    // 検証: URL と見出し・本文のいずれかの正規会話に落ち着くこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/messages\/[ab]$/);
    const bodyText = await main.textContent();
    expect(["先日の記事を読みました。", "旅行の写真を見ました。"]).toContainEqual(
      ["先日の記事を読みました。", "旅行の写真を見ました。"].find((text) => bodyText?.includes(text)),
    );
  });

  test("同一会話リンクを高速連打しても単一の会話に落ち着く", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/messages`);
    const main = page.getByRole("main");
    const listNav = main.getByRole("navigation", { name: "会話一覧" });
    const link = listNav.getByRole("link", { name: /Conversation a/ });
    await expect.poll(() => link.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    const results = await Promise.allSettled([
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
    ]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/messages/a`);
    const detail = main.getByRole("heading", { name: /Conversation a/ });
    await expect.poll(() => detail.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("プロフィールタブを高速連打しても最終タブに落ち着く", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/users/alice`);
    const main = page.getByRole("main");
    const nav = main.getByRole("navigation", { name: "プロフィール" });
    await expect.poll(() => nav.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await nav.getByRole("link", { name: "Followers", exact: true }).click();
    await nav.getByRole("link", { name: "Posts", exact: true }).click().catch(() => undefined);
    await nav.getByRole("link", { name: "Followers", exact: true }).click().catch(() => undefined);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/users\/alice\/(posts|followers)$/);
    const bodyText = await main.textContent();
    expect(bodyText).toContain("Alice Tanaka");
  });

  test("存在しないユーザーと会話を高速で叩いても復帰できる", async ({ expect, page }) => {
    // 実行
    await page.goto(`${BASE_URL}/users/no-such-rapid`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/messages/no-such-rapid`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/feed`, { waitUntil: "commit" });

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/feed`);
    const main = page.getByRole("main");
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("フィードの a タグを待機なしで辿ってもプロフィールに到達する", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/feed`);
    const main = page.getByRole("main");
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 描画直後に即クリックする (AI の先読み操作)
    await main.getByRole("link", { name: "alice" }).first().click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/users/alice");

    // 検証
    const profile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Back/Forward とリロードの複合ラッシュでもフィードに復帰できる", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/feed`);
    await page.goto(`${BASE_URL}/explore`);

    // 実行
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/feed`);

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/feed`);
    const main = page.getByRole("main");
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("不正 URL ラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行
    for (const target of [
      "/users/%00%3Cscript%3E",
      `/users/${"u".repeat(2_000)}/posts`,
      "/messages/%2e%2e%2fexplore",
      "/no-such-page",
    ]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証
    await page.goto(`${BASE_URL}/`);
    const main = page.getByRole("main");
    const home = main.getByRole("heading", { name: "Home" });
    await expect.poll(() => home.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("2 タブで別プロフィールを同時展開しても混線しない", async ({ expect, page }) => {
    // 準備
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/users/alice`),
        secondPage.goto(`${BASE_URL}/users/bob`),
      ]);

      // 検証
      const first = page.getByRole("main").getByRole("heading", { name: "Alice Tanaka" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("main").getByRole("heading", { name: "Bob Sato" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("高速操作ラッシュ中に pageerror と console error が出ない", async ({
    expect,
    page,
  }) => {
    // 準備
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
    for (const target of ["/", "/feed", "/explore", "/users/alice/posts", "/messages/a", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/feed`);

    // 検証
    const main = page.getByRole("main");
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
