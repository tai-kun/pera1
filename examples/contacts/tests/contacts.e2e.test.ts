import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

describe("連絡先帳", () => {
  test("ホームに一覧への案内を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/`);

    // 検証
    const link = page.getByRole("link", { name: "こちら" });
    await expect.poll(() => link.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await link.getAttribute("href")).toBe("/contacts");
  });

  test("一覧に初期データを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/contacts`);

    // 検証
    const ada = page.getByRole("link", { name: "Ada Lovelace" });
    await expect.poll(() => ada.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await ada.getAttribute("href")).toBe("/contacts/1");
    const grace = page.getByRole("link", { name: "Grace Hopper" });
    await expect.poll(() => grace.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await grace.getAttribute("href")).toBe("/contacts/2");
  });

  test("名前が空のときはエラーを表示する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/contacts`);

    // 実行
    await page.getByRole("button", { name: "追加" }).click();

    // 検証
    const alert = page.getByRole("alert");
    await expect.poll(() => alert.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await alert.textContent()).toBe("名前を入力してください。");
    expect(page.url()).toBe(`${BASE_URL}/contacts`);
  });

  test("連絡先を追加すると詳細に遷移する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/contacts`);
    await page.getByLabel("名前").fill("Vitest Taro");
    await page.getByLabel("メールアドレス").fill("vitest-taro@example.com");

    // 実行
    await page.getByRole("button", { name: "追加" }).click();

    // 検証
    const heading = page.getByRole("heading", { name: "Vitest Taro" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const email = page.getByText("vitest-taro@example.com");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toMatch(/\/contacts\/\d+$/);
  });

  test("詳細を表示して一覧に戻る", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/contacts/1`);

    // 検証
    const heading = page.getByRole("heading", { name: "Ada Lovelace" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const email = page.getByText("ada@example.com");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);
    const id = page.getByText("ID: 1");
    await expect.poll(() => id.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await page.getByRole("link", { name: "一覧に戻る" }).click();

    // 検証
    const contacts = page.getByRole("heading", { name: "連絡先", exact: true });
    await expect.poll(() => contacts.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/contacts`);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
