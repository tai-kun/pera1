import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

describe("ブログ", () => {
  test("ホームに記事一覧と About への案内を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/`);

    // 検証
    const welcome = page.getByRole("heading", { name: "ようこそ" });
    await expect.poll(() => welcome.isVisible(), { timeout: 10_000 }).toBe(true);
    const main = page.getByRole("main");
    const postsLink = main.getByRole("link", { name: "記事一覧を見る" });
    await expect.poll(() => postsLink.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await postsLink.getAttribute("href")).toBe("/posts");
    const aboutLink = main.getByRole("link", { name: "このブログについて" });
    await expect.poll(() => aboutLink.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await aboutLink.getAttribute("href")).toBe("/about");
  });

  test("記事一覧から記事を開き Back to Posts で戻る", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/posts`);
    const listHeading = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => listHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 記事をクリック
    await page.getByRole("link", { name: "React 入門" }).click();

    // 検証: 記事詳細に遷移したこと
    const heading = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts/1`);

    // 実行: Back to Posts で戻る
    await page.getByRole("link", { name: "Back to Posts" }).click();

    // 検証: 記事一覧に戻ったこと
    const back = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => back.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts`);
  });

  test("ブラウザバックで記事詳細から一覧に戻る", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/posts`);
    const listHeading = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => listHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await page.getByRole("link", { name: "React Hooks 実践" }).click();
    const heading = page.getByRole("heading", { name: "React Hooks 実践" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts/2`);
    await page.goBack();

    // 検証
    const back = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => back.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts`);
  });

  test("Deep Link で記事を直接開く", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/posts/1`);

    // 検証
    const heading = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const body = page.getByText("コンポーネントと JSX の解説");
    await expect.poll(() => body.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Dynamic Route で内容が変わり存在しない記事は 404 を表示する", async ({
    expect,
    page,
  }) => {
    // 準備と実行: /posts/1
    await page.goto(`${BASE_URL}/posts/1`);
    const first = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: /posts/2
    await page.goto(`${BASE_URL}/posts/2`);
    const second = page.getByRole("heading", { name: "React Hooks 実践" });
    await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: /posts/999
    await page.goto(`${BASE_URL}/posts/999`);
    const notFound = page.getByRole("heading", { name: "記事が見つかりません" });
    await expect.poll(() => notFound.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("カテゴリで絞り込み未知のカテゴリは空状態を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/categories/react`);

    // 検証
    const heading = page.getByRole("heading", { name: "カテゴリ: react" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const article = page.getByRole("link", { name: "React 入門" });
    await expect.poll(() => article.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 未知のカテゴリ
    await page.goto(`${BASE_URL}/categories/unknown`);

    // 検証
    const empty = page.getByText("このカテゴリには記事がありません。");
    await expect.poll(() => empty.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("検索条件が URL に反映されリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    const searchHeading = page.getByRole("heading", { name: "検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: キーワードを入力して検索
    await page.getByLabel("キーワード").fill("react");
    await page.getByRole("button", { name: "検索" }).click();

    // 検証: URL に反映されたこと
    const count = page.getByText("全 6 件");
    await expect.poll(() => count.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("q=react");
    const result = page.getByRole("link", { name: "React 入門" });
    await expect.poll(() => result.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: リロード
    await page.reload();

    // 検証: 検索条件が維持されていること
    const restored = page.getByText("全 6 件");
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("q=react");
    expect(await page.getByLabel("キーワード").inputValue()).toBe("react");
    const restoredResult = page.getByRole("link", { name: "React 入門" });
    await expect.poll(() => restoredResult.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("検索結果をページングしてリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search?q=react&page=1`);
    const firstPage = page.getByText("ページ 1 / 2");
    await expect.poll(() => firstPage.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 次のページへ
    await page.getByRole("link", { name: "次のページ" }).click();

    // 検証
    const secondPage = page.getByText("ページ 2 / 2");
    await expect.poll(() => secondPage.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("page=2");
    const secondPageArticle = page.getByRole("link", { name: "React Suspense とデータ取得" });
    await expect.poll(() => secondPageArticle.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: リロード
    await page.reload();

    // 検証: ページ番号が維持されていること
    const restored = page.getByText("ページ 2 / 2");
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("page=2");
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ブラウザ履歴を戻る・進むで移動できる", async ({ expect, page }) => {
    // 準備: A → B → C
    await page.goto(`${BASE_URL}/`);
    const home = page.getByRole("heading", { name: "ようこそ" });
    await expect.poll(() => home.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/posts`);
    const posts = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => posts.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/about`);
    const about = page.getByRole("heading", { name: "このブログについて" });
    await expect.poll(() => about.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行と検証: Back → Back → Forward
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/posts`);
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/posts`);
    const forwarded = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => forwarded.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
