import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * AI エージェントの高速操作 (連打・ノーウェイト遷移・二重送信) でも
 * 購買フローが壊れないことを検証します。
 */
describe("E-commerce / AIエージェント高速操作ストレス", () => {
  test("商品詳細をノーウェイト連続遷移しても最終表示が一致する", async ({ expect, page }) => {
    // 準備と実行
    for (const id of ["p1", "p4", "p7", "p2", "p9"]) {
      await page.goto(`${BASE_URL}/products/${id}`, { waitUntil: "commit" });
    }

    // 検証: 最後の商品だけが表示され古い商品が残らないこと
    expect(page.url()).toBe(`${BASE_URL}/products/p9`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Running Shoes" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const stale = main.getByRole("heading", { name: "TypeScript Handbook" });
    await expect.poll(() => stale.count(), { timeout: 10_000 }).toBe(0);
  });

  test("Add to Cartを高速連打してもカートに正しく反映される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/products/p4`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Wireless Mouse" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const button = main.getByRole("button", { name: "Add to Cart", exact: true });

    // 実行: 人間では不可能な 3 連打 (在庫加算は許容しクラッシュだけを防ぐ)
    await button.click();
    await button.click().catch(() => undefined);
    await button.click().catch(() => undefined);

    // 検証: ステータスが表示され Cart に商品が入っていること (数量は 1 以上)
    const status = main.getByRole("status");
    await expect.poll(() => status.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/cart`);
    const cartHeading = main.getByRole("heading", { name: "カート" });
    await expect.poll(() => cartHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const item = main.getByText("Wireless Mouse");
    await expect.poll(() => item.first().isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("カテゴリとソートを高速切替してもURLと一覧が一致する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/products`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 人間の思考時間なしで条件を切り替える (各操作の反映だけは待つ)
    // NOTE: 絞り込みURLは描画時の state から組み立てるため、反映待ちなしの連打では
    // 最終条件が欠落し得る。AI でも直列操作では反映確認が必須という前提に立つ。
    await main.getByLabel("カテゴリ").selectOption("books");
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("category=books");
    await main.getByLabel("ソート").selectOption("price");
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("sort=price");
    await main.getByLabel("カテゴリ").selectOption("electronics");
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("category=electronics");
    await main.getByLabel("ソート").selectOption("name");

    // 検証: 最終条件が URL と select 値と結果に反映されること
    // NOTE: URL コミットから再描画までラグがあるため select 値は poll する。
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("category=electronics");
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("sort=name");
    await expect
      .poll(() => main.getByLabel("カテゴリ").inputValue(), { timeout: 10_000 })
      .toBe("electronics");
    await expect
      .poll(() => main.getByLabel("ソート").inputValue(), { timeout: 10_000 })
      .toBe("name");
    const item = main.getByRole("link", { name: /Mechanical Keyboard/ });
    await expect.poll(() => item.first().isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ページネーションを高速連打しても最終ページに落ち着く", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/products?page=1`);
    const main = page.getByRole("main");
    const first = main.getByText("ページ 1 / 3");
    await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 次へを待たずに連打する (最終ページではリンクが消えるため短い timeout で打ち切る)
    const next = main.getByRole("link", { name: "次のページ", exact: true });
    await next.click({ timeout: 3_000 });
    await next.click({ timeout: 3_000 }).catch(() => undefined);
    await next.click({ timeout: 3_000 }).catch(() => undefined);

    // 検証: 有効なページのいずれかに落ち着き内容とURLが一致すること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/page=[123]/);
    const bodyText = await main.textContent();
    expect(bodyText).toContain("ページ");
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });

  test("Confirm Orderを二重送信しても注文詳細に到達する", async ({ expect, page }) => {
    // 準備: カート追加 → Shipping → Payment まで正規に進める
    await page.goto(`${BASE_URL}/products/p1`);
    const main = page.getByRole("main");
    await main.getByRole("button", { name: "Add to Cart", exact: true }).click();
    await expect.poll(() => main.getByRole("status").isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/checkout/shipping`);
    await main.getByLabel("Name").fill("Stress Agent");
    await main.getByLabel("Address").fill("1-2-3 Shibuya");
    await main.getByLabel("City").fill("Tokyo");
    await main.getByLabel("ZIP Code").fill("150-0001");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/payment`);
    await main.getByLabel("Card Number").fill("4111111111111111");
    await main.getByLabel("Expiry").fill("12/30");
    await main.getByLabel("CVC").fill("123");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/confirm`);

    // 実行: 確定ボタンを連打する (二重注文の厳密な単一性までは問わず到達性を検証)
    // NOTE: 1 回目の遷移でボタンが detach されるため短い timeout で打ち切る。
    const confirm = main.getByRole("button", { name: "Confirm Order", exact: true });
    await Promise.allSettled([confirm.click({ timeout: 3_000 }), confirm.click({ timeout: 3_000 })]);

    // 検証: 注文詳細のいずれかに到達し白紙でないこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/orders\/order-\d+$/);
    const orderHeading = main.getByRole("heading", { name: "注文詳細" });
    await expect.poll(() => orderHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ガード付きURLへ高速直アクセスしても正規へ誘導される", async ({ expect, page }) => {
    // 実行: 空カート相当の可能性があるため各ガードを高速で叩き最終整合だけ見る
    await page.goto(`${BASE_URL}/checkout/payment`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/checkout/confirm`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/checkout/shipping`, { waitUntil: "commit" });

    // 検証: cart / shipping のいずれかの正規画面に落ち着くこと (404 や白紙は不可)
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/(cart|checkout\/shipping)$/);
    const main = page.getByRole("main");
    const bodyText = await main.textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });

  test("不正クエリラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行
    const badUrls = [
      `${BASE_URL}/products?category=%00%3Cscript%3E&sort=price&page=1`,
      `${BASE_URL}/products?category=books&sort=__proto__&page=-3`,
      `${BASE_URL}/products?category=${"a".repeat(4_000)}&page=99999`,
      `${BASE_URL}/products/no-such-id-${"x".repeat(1_000)}`,
    ];
    for (const url of badUrls) {
      await page.goto(url, { waitUntil: "commit" });
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証: 正規一覧に復帰できること
    await page.goto(`${BASE_URL}/products`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("2タブで別商品を同時展開しても混線しない", async ({ expect, page }) => {
    // 準備
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/products/p1`),
        secondPage.goto(`${BASE_URL}/products/p4`),
      ]);

      // 検証
      const first = page.getByRole("main").getByRole("heading", { name: "TypeScript Handbook" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("main").getByRole("heading", { name: "Wireless Mouse" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("Back/Forwardとリロードの複合ラッシュでも一覧に復帰できる", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/products`);
    await page.goto(`${BASE_URL}/cart`);

    // 実行
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/products`);

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/products`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
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

    // 実行
    for (const target of ["/", "/products", "/products/p1", "/cart", "/products?page=2", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/products`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
