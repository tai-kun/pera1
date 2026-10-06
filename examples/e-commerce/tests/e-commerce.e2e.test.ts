import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

describe("E-commerce", () => {
  test("商品一覧から注文確定までのフルジャーニー", async ({ expect, page }) => {
    // 準備: 商品一覧を開く
    await page.goto(`${BASE_URL}/products`);
    const main = page.getByRole("main");
    const listHeading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => listHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: カテゴリを選択
    await main.getByLabel("カテゴリ").selectOption("books");

    // 検証: URL に category が反映されたこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("category=books");
    const filtered = main.getByRole("link", { name: "TypeScript Handbook" });
    await expect.poll(() => filtered.first().isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 商品詳細へ移動
    await filtered.first().click();
    const detailHeading = main.getByRole("heading", { name: "TypeScript Handbook" });
    await expect.poll(() => detailHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/products/p1`);

    // 実行: カートに追加
    await main.getByRole("button", { name: "Add to Cart", exact: true }).click();
    const status = main.getByRole("status");
    await expect.poll(() => status.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Cart へ移動
    await main.getByRole("link", { name: "Go to Cart", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/cart`);
    const cartHeading = main.getByRole("heading", { name: "カート" });
    await expect.poll(() => cartHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const cartItem = main.getByText("TypeScript Handbook");
    await expect.poll(() => cartItem.first().isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Checkout へ進む
    await main.getByRole("link", { name: "Checkout", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/shipping`);
    const shippingHeading = main.getByRole("heading", { name: "配送先" });
    await expect.poll(() => shippingHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Shipping を入力して Payment へ
    await main.getByLabel("Name").fill("Taro Yamada");
    await main.getByLabel("Address").fill("1-2-3 Shibuya");
    await main.getByLabel("City").fill("Tokyo");
    await main.getByLabel("ZIP Code").fill("150-0001");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/payment`);
    const paymentHeading = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => paymentHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Payment を入力して Confirm へ
    await main.getByLabel("Card Number").fill("4111111111111111");
    await main.getByLabel("Expiry").fill("12/30");
    await main.getByLabel("CVC").fill("123");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/confirm`);
    const confirmHeading = main.getByRole("heading", { name: "注文確認" });
    await expect.poll(() => confirmHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 注文を確定
    await main.getByRole("button", { name: "Confirm Order", exact: true }).click();

    // 検証: /orders/:orderId へ遷移したこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/orders\/order-\d+$/);
    const orderHeading = main.getByRole("heading", { name: "注文詳細" });
    await expect.poll(() => orderHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const ordered = main.getByText("TypeScript Handbook");
    await expect.poll(() => ordered.first().isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Shippingなしで Payment を直接開くと Shipping へリダイレクトされる", async ({
    expect,
    page,
  }) => {
    // 準備: カートに商品を入れる (Shipping は未入力)
    await page.goto(`${BASE_URL}/products/p4`);
    const main = page.getByRole("main");
    const detailHeading = main.getByRole("heading", { name: "Wireless Mouse" });
    await expect.poll(() => detailHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByRole("button", { name: "Add to Cart", exact: true }).click();
    const status = main.getByRole("status");
    await expect.poll(() => status.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Payment を直接開く
    await page.goto(`${BASE_URL}/checkout/payment`);

    // 検証: Shipping へリダイレクトされること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/shipping`);
    const shippingHeading = main.getByRole("heading", { name: "配送先" });
    await expect.poll(() => shippingHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("空カートで Checkout を開くと Cart へリダイレクトされる", async ({ expect, page }) => {
    // 準備と実行: 空カートで Shipping を直接開く
    await page.goto(`${BASE_URL}/checkout/shipping`);

    // 検証: Cart へリダイレクトされること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/cart`);
    const main = page.getByRole("main");
    const cartHeading = main.getByRole("heading", { name: "カート" });
    await expect.poll(() => cartHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const empty = main.getByText("カートは空です。");
    await expect.poll(() => empty.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Confirm を直接開く
    await page.goto(`${BASE_URL}/checkout/confirm`);

    // 検証: Cart へリダイレクトされること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/cart`);
  });

  test("Paymentなしで Confirm を直接開くと Payment へリダイレクトされる", async ({
    expect,
    page,
  }) => {
    // 準備: カート追加 → Shipping 入力まで進める (Payment は未入力)
    await page.goto(`${BASE_URL}/products/p7`);
    const main = page.getByRole("main");
    const detailHeading = main.getByRole("heading", { name: "Cotton T-Shirt" });
    await expect.poll(() => detailHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByRole("button", { name: "Add to Cart", exact: true }).click();
    const status = main.getByRole("status");
    await expect.poll(() => status.isVisible(), { timeout: 10_000 }).toBe(true);

    await page.goto(`${BASE_URL}/checkout/shipping`);
    const shippingHeading = main.getByRole("heading", { name: "配送先" });
    await expect.poll(() => shippingHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByLabel("Name").fill("Hanako Suzuki");
    await main.getByLabel("Address").fill("4-5-6 Umeda");
    await main.getByLabel("City").fill("Osaka");
    await main.getByLabel("ZIP Code").fill("530-0001");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/payment`);

    // 実行: Confirm を直接開く (Payment 未入力)
    await page.goto(`${BASE_URL}/checkout/confirm`);

    // 検証: Payment へリダイレクトされること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/checkout/payment`);
    const paymentHeading = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => paymentHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Deep Link で商品詳細を直接開く", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/products/p4`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "Wireless Mouse" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const price = main.getByText("¥4500");
    await expect.poll(() => price.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("存在しない商品は Not Found 表示になる", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/products/no-such-id`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "商品が見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("検索条件が URL に反映されリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/products`);
    const main = page.getByRole("main");
    const listHeading = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => listHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: カテゴリを選択
    await main.getByLabel("カテゴリ").selectOption("books");

    // 検証: URL に反映されたこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("category=books");
    const filtered = main.getByRole("link", { name: "React Patterns" });
    await expect.poll(() => filtered.first().isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: ソートを変更
    await main.getByLabel("ソート").selectOption("price");

    // 検証: URL に反映されたこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("sort=price");

    // 実行: リロード
    await page.reload();

    // 検証: 条件が維持されていること
    const restored = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("category=books");
    expect(page.url()).toContain("sort=price");
    expect(await main.getByLabel("カテゴリ").inputValue()).toBe("books");
    expect(await main.getByLabel("ソート").inputValue()).toBe("price");
    const restoredResult = main.getByRole("link", { name: "React Patterns" });
    await expect.poll(() => restoredResult.first().isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ページングしてリロードで維持される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/products?page=1`);
    const main = page.getByRole("main");
    const firstPage = main.getByText("ページ 1 / 3");
    await expect.poll(() => firstPage.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 次のページへ
    await main.getByRole("link", { name: "次のページ", exact: true }).click();

    // 検証
    const secondPage = main.getByText("ページ 2 / 3");
    await expect.poll(() => secondPage.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("page=2");

    // 実行: リロード
    await page.reload();

    // 検証: ページ番号が維持されていること
    const restored = main.getByText("ページ 2 / 3");
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toContain("page=2");
  });

  test("ブラウザ履歴を戻る・進むで移動できる", async ({ expect, page }) => {
    // 準備: Home → Products → Cart
    await page.goto(`${BASE_URL}/`);
    const main = page.getByRole("main");
    const home = main.getByRole("heading", { name: "ホーム" });
    await expect.poll(() => home.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/products`);
    const products = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => products.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/cart`);
    const cart = main.getByRole("heading", { name: "カート" });
    await expect.poll(() => cart.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行と検証: Back → Back → Forward
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/products`);
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/products`);
    const forwarded = main.getByRole("heading", { name: "商品一覧" });
    await expect.poll(() => forwarded.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
