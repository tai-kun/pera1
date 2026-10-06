import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

describe("Travel Booking", () => {
  test("検索から予約確定までのフルジャーニー", async ({ expect, page }) => {
    // 準備: 検索ページを開く
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 条件を入力して検索する
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("2");
    await main.getByRole("button", { name: "Search", exact: true }).click();

    // 検証: Results へ遷移し条件が URL に反映されたこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toContain("/travel/search/results");
    expect(page.url()).toContain("from=TYO");
    expect(page.url()).toContain("to=OSA");
    expect(page.url()).toContain("date=2026-10-10");
    const resultsHeading = main.getByRole("heading", { name: "検索結果" });
    await expect.poll(() => resultsHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 便を選択して予約を作成する
    await main.getByRole("button", { name: "Select JL101", exact: true }).click();

    // 検証: Booking へ遷移したこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingHeading = main.getByRole("heading", { name: "予約概要" });
    await expect.poll(() => bookingHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const bookingUrl = page.url();
    const bookingId = bookingUrl.split("/").at(-1) ?? "";
    expect(bookingId).toMatch(/^booking-\d+$/);

    // 実行: Passengers へ進む
    await main.getByRole("link", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/passengers`);
    const passengersHeading = main.getByRole("heading", { name: "搭乗者情報" });
    await expect.poll(() => passengersHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 搭乗者情報を入力して Payment へ
    await main.getByLabel("Name").fill("Taro Yamada");
    await main.getByLabel("Email").fill("taro@example.com");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/payment`);
    const paymentHeading = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => paymentHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 支払情報を入力して Confirm へ
    await main.getByLabel("Card Number").fill("4111111111111111");
    await main.getByLabel("Expiry").fill("12/30");
    await main.getByLabel("CVC").fill("123");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/confirm`);
    const confirmHeading = main.getByRole("heading", { name: "予約確認" });
    await expect.poll(() => confirmHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 予約を確定する
    await main.getByRole("button", { name: "Confirm Booking", exact: true }).click();

    // 検証: Complete へ遷移したこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/complete`);
    const completeHeading = main.getByRole("heading", { name: "予約完了" });
    await expect.poll(() => completeHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    const bookingIdText = main.getByText(bookingId);
    await expect.poll(() => bookingIdText.first().isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("検索条件が URL に反映されコピーした URL で同条件を表示できる", async ({
    expect,
    page,
  }) => {
    // 準備: 検索ページを開く
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 条件を入力して検索する
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("2");
    await main.getByRole("button", { name: "Search", exact: true }).click();

    // 検証: URL に条件が反映されたこと
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toContain("/travel/search/results");
    const resultsUrl = page.url();
    expect(resultsUrl).toContain("from=TYO");
    expect(resultsUrl).toContain("to=OSA");
    const resultsHeading = main.getByRole("heading", { name: "検索結果" });
    await expect.poll(() => resultsHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: URL をコピーして新規ページで開く
    const secondPage = await page.context().newPage();
    try {
      await secondPage.goto(resultsUrl);
      const secondMain = secondPage.getByRole("main");
      const copiedHeading = secondMain.getByRole("heading", { name: "検索結果" });
      await expect.poll(() => copiedHeading.isVisible(), { timeout: 10_000 }).toBe(true);
      const copiedFlight = secondMain.getByRole("button", { name: "Select JL101" });
      await expect.poll(() => copiedFlight.isVisible(), { timeout: 10_000 }).toBe(true);
      expect(secondPage.url()).toContain("from=TYO");
      expect(secondPage.url()).toContain("to=OSA");
    } finally {
      await secondPage.close();
    }
  });

  test("搭乗者情報なしで Payment を直接開くと Passengers へリダイレクトされる", async ({
    expect,
    page,
  }) => {
    // 準備: 正規フローで予約を作成する (搭乗者情報は未入力)
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select JL101", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();
    expect(bookingId).toMatch(/^booking-\d+$/);

    // 実行: Payment を直接開く
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/payment`);

    // 検証: Passengers へリダイレクトされること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/passengers`);
    const passengersHeading = main.getByRole("heading", { name: "搭乗者情報" });
    await expect.poll(() => passengersHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("支払情報なしで Confirm を直接開くと Payment へリダイレクトされる", async ({
    expect,
    page,
  }) => {
    // 準備: 予約作成 → 搭乗者情報まで入力する (支払情報は未入力)
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select NH103", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();
    await main.getByRole("link", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/passengers`);
    await main.getByLabel("Name").fill("Hanako Suzuki");
    await main.getByLabel("Email").fill("hanako@example.com");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/payment`);

    // 実行: Confirm を直接開く
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/confirm`);

    // 検証: Payment へリダイレクトされること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/payment`);
    const paymentHeading = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => paymentHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未確定で Complete を直接開くと Confirm へリダイレクトされる", async ({
    expect,
    page,
  }) => {
    // 準備: 予約作成 → 支払情報まで入力する (確定はしない)
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("1");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select MM105", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();
    await main.getByRole("link", { name: "Next", exact: true }).click();
    await main.getByLabel("Name").fill("Jiro Sato");
    await main.getByLabel("Email").fill("jiro@example.com");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await main.getByLabel("Card Number").fill("4111111111111111");
    await main.getByLabel("Expiry").fill("12/30");
    await main.getByLabel("CVC").fill("123");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/confirm`);

    // 実行: Complete を直接開く
    await page.goto(`${BASE_URL}/travel/booking/${bookingId}/complete`);

    // 検証: Confirm へリダイレクトされること
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/confirm`);
    const confirmHeading = main.getByRole("heading", { name: "予約確認" });
    await expect.poll(() => confirmHeading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("存在しない予約は Not Found 表示になる", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/travel/booking/no-such-id`);

    // 検証
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "予約が見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("Deep Link で Payment を直接開きリロードで復元できる", async ({ expect, page }) => {
    // 準備: 正規フローで Payment まで進める
    await page.goto(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const searchHeading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => searchHeading.isVisible(), { timeout: 10_000 }).toBe(true);
    await main.getByLabel("From").fill("TYO");
    await main.getByLabel("To").fill("OSA");
    await main.getByLabel("Date").fill("2026-10-10");
    await main.getByLabel("Adults").fill("2");
    await main.getByRole("button", { name: "Search", exact: true }).click();
    await main.getByRole("button", { name: "Select JL101", exact: true }).click();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/travel\/booking\/booking-\d+$/);
    const bookingId = (page.url().split("/").at(-1) ?? "").trim();
    await main.getByRole("link", { name: "Next", exact: true }).click();
    await main.getByLabel("Name").fill("Taro Yamada");
    await main.getByLabel("Email").fill("taro@example.com");
    await main.getByRole("button", { name: "Next", exact: true }).click();
    const paymentUrl = `${BASE_URL}/travel/booking/${bookingId}/payment`;
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(paymentUrl);
    const paymentHeading = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => paymentHeading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: Deep Link で直接開き直す
    await page.goto(paymentUrl);

    // 検証: Payment が表示されること
    const deepLinked = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => deepLinked.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(paymentUrl);

    // 実行: リロードする
    await page.reload();

    // 検証: 状態が復元され Payment のままであること
    const restored = main.getByRole("heading", { name: "支払情報" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(paymentUrl);

    // 検証: Back で Passengers に戻り入力値が復元されていること
    await main.getByRole("link", { name: "Back", exact: true }).click();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/travel/booking/${bookingId}/passengers`);
    expect(await main.getByLabel("Name").inputValue()).toBe("Taro Yamada");
    expect(await main.getByLabel("Email").inputValue()).toBe("taro@example.com");
  });

  test("/travel を開くと /travel/search へリダイレクトされる", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/travel`);

    // 検証
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/travel/search`);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("未知のパスで 404 を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/no-such-page`);

    // 検証
    const heading = page.getByRole("main").getByRole("heading", { name: "ページが見つかりません" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("ブラウザ履歴を戻る・進むで移動できる", async ({ expect, page }) => {
    // 準備: Home → Search → Results
    await page.goto(`${BASE_URL}/`);
    const main = page.getByRole("main");
    const home = main.getByRole("heading", { name: "Travel Booking ホーム" });
    await expect.poll(() => home.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/travel/search`);
    const search = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => search.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goto(`${BASE_URL}/travel/search/results?from=TYO&to=OSA&date=2026-10-10`);
    const results = main.getByRole("heading", { name: "検索結果" });
    await expect.poll(() => results.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行と検証: Back → Back → Forward
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/travel/search`);
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/travel/search`);
    const forwarded = main.getByRole("heading", { name: "旅行検索" });
    await expect.poll(() => forwarded.isVisible(), { timeout: 10_000 }).toBe(true);
  });
});
