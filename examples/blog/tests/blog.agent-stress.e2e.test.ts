import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * AI エージェントのような待機なし高速操作でも表示と URL が一致することを検証します。
 * 人間ではありえない間隔 (ポーリング待機なしの連続 goto / 連打) を再現します。
 */
describe("ブログ / AIエージェント高速操作ストレス", () => {
  test("ノーウェイト連続遷移でも最終URLと表示が一致する", async ({ expect, page }) => {
    // 準備と実行: 読み込み完了を待たずに commit 時点で次へ進む (AI の高速発行を再現)
    const targets = ["/posts/1", "/posts/2", "/posts/3", "/posts/4", "/posts/5"];
    for (const target of targets) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証: 最後の遷移先が正しく描画されること (古い loader の残骸がないこと)
    expect(page.url()).toBe(`${BASE_URL}/posts/5`);
    const heading = page.getByRole("heading", { name: "TypeScript の高度な型" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const body = page.getByText("ジェネリクスと条件型");
    await expect.poll(() => body.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("遷移割り込みで古いloaderの内容が混ざらない", async ({ expect, page }) => {
    // 準備: 一覧を開く
    await page.goto(`${BASE_URL}/posts`, { waitUntil: "commit" });

    // 実行: 詳細の描画を待たずに次々と上書きする
    await page.goto(`${BASE_URL}/posts/1`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/posts/2`, { waitUntil: "commit" });

    // 検証: URL と見出し・本文が /posts/2 のものだけで構成されること
    expect(page.url()).toBe(`${BASE_URL}/posts/2`);
    const second = page.getByRole("heading", { name: "React Hooks 実践" });
    await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
    const stale = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => stale.count(), { timeout: 10_000 }).toBe(0);
    const body = page.getByText("useState と useEffect");
    await expect.poll(() => body.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("同一リンクを高速連打しても単一の詳細に落ち着く", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/posts`);
    const listHeading = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => listHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const link = page.getByRole("link", { name: "React 入門" });

    // 実行: AI が click を連射した想定 (2 回目以降は detached で失敗し得るので握りつぶす)
    const results = await Promise.allSettled([
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
    ]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);

    // 検証: 詳細に正しく遷移し履歴が壊れていないこと
    const heading = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts/1`);
    await page.goBack();
    const back = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => back.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Back/Forwardを高速往復してもURLと見出しが一致する", async ({ expect, page }) => {
    // 準備: 履歴を 3 件積む
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/posts`);
    await page.goto(`${BASE_URL}/about`);

    // 実行: 待機なしで往復する
    for (let i = 0; i < 5; i++) {
      await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
      await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    }
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);

    // 検証: URL と描画が一致し白紙にならないこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/posts`);
    const posts = page.getByRole("heading", { name: "記事一覧" });
    await expect.poll(() => posts.isVisible(), { timeout: 10_000 }).toBe(true);
    const bodyText = await page.getByRole("main").textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });

  test("リロード連打でも内容が復元される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/posts/1`);
    const heading = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 連続リロード (AI の再試行ラッシュ想定)
    await page.reload({ waitUntil: "commit" });
    await page.reload({ waitUntil: "commit" });
    await page.reload();

    // 検証
    const restored = page.getByRole("heading", { name: "React 入門" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/posts/1`);
    const body = page.getByText("コンポーネントと JSX の解説");
    await expect.poll(() => body.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("検索ボタンを二重送信しても結果が壊れない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    const searchHeading = page.getByRole("heading", { name: "検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.getByLabel("キーワード").fill("react");
    const button = page.getByRole("button", { name: "検索" });

    // 実行: ダブルクリック相当の連打 (遷移で detach されるため短い timeout で打ち切る)
    await Promise.allSettled([button.click({ timeout: 3_000 }), button.click({ timeout: 3_000 })]);

    // 検証: 結果が 1 件分だけ正しく表示され URL が壊れないこと
    const count = page.getByText("全 6 件");
    await expect.poll(() => count.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("q=react");
    expect(page.url()).toContain("page=1");
    const result = page.getByRole("link", { name: "React 入門" });
    await expect.poll(() => result.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("0ms間隔タイピングで即送信してもクエリが欠落しない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    const input = page.getByLabel("キーワード");
    await expect.poll(() => input.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 人間では不可能な速度で入力して即送信
    await input.click();
    await input.pressSequentially("typescript", { delay: 0 });
    await page.getByRole("button", { name: "検索" }).click();

    // 検証 (再描画ラグに備え入力値も poll する)
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("q=typescript");
    await expect
      .poll(() => page.getByLabel("キーワード").inputValue(), { timeout: 10_000 })
      .toBe("typescript");
    const result = page.getByRole("link", { name: "TypeScript 基礎" });
    await expect.poll(() => result.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("不正パラメータラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備: pageerror と console error を監視する
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

    // 実行: 境界値・巨大・特殊文字を高速で叩く
    const badUrls = [
      `${BASE_URL}/search?q=react&page=0`,
      `${BASE_URL}/search?q=react&page=-5`,
      `${BASE_URL}/search?q=react&page=99999`,
      `${BASE_URL}/search?q=${"x".repeat(5_000)}&page=1`,
      `${BASE_URL}/search?q=%00%3Cscript%3E&page=abc`,
      `${BASE_URL}/posts/../../../../etc/passwd`,
    ];
    for (const url of badUrls) {
      await page.goto(url, { waitUntil: "commit" });
      // 各 URL で何かしら描画されること (白紙・ハングなし)
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証: ハードエラーが出ていないこと
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });

  test("2タブで別記事を同時展開しても混線しない", async ({ expect, page }) => {
    // 準備: 同一コンテキストで 2 枚目のタブを開く
    const secondPage = await page.context().newPage();
    try {
      // 実行: 同時に別記事へ遷移する
      await Promise.all([
        page.goto(`${BASE_URL}/posts/1`),
        secondPage.goto(`${BASE_URL}/posts/2`),
      ]);

      // 検証: それぞれが自分の記事を表示すること
      const first = page.getByRole("heading", { name: "React 入門" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("heading", { name: "React Hooks 実践" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
      expect(page.url()).toBe(`${BASE_URL}/posts/1`);
      expect(secondPage.url()).toBe(`${BASE_URL}/posts/2`);
    } finally {
      await secondPage.close();
    }
  });

  test("高速操作ラッシュ中にpageerrorとconsole errorが出ない", async ({
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

    // 実行: goto 7 連発 + Back + リロードの複合ラッシュ
    for (const target of ["/", "/posts", "/posts/1", "/categories/react", "/search?q=react", "/about", "/posts/2"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/posts/2`);

    // 検証: 最終表示が正しくエラーが出ていないこと
    const heading = page.getByRole("heading", { name: "React Hooks 実践" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
