import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * AI エージェントのような待機なし高速操作でも表示と URL が一致することを検証します。
 * 人間ではありえない間隔 (ポーリング待機なしの連続 goto / 連打) を再現します。
 */
describe("ショーケース / AI エージェント高速操作ストレス", () => {
  test("ノーウェイト連続遷移でも最終 URL と表示が一致する", async ({ expect, page }) => {
    // 準備と実行: 読み込み完了を待たずに commit 時点で次へ進む (AI の高速発行を再現)
    const targets = [
      "/projects/p-router",
      "/projects/p-docs",
      "/projects/p-dx",
      "/projects/p-router/tasks/t-1",
      "/projects/p-docs/tasks/t-4",
    ];
    for (const target of targets) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }

    // 検証: 最後の遷移先が正しく描画されること (古い loader の残骸がないこと)
    expect(page.url()).toBe(`${BASE_URL}/projects/p-docs/tasks/t-4`);
    const heading = page.getByRole("heading", { name: "クイックスタートを最新 API に更新する" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    const body = page.getByTestId("task-detail");
    await expect.poll(() => body.textContent(), { timeout: 10_000 }).toContain("進行中");
    expect(
      await page.getByRole("heading", { name: "matchRoutes の詳細度ソートを整理する" }).count(),
    ).toBe(0);
  });

  test("遷移割り込みで古い内容が混ざらない", async ({ expect, page }) => {
    // 準備: 一覧を開き、重たい Lab ページを挟んでから別プロジェクトへ割り込む
    await page.goto(`${BASE_URL}/projects`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/lab/limits`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/lab/limits/heavy`, { waitUntil: "commit" });
    await page.goto(`${BASE_URL}/projects/p-dx`, { waitUntil: "commit" });

    // 検証: URL と見出しが p-dx のものだけで構成されること
    expect(page.url()).toBe(`${BASE_URL}/projects/p-dx`);
    const header = page.getByTestId("project-header");
    await expect
      .poll(() => header.textContent(), { timeout: 10_000 })
      .toContain("開発者体験の改善");
    expect(await page.getByTestId("heavy-page").count()).toBe(0);
    expect(await page.getByRole("heading", { name: "ルーター実験室 (Lab)" }).count()).toBe(0);
    await expect
      .poll(() => page.getByRole("main").textContent(), { timeout: 10_000 })
      .toContain("タスク一覧");
  });

  test("同一リンクを高速連打しても単一の詳細に落ち着く", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const taskList = page.getByTestId("task-list");
    await expect.poll(() => taskList.isVisible(), { timeout: 10_000 }).toBe(true);
    const link = page.getByRole("link", { name: "children 記法のテストを追加する" });

    // 実行: AI が click を連射した想定 (2 回目以降は detached で失敗し得るので握りつぶす)
    const results = await Promise.allSettled([
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
      link.click({ timeout: 5_000 }),
    ]);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);

    // 検証: 詳細に正しく遷移し履歴が壊れていないこと
    const heading = page.getByRole("heading", { name: "children 記法のテストを追加する" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/projects/p-router/tasks/t-2`);
    await page.goBack();
    await expect.poll(() => taskList.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/projects/p-router`);
  });

  test("Back/Forward を高速往復しても URL と見出しが一致する", async ({ expect, page }) => {
    // 準備: 履歴を 3 件積む
    // 新規コンテキストの先頭には about:blank が残るため (history.length === 4)、戻りすぎると白紙に到達する点に注意する。
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/projects/p-router`);
    await page.goto(`${BASE_URL}/projects/p-docs`);

    // 実行: 待機なしで往復する
    for (let index = 0; index < 5; index += 1) {
      await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
      await page.goForward({ waitUntil: "commit" }).catch(() => undefined);
    }
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);

    // 安定化: forward の欠落が重なると about:blank まで戻ってしまうため、前進で復帰させる。
    if (page.url() === "about:blank") {
      await page.goForward().catch(() => undefined);
    }

    // 検証: URL に対応する見出しが表示され、白紙にならないこと
    await expect.poll(() => page.url(), { timeout: 10_000 }).not.toBe("about:blank");
    const currentUrl = page.url();
    const expectedHeading =
      currentUrl === `${BASE_URL}/`
        ? "ダッシュボード"
        : currentUrl === `${BASE_URL}/projects/p-router`
          ? "pera1 ルーター刷新"
          : currentUrl === `${BASE_URL}/projects/p-docs`
            ? "ドキュメントサイト"
            : null;
    expect(expectedHeading).not.toBeNull();
    const heading = page.getByRole("heading", { name: expectedHeading as string });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
  });

  test("リロード連打でも内容が復元される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router/tasks/t-1`);
    const heading = page.getByRole("heading", { name: "matchRoutes の詳細度ソートを整理する" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 連続リロード (AI の再試行ラッシュ想定)
    await page.reload({ waitUntil: "commit" });
    await page.reload({ waitUntil: "commit" });
    await page.reload();

    // 検証
    const restored = page.getByRole("heading", { name: "matchRoutes の詳細度ソートを整理する" });
    await expect.poll(() => restored.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/projects/p-router/tasks/t-1`);
    await expect
      .poll(() => page.getByTestId("task-detail").textContent(), { timeout: 10_000 })
      .toContain("進行中");
  });

  test("検索ボタンを二重送信しても結果が壊れない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    await expect
      .poll(() => page.getByTestId("search-count").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await page.locator('.toolbar input[name="q"]').fill("children");
    const button = page.getByRole("button", { name: "検索" });

    // 実行: ダブルクリック相当の連打 (遷移で detach されるため短い timeout で打ち切る)
    await Promise.allSettled([button.click({ timeout: 3_000 }), button.click({ timeout: 3_000 })]);

    // 検証: 1 件分だけ正しく表示され URL が壊れないこと
    await expect
      .poll(() => page.getByTestId("search-count").textContent(), { timeout: 10_000 })
      .toBe("全 1 件");
    expect(await new URL(page.url()).searchParams.get("q")).toBe("children");
    await expect
      .poll(() => page.getByRole("link", { name: "children 記法のテストを追加する" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("0ms 間隔タイピングで即送信してもクエリが欠落しない", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    const input = page.locator('.toolbar input[name="q"]');
    await expect.poll(() => input.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 人間では不可能な速度で入力して即送信
    await input.click();
    await input.pressSequentially("children", { delay: 0 });
    await page.getByRole("button", { name: "検索" }).click();

    // 検証 (再描画ラグに備え入力値も poll する)
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"), { timeout: 10_000 })
      .toBe("children");
    await expect
      .poll(() => page.locator('.toolbar input[name="q"]').inputValue(), { timeout: 10_000 })
      .toBe("children");
    await expect
      .poll(() => page.getByRole("link", { name: "children 記法のテストを追加する" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("不正 URL ラッシュでもクラッシュしない", async ({ expect, page }) => {
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

    // 実行: 境界値・巨大・特殊文字を高速で叩く (未マッチ URL は 404 として描画される)
    const badUrls = [
      { url: `${BASE_URL}/search?q=${"x".repeat(5_000)}&page=abc`, heading: "検索" },
      { url: `${BASE_URL}/search?q=%00%3Cscript%3E&page=abc`, heading: "検索" },
      // `../` はブラウザーが正規化し、どのルートにも一致しない 404 になる
      { url: `${BASE_URL}/projects/../../etc/passwd`, heading: "ページが見つかりません" },
      {
        url: `${BASE_URL}/files/${"deep/".repeat(100)}file.txt`,
        heading: "ファイル（ワイルドカード）",
      },
    ];
    for (const { url, heading } of badUrls) {
      await page.goto(url, { waitUntil: "commit" });
      // 各 URL でその URL に対応する見出しが描画されること (白紙・ハングなし)
      await expect
        .poll(() => page.getByRole("heading", { name: heading, exact: true }).isVisible(), { timeout: 10_000 })
        .toBe(true);
      // URL が壊れず同じオリジンに留まること
      expect(new URL(page.url()).origin).toBe(BASE_URL);
    }

    // 検証: ハードエラーが出ていないこと
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);

    // 実行: 存在しないプロジェクトはエラーバウンダリーで受け止める
    await page.goto(`${BASE_URL}/projects/does-not-exist`, { waitUntil: "commit" });

    // 検証: ページは壊れず、React が捕捉した既知のエラーログだけが出ること
    // (エラーバウンダリーが受け止めた例外は React が console.error へ記録するため、
    //  ラッシュ中の「想定外のエラー」が無いことを、既知の 1 件を除いて検証する)
    await expect
      .poll(() => page.getByTestId("error-retry").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(pageErrors).toStrictEqual([]);
    // React の出力形式に依存しないよう、既知メッセージの含有 (1 件以上) と
    // それ以外が 0 件であることを別々に検証する
    const knownErrors = consoleErrors.filter((text) =>
      text.includes("プロジェクト「does-not-exist」が見つかりません。"),
    );
    expect(knownErrors.length).toBeGreaterThanOrEqual(1);
    expect(consoleErrors.filter((text) => !knownErrors.includes(text))).toStrictEqual([]);
  });

  test("2 タブで別プロジェクトを同時展開しても混線しない", async ({ expect, page }) => {
    // 準備: 同一コンテキストで 2 枚目のタブを開く
    const secondPage = await page.context().newPage();
    try {
      // 実行: 同時に別プロジェクトへ遷移する
      await Promise.all([
        page.goto(`${BASE_URL}/projects/p-router`),
        secondPage.goto(`${BASE_URL}/projects/p-docs`),
      ]);

      // 検証: それぞれが自分のプロジェクトを表示すること
      await expect
        .poll(() => page.getByTestId("project-header").textContent(), { timeout: 10_000 })
        .toContain("pera1 ルーター刷新");
      await expect
        .poll(() => secondPage.getByTestId("project-header").textContent(), { timeout: 10_000 })
        .toContain("ドキュメントサイト");
      expect(page.url()).toBe(`${BASE_URL}/projects/p-router`);
      expect(secondPage.url()).toBe(`${BASE_URL}/projects/p-docs`);
      await expect
        .poll(() => secondPage.getByTestId("task-row-t-4").isVisible(), { timeout: 10_000 })
        .toBe(true);
    } finally {
      await secondPage.close();
    }
  });

  test("高速操作ラッシュ中に pageerror と console error が出ない", async ({ expect, page }) => {
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

    // 実行: goto 8 連発 + Back + リロードの複合ラッシュ
    for (const target of [
      "/",
      "/projects",
      "/projects/p-router",
      "/search?q=children",
      "/archive/2026",
      "/lab",
      "/lab/matching",
      "/projects/p-dx",
    ]) {
      await page.goto(`${BASE_URL}${target}`, { waitUntil: "commit" });
    }
    await page.goBack({ waitUntil: "commit" }).catch(() => undefined);
    await page.reload({ waitUntil: "commit" }).catch(() => undefined);
    await page.goto(`${BASE_URL}/projects/p-docs/tasks/t-4`);

    // 検証: 最終表示が正しく、エラーが出ていないこと
    const heading = page.getByRole("heading", { name: "クイックスタートを最新 API に更新する" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });

  test("/lab/limits のストレスランナーを実行してもエラーが出ない", async ({ expect, page }) => {
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
    await page.goto(`${BASE_URL}/lab/limits`);
    await expect
      .poll(() => page.getByTestId("stress-runner").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 100 連続 navigate
    await page.getByTestId("stress-nav").click();
    await expect
      .poll(() => page.getByTestId("stress-nav-result").textContent(), { timeout: 10_000 })
      .toContain("100 回:");

    // 実行: Back/Forward 50 往復
    await page.getByTestId("stress-history").click();
    await expect
      .poll(() => page.getByTestId("stress-history-result").textContent(), { timeout: 10_000 })
      .toContain("50 往復");

    // 実行: 二重送信
    await page.getByTestId("stress-double-submit").click();
    await expect
      .poll(() => page.getByTestId("stress-submit-result").textContent(), { timeout: 10_000 })
      .toBe("送信 2 回");

    // 検証: ページ内エラー 0 件・表示崩れなし・pageerror / console error なし
    await expect
      .poll(() => page.getByTestId("stress-error-count").textContent(), { timeout: 10_000 })
      .toBe("0 件");
    expect(await page.getByTestId("stress-runner").isVisible()).toBe(true);
    await expect
      .poll(() => /\/lab\/limits(\?h=[0-2])?$/u.test(page.url()), { timeout: 10_000 })
      .toBe(true);
    expect(pageErrors).toStrictEqual([]);
    expect(consoleErrors).toStrictEqual([]);
  });
});
