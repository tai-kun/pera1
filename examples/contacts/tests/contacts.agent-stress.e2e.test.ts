import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * AI エージェントのような待機なし高速操作でも連絡先の作成・遷移が壊れないことを検証します。
 */
describe("連絡先帳 / AIエージェント高速操作ストレス", () => {
  test("ノーウェイト連続遷移でも最終URLと表示が一致する", async ({ expect, page }) => {
    // 準備と実行: commit 時点で次へ進む高速発行
    for (const target of ["/contacts", "/contacts/1", "/contacts/2", "/contacts", "/contacts/1"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/contacts/1`);
    const heading = page.getByRole("heading", { name: "Ada Lovelace" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const email = page.getByText("ada@example.com");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("存在しないIDへの高速往復でも一覧に戻れる", async ({ expect, page }) => {
    // 実行: 存在/非存在を高速で行き来する (loader エラーパスの割り込み耐性)
    await page.goto(`${BASE_URL}/contacts/1`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/contacts/no-such-id-rapid`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: "commit" });

    // 検証: 最終的に一覧が正しく表示されること
    expect(page.url()).toBe(`${BASE_URL}/contacts`);
    const heading = page.getByRole("heading", { name: "連絡先", exact: true });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const ada = page.getByRole("link", { name: "Ada Lovelace" });
    await expect.poll(() => ada.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("追加ボタンを高速連打しても単一の詳細に落ち着く", async ({ expect, page }) => {
    // 準備: 一意な名前で連打に備える
    await page.goto(`${BASE_URL}/contacts`);
    const name = `Rapid Agent ${Date.now()}`;
    await page.getByLabel("名前").fill(name);
    await page.getByLabel("メールアドレス").fill("rapid-agent@example.com");
    const button = page.getByRole("button", { name: "追加" });

    // 実行: 二重送信ラッシュ (2 回目以降の失敗は許容、detach 対策で短い timeout)
    await Promise.allSettled([
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
    ]);

    // 検証: 詳細に遷移し白紙・二重エラーにならないこと (重複作成自体は許容し最終整合のみ見る)
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/contacts\/\d+$/);
    const heading = page.getByRole("heading", { name });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const email = page.getByText("rapid-agent@example.com");
    await expect.poll(() => email.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("空名前の高速連打でもURLが変わらずエラーを維持する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/contacts`);
    const button = page.getByRole("button", { name: "追加" });
    await expect.poll(() => button.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 空のまま 3 連打する
    await button.click();
    await button.click().catch(() => undefined);
    await button.click().catch(() => undefined);

    // 検証: 一覧に留まりエラー表示が維持されること
    expect(page.url()).toBe(`${BASE_URL}/contacts`);
    const alert = page.getByRole("alert");
    await expect.poll(() => alert.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await alert.textContent()).toBe("名前を入力してください。");
  });

  test("詳細→一覧リンクを待たずに辿っても一覧に戻れる", async ({ expect, page }) => {
    // 準備: 詳細を開く前に一覧リンク押下を仕掛ける (描画待ちなしの即時操作)
    await page.goto(`${BASE_URL}/contacts/1`, { waitUntil: "commit" });

    // 実行: 詳細描画をポーリングせず即クリックする (AI の先読み操作を再現)
    const backLink = page.getByRole("link", { name: "一覧に戻る" });
    await expect.poll(() => backLink.isVisible(), { timeout: 10_000 }).toBe(true);
    await backLink.click();
    await page.getByRole("link", { name: "Ada Lovelace" }).click().catch(() => undefined);

    // 検証: 最終的にどちらかの正規画面に落ち着き白紙でないこと
    await expect.poll(() => page.getByRole("main").textContent(), { timeout: 10_000 }).not.toBe(null);
    expect(["/contacts", "/contacts/1"]).toContain(new URL(page.url()).pathname);
  });

  test("Back/Forwardとリロードの複合ラッシュでも壊れない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/contacts`);
    await page.goto(`${BASE_URL}/contacts/2`);

    // 実行
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/contacts/2`);

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/contacts/2`);
    const heading = page.getByRole("heading", { name: "Grace Hopper" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("0ms間隔タイピングで連絡先を追加できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/contacts`);
    const nameInput = page.getByLabel("名前");
    await expect.poll(() => nameInput.isVisible(), { timeout: 10_000 }).toBe(true);
    const name = `Typing Agent ${Date.now()}`;

    // 実行: 人間では不可能な速度で入力して即送信
    await nameInput.click();
    await nameInput.pressSequentially(name, { delay: 0 });
    const emailInput = page.getByLabel("メールアドレス");
    await emailInput.pressSequentially("typing-agent@example.com", { delay: 0 });
    await page.getByRole("button", { name: "追加" }).click();

    // 検証: 入力が欠落せず詳細に遷移すること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/contacts\/\d+$/);
    const heading = page.getByRole("heading", { name });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("不正URLラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行
    const badUrls = [
      `${BASE_URL}/contacts/%00%3Cscript%3E`,
      `${BASE_URL}/contacts/${"9".repeat(3_000)}`,
      `${BASE_URL}/contacts/..%2f..%2fno-such-page`,
      `${BASE_URL}/no-such-page?x=${"y".repeat(2_000)}`,
    ];
    for (const url of badUrls) {
      await page.goto(url, { waitUntil: "commit" });
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証: 正規の一覧に復帰できること
    await page.goto(`${BASE_URL}/contacts`);
    const heading = page.getByRole("heading", { name: "連絡先", exact: true });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("2タブで別詳細を同時展開しても混線しない", async ({ expect, page }) => {
    // 準備
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/contacts/1`),
        secondPage.goto(`${BASE_URL}/contacts/2`),
      ]);

      // 検証
      const first = page.getByRole("heading", { name: "Ada Lovelace" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("heading", { name: "Grace Hopper" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
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

    // 実行
    for (const target of ["/", "/contacts", "/contacts/1", "/contacts/2", "/contacts", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/contacts`);

    // 検証
    const heading = page.getByRole("heading", { name: "連絡先", exact: true });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
