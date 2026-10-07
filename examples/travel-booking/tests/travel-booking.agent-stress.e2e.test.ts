import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * 検索から予約確定までの各ステップを AI 速度で連打しても壊れないことを検証します。
 */
describe("Travel Booking / AI エージェント高速操作ストレス", () => {
  test("検索フォームを高速連打しても結果に到達する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("2");
    const button = main.getByRole("button", { name: "Search", exact: true });

    // 実行: 検索ボタンを連打する (遷移で detach されるため短い timeout で打ち切る)
    await Promise.allSettled([
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
      button.click({ timeout: 3_000 }),
    ]);

    // 検証: 検索結果に到達し条件が URL に残ること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toContain("/travel/search/results");
    expect(page.url()).toContain("from=TYO");
    const heading = main.getByRole("heading", { name: "検索結果" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("便選択ボタンを高速連打しても予約のいずれかに到達する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    const select = main.getByRole("button", { name: "Select JL101", exact: true });
    await expect.poll(() => select.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 同一便を連打する (複数予約作成は許容し到達性を見る)
    await Promise.allSettled([select.click({ timeout: 3_000 }), select.click({ timeout: 3_000 })]);

    // 検証: 予約概要のいずれかに到達すること
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingHeading = main.getByRole("heading", { name: "予約概要" });
    await expect.poll(() => bookingHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("予約ステップをノーウェイト往復しても表示と URL が一致する", async ({
    expect,
    page,
  }) => {
    // 準備: 予約を作成して bookingId を得る
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select JL101", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();

    // 実行: 各ステップを描画待ちなしで行き来する
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/passengers`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/payment`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/passengers`, { waitUntil: "commit" });

    // 検証: ガードに従い passengers に落ち着くこと (未入力のため payment は不可)
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/passengers`);
    const passengers = main.getByRole("heading", { name: "搭乗者情報" });
    await expect.poll(() => passengers.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("搭乗者入力から Confirm まで高速突破して確定連打できる", async ({ expect, page }) => {
    // 準備: 予約を作成する
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select NH103", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();
    await main.getByRole("link", { name: "Next", exact: true }).click();
    await main.getByLabel("Name").fill("Rapid Agent");
    await main.getByLabel("Email").fill("rapid@example.com");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await main.getByLabel("Card Number").fill("4111111111111111");
    await main.getByLabel("Expiry").fill("12/30");
    await main.getByLabel("CVC").fill("123");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/confirm`);

    // 実行: 確定を連打する (遷移で detach されるため短い timeout で打ち切る)
    const confirm = main.getByRole("button", { name: "Confirm Booking", exact: true });
    await Promise.allSettled([confirm.click({ timeout: 3_000 }), confirm.click({ timeout: 3_000 })]);

    // 検証: 完了画面に到達すること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/complete`);
    const complete = main.getByRole("heading", { name: "予約完了" });
    await expect.poll(() => complete.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("存在しない予約 ID を高速で叩いても Not Found から復帰できる", async ({
    expect,
    page,
  }) => {
    // 実行
    await page.goto(`${BASE_URL}/travel/booking/no-such-1`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/travel/booking/no-such-2/passengers`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/travel/search`, { waitUntil: "commit" });

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("0ms 間隔タイピングで検索条件が欠落しない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const from = main.getByLabel("From");
    await expect.poll(() => from.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await from.click();
    await from.pressSequentially("TYO", { delay: 0 });
    await main.getByLabel("To").pressSequentially("OSA", { delay: 0 });
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").pressSequentially("2", { delay: 0 });
    await main.getByRole("button", { name: "Search", exact: true }).click();

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("from=TYO");
    expect(page.url()).toContain("to=OSA");
    const heading = main.getByRole("heading", { name: "検索結果" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("不正パラメータラッシュでもクラッシュしない", async ({ expect, page }) => {
    // 準備
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行
    const badUrls = [
      `${BASE_URL}/travel/search/results?from=%00&to=%3Cscript%3E&date=not-a-date&adults=-5`,
      `${BASE_URL}/travel/search/results?from=${"A".repeat(3_000)}&adults=99999`,
      `${BASE_URL}/travel/booking/${"b".repeat(2_000)}/payment`,
      `${BASE_URL}/travel/booking/booking-999999/complete`,
    ];
    for (const url of badUrls) {
      await page.goto(url, { waitUntil: "commit" });
      await expect
        .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
        .not.toBe(null);
    }

    // 検証
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
  });

  test("2 タブで別検索を同時実行しても混線しない", async ({ expect, page }) => {
    // 準備
    const secondPage = await page.context().newPage();
    try {
      // 実行
      await Promise.all([
        page.goto(`${BASE_URL}/travel/search`),
        secondPage.goto(`${BASE_URL}/travel/search/results?from=TYO&to=OSA&date=2026-10-10`),
      ]);

      // 検証
      const first = page.getByRole("main").getByRole("heading", { name: "旅行検索" });
      await expect.poll(() => first.isVisible(), { timeout: 10_000 }).toBe(true);
      const second = secondPage.getByRole("main").getByRole("heading", { name: "検索結果" });
      await expect.poll(() => second.isVisible(), { timeout: 10_000 }).toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("Back/Forward とリロードの複合ラッシュでも検索に復帰できる", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/travel/search`);
    await page.goto(`${BASE_URL}/travel/search/results?from=TYO&to=OSA&date=2026-10-10`);

    // 実行
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/travel/search`);

    // 検証
    expect(page.url()).toBe(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
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
    for (const target of ["/", "/travel/search", "/travel/search/results?from=TYO", "/travel", "/no-such-page"]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goto(`${BASE_URL}/travel/search`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
