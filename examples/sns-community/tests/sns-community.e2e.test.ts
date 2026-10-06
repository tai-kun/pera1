import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

describe("SNS / Community", () => {
  test("ホームに案内とナビを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Home" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const feedLink = main.getByRole("link", { name: "フィードを見る" });
    await expect.poll(() => feedLink.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await feedLink.getAttribute("href")).toBe("/feed");
    const header = page.getByRole("banner");
    const messagesNav = header.getByRole("link", { name: "Messages" });
    await expect.poll(() => messagesNav.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await messagesNav.getAttribute("href")).toBe("/messages");
  });

  test("プロフィールのタブで遷移しリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/users/alice`);
    const main = page.getByRole("main");
    const profile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);
    const defaultPosts = main.getByRole("heading", { name: "Posts" });
    await expect.poll(() => defaultPosts.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Posts を選択
    const profileNav = main.getByRole("navigation", { name: "プロフィール" });
    await profileNav.getByRole("link", { name: "Posts", exact: true }).click();

    // 検証: /users/alice/posts に遷移したこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/users/alice/posts`);
    const postsHeading = main.getByRole("heading", { name: "Posts" });
    await expect.poll(() => postsHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const alicePost = main.getByText("フィルムカメラで撮った写真");
    await expect.poll(() => alicePost.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Followers を選択
    await profileNav.getByRole("link", { name: "Followers", exact: true }).click();

    // 検証: URL が変わったこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(
      `${BASE_URL}/users/alice/followers`,
    );
    const followersHeading = main.getByRole("heading", { name: "Followers" });
    await expect.poll(() => followersHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: リロード
    await page.reload();

    // 検証: 状態が維持されていること
    expect(page.url()).toBe(`${BASE_URL}/users/alice/followers`);
    const restored = main.getByRole("heading", { name: "Followers" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    const restoredProfile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => restoredProfile.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("メッセージを選択して Back で戻りリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/messages`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Messages" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const placeholder = main.getByText("会話を選択してください。");
    await expect.poll(() => placeholder.isVisible(), { timeout: 10_000 }).toBe(true);

    const listNav = main.getByRole("navigation", { name: "会話一覧" });

    // 実行: Conversation A を選択
    await listNav.getByRole("link", { name: /Conversation a/ }).click();

    // 検証: /messages/a に遷移したこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/messages/a`);
    const detailA = main.getByRole("heading", { name: /Conversation a/ });
    await expect.poll(() => detailA.isVisible(), { timeout: 10_000 }).toBe(true);
    const messageA = main.getByText("先日の記事を読みました。");
    await expect.poll(() => messageA.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Conversation B を選択
    await listNav.getByRole("link", { name: /Conversation b/ }).click();

    // 検証: /messages/b に遷移したこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/messages/b`);
    const detailB = main.getByRole("heading", { name: /Conversation b/ });
    await expect.poll(() => detailB.isVisible(), { timeout: 10_000 }).toBe(true);
    const messageB = main.getByText("旅行の写真を見ました。");
    await expect.poll(() => messageB.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Browser Back
    await page.goBack();

    // 検証: A に戻ったこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/messages/a`);
    const backA = main.getByRole("heading", { name: /Conversation a/ });
    await expect.poll(() => backA.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 進んで B を開き直してリロード
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/messages/b`);
    await page.reload();

    // 検証: B が維持されていること
    expect(page.url()).toBe(`${BASE_URL}/messages/b`);
    const restoredB = main.getByRole("heading", { name: /Conversation b/ });
    await expect.poll(() => restoredB.isVisible(), { timeout: 10_000 }).toBe(true);
    const restoredMessage = main.getByText("旅行の写真を見ました。");
    await expect.poll(() => restoredMessage.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Deep Link で直接開く", async ({ expect, page }) => {
    // 準備と実行: プロフィールの投稿
    await page.goto(`${BASE_URL}/users/alice/posts`);
    const main = page.getByRole("main");

    // 検証
    const profile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);
    const posts = main.getByRole("heading", { name: "Posts" });
    await expect.poll(() => posts.isVisible(), { timeout: 10_000 }).toBe(true);

    // 準備と実行: 会話
    await page.goto(`${BASE_URL}/messages/b`);

    // 検証
    const detail = main.getByRole("heading", { name: /Conversation b/ });
    await expect.poll(() => detail.isVisible(), { timeout: 10_000 }).toBe(true);
    const message = main.getByText("旅行の写真を見ました。");
    await expect.poll(() => message.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Dynamic Route で内容が変わり存在しないユーザーは Not Found を表示する", async ({
    expect,
    page,
  }) => {
    const main = page.getByRole("main");

    // 準備と実行: /users/alice
    await page.goto(`${BASE_URL}/users/alice`);
    const alice = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => alice.isVisible(), { timeout: 10_000 }).toBe(true);
    const alicePost = main.getByText("フィルムカメラで撮った写真");
    await expect.poll(() => alicePost.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: /users/bob
    await page.goto(`${BASE_URL}/users/bob`);
    const bob = main.getByRole("heading", { name: "Bob Sato" });
    await expect.poll(() => bob.isVisible(), { timeout: 10_000 }).toBe(true);
    const bobPost = main.getByText("TypeScript 7.0 のリリースノート");
    await expect.poll(() => bobPost.first().isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 存在しないユーザー
    await page.goto(`${BASE_URL}/users/no-such-user`);
    const notFound = main.getByRole("heading", { name: "ユーザーが見つかりません" });
    await expect.poll(() => notFound.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 存在しない会話
    await page.goto(`${BASE_URL}/messages/no-such-id`);
    const noConversation = main.getByRole("heading", { name: "会話が見つかりません" });
    await expect.poll(() => noConversation.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ブラウザ履歴を戻る・進むで移動できる", async ({ expect, page }) => {
    // 準備: Home → Feed → Explore
    await page.goto(`${BASE_URL}/`);
    const main = page.getByRole("main");
    const home = main.getByRole("heading", { name: "Home" });
    await expect.poll(() => home.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/feed`);
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/explore`);
    const explore = main.getByRole("heading", { name: "Explore" });
    await expect.poll(() => explore.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行と検証: Back → Back → Forward
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/feed`);
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/feed`);
    const forwarded = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => forwarded.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("a タグ遷移後に Back で戻りリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/feed`);
    const main = page.getByRole("main");
    const feed = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => feed.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: a タグでプロフィールへ
    await main.getByRole("link", { name: "alice" }).first().click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/users/alice");
    const profile = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => profile.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Back で戻る
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/feed`);
    const back = main.getByRole("heading", { name: "Feed" });
    await expect.poll(() => back.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 進んでリロード
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("/users/alice");
    await page.reload();
    expect(page.url()).toContain("/users/alice");
    const restored = main.getByRole("heading", { name: "Alice Tanaka" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
