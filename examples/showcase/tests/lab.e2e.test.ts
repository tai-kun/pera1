import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * ルーター実験室 (Lab) の各APIデモを検証します。
 *
 * 誤って 0 件になることを避けるため、値は仕様どおり「表示されること」を確認します。
 * エラー実験 (`/lab/errors`) は React が捕捉エラーを console へ記録するため、
 * console エラーの 0 件検証はストレステスト側の通常画面だけで行います。
 */
describe("ルーター実験室 (Lab)", () => {
  test("インスペクターが現在のルートとルーター状態を値で表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab`);

    // 検証: RouteContext 直読み (/lab にマッチしている)
    const inspectorRoute = page.getByTestId("inspector-route");
    await expect.poll(() => inspectorRoute.textContent(), { timeout: 10_000 }).toContain("/lab");

    // 検証: RouterContext 直読み (subscribe 関数が存在し、現在のエントリーを指す)
    const inspectorRouter = page.getByTestId("inspector-router");
    await expect
      .poll(() => inspectorRouter.textContent(), { timeout: 10_000 })
      .toContain("関数あり");
    expect(await inspectorRouter.textContent()).toContain(`${BASE_URL}/lab`);

    // 検証: 公開フックの戻り値を値で断言する
    await expect
      .poll(() => page.getByTestId("hooks-route-path").textContent(), { timeout: 10_000 })
      .toBe("/lab");
    await expect
      .poll(() => page.getByTestId("hooks-form-action").textContent(), { timeout: 10_000 })
      .toBe("/lab");
    await expect
      .poll(() => page.getByTestId("hooks-route-url-path").textContent(), { timeout: 10_000 })
      .toBe("/lab");
    await expect
      .poll(() => page.getByTestId("hooks-entry-href").textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/lab`);
    await expect
      .poll(() => page.getByTestId("hooks-navigation-state").textContent(), { timeout: 10_000 })
      .toBe("idle");
    expect(await page.getByTestId("hooks-params").textContent()).toBe("{}");

    // 検証: selectLoaderData で親 (root) のローダー結果を継承して表示する
    const inherited = page.getByTestId("inspector-inherited-loader");
    await expect
      .poll(() => inherited.textContent(), { timeout: 10_000 })
      .toContain('"projectCount": 3');
    await expect
      .poll(() => inherited.textContent(), { timeout: 10_000 })
      .toContain('"openTaskCount": 6');

    // 検証: アクションは未実行なので undefined
    await expect
      .poll(() => page.getByTestId("inspector-action-data").textContent(), { timeout: 10_000 })
      .toContain("undefined");
  });

  test("API 機能マップが全 API 行と主要リンクを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab`);

    // 検証: @pera1/react 16 行 + @pera1/core 35 行 = 51 行
    const map = page.getByTestId("api-map");
    await expect.poll(() => map.locator("tbody tr").count(), { timeout: 10_000 }).toBe(51);
    expect(await map.locator("tbody tr", { hasText: "@pera1/react" }).count()).toBe(16);
    expect(await map.locator("tbody tr", { hasText: "@pera1/core" }).count()).toBe(35);

    // 検証: 主要 API のリンク先が実演場所になっている (usage 文言で行を一意に特定する)
    const browserRouterRow = map.locator("tbody tr", { hasText: "アプリ全体の起動" });
    expect(await browserRouterRow.getByRole("link").getAttribute("href")).toBe("/");
    const createRouterRow = map.locator("tbody tr", { hasText: "コントローラー単体の生成" });
    expect(await createRouterRow.getByRole("link").getAttribute("href")).toBe("/lab/core");
    const unreachableRow = map.locator("tbody tr", { hasText: "到達不能コードの生成実験" });
    expect(await unreachableRow.getByRole("link").getAttribute("href")).toBe("/lab/errors");
    const scrollRow = map.locator("tbody tr", { hasText: "メモリーエンジン配下レイアウト" });
    expect(await scrollRow.getByRole("link").getAttribute("href")).toBe("/lab/engine");
  });

  test("matching: パターンの一致・解析・生成を操作できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/matching`);
    await expect
      .poll(() => page.getByTestId("pattern-match").textContent(), { timeout: 10_000 })
      .toBe("true");

    // 検証: 既定値の各メソッド結果
    await expect
      .poll(() => page.getByTestId("pattern-parse").textContent(), { timeout: 10_000 })
      .toBe('{"projectId":"p-router","taskId":"t-1"}');
    await expect
      .poll(() => page.getByTestId("pattern-params-count").textContent(), { timeout: 10_000 })
      .toBe("2");
    await expect
      .poll(() => page.getByTestId("pattern-inject").textContent(), { timeout: 10_000 })
      .toBe("/projects/p-router/tasks/t-1");
    await expect
      .poll(() => page.getByTestId("pattern-replace").textContent(), { timeout: 10_000 })
      .toBe("/projects/p-router/tasks/t-999");
    // インスタンスを作らない静的メソッドでも同じ結果になる
    await expect
      .poll(() => page.getByTestId("pattern-static").textContent(), { timeout: 10_000 })
      .toBe('{"projectId":"p-router","taskId":"t-1"}');
    await expect
      .poll(() => page.getByTestId("pattern-replace-error").textContent(), { timeout: 10_000 })
      .toContain("（エラーなし）");

    // 実行: 子パスへ広げると allowChild なしでは不一致
    await page.getByTestId("pattern-target").fill("/projects/p-router/tasks/t-1/extra");
    await expect
      .poll(() => page.getByTestId("pattern-match").textContent(), { timeout: 10_000 })
      .toBe("false");

    // 検証: 不一致では parseStatic が null、replace は RoutePatternMismatchError を catch して表示する
    await expect
      .poll(() => page.getByTestId("pattern-params-count").textContent(), { timeout: 10_000 })
      .toBe("0");
    await expect
      .poll(() => page.getByTestId("pattern-static").textContent(), { timeout: 10_000 })
      .toBe("null");
    await expect
      .poll(() => page.getByTestId("pattern-replace-error").textContent(), { timeout: 10_000 })
      .toContain("Pera1RoutePatternMismatchError");

    // 実行: allowChild を有効化
    await page.getByTestId("allow-child").check();

    // 検証: 前方一致で true に変わる
    await expect
      .poll(() => page.getByTestId("pattern-match").textContent(), { timeout: 10_000 })
      .toBe("true");
  });

  test("matching: matchRoutes のマッチ鎖が静的優先を反映する", async ({ expect, page }) => {
    // 準備: マッチしたルートのパスだけを取り出す
    async function chainPaths(): Promise<readonly string[]> {
      return page
        .getByTestId("match-chain")
        .locator("li")
        .evaluateAll((items) => items.map((item) => item.querySelector("code")?.textContent ?? ""));
    }

    await page.goto(`${BASE_URL}/lab/matching`);

    // 検証: /projects/new では静的ルートが勝ち、:projectId は鎖に現れない
    await expect.poll(chainPaths, { timeout: 10_000 }).toContain("/projects/new");
    expect(await chainPaths()).toContain("/");
    expect(await chainPaths()).not.toContain("/projects/:projectId");

    // 実行: 対象 URL をパラメーターでマッチするパスへ変える
    await page.getByTestId("match-target").fill("/projects/p-router");

    // 検証: :projectId が現れ、静的 new は消える
    await expect.poll(chainPaths, { timeout: 10_000 }).toContain("/projects/:projectId");
    const paths = await chainPaths();
    expect(paths).not.toContain("/projects/new");
    await expect
      .poll(() => page.getByTestId("match-chain").textContent(), { timeout: 10_000 })
      .toContain('{"projectId":"p-router"}');
  });

  test("core: RoutePath と redirect の正規化を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab/core`);
    await expect
      .poll(() => page.getByTestId("route-path-demo").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 検証: 連続スラッシュ・末尾スラッシュの正規化とクエリーのソート
    await expect
      .poll(() => page.getByTestId("route-path-pathname").textContent(), { timeout: 10_000 })
      .toBe("/users/profile");
    await expect
      .poll(() => page.getByTestId("route-path-search").textContent(), { timeout: 10_000 })
      .toBe("?a=1&b=2");
    expect(await page.getByTestId("route-path-hash").textContent()).toBe("#section");
    expect(await page.getByTestId("route-path-string").textContent()).toBe(
      "/users/profile?a=1&b=2#section",
    );
    expect(await page.getByTestId("route-path-encoded").textContent()).toBe("/items/1");

    // 実行: searchParams.set("page", "2") を適用
    await page.getByTestId("route-path-set-page").click();

    // 検証: クエリーが追加され、toString に反映される
    await expect
      .poll(() => page.getByTestId("route-path-search").textContent(), { timeout: 10_000 })
      .toBe("?a=1&b=2&page=2");
    await expect
      .poll(() => page.getByTestId("route-path-string").textContent(), { timeout: 10_000 })
      .toBe("/users/profile?a=1&b=2&page=2#section");

    // 検証: redirect の正規化と search のソート
    expect(await page.getByTestId("redirect-pathname").textContent()).toBe("/users/profile");
    expect(await page.getByTestId("redirect-search").textContent()).toBe("?id=123&sort=desc");
    await expect
      .poll(() => page.getByTestId("redirect-demo").textContent(), { timeout: 10_000 })
      .toContain("?a=2&z=1");
  });

  test("core: スキーマと expectHistoryEntry の成功・失敗を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab/core`);
    await expect
      .poll(() => page.getByTestId("schema-demo").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 検証: スキーマ
    await expect
      .poll(() => page.getByTestId("schema-invalid-id").textContent(), { timeout: 10_000 })
      .toContain("失敗");
    expect(await page.getByTestId("schema-url-search").textContent()).toBe("?a=1&b=2&c=3");
    expect(await page.getByTestId("schema-singleton").textContent()).toBe("true");

    // 検証: expectHistoryEntry の成功と null
    await expect
      .poll(() => page.getByTestId("expect-valid").textContent(), { timeout: 10_000 })
      .toContain(`${BASE_URL}/lab/core`);
    expect(await page.getByTestId("expect-null").textContent()).toBe("null");

    // 検証: 不正入力は UnexpectedValidationError で、ValidationErrorBase を継承している
    const invalid = page.getByTestId("expect-invalid");
    await expect
      .poll(() => invalid.textContent(), { timeout: 10_000 })
      .toContain("Pera1UnexpectedValidationError");
    const invalidText = await invalid.textContent();
    expect(invalidText).toContain("instanceof ValidationErrorBasetrue");
    expect(invalidText).toContain("instanceof ErrorBasetrue");
  });

  test("core: RouteRequest とセレクターと createRouter を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab/core`);

    // 検証: RouteRequest は GET で formData は null
    await expect
      .poll(() => page.getByTestId("request-method").textContent(), { timeout: 10_000 })
      .toBe("GET");
    expect(await page.getByTestId("request-form-data").textContent()).toBe("null (GET のため)");

    // 検証: selectLoaderData がこのページのローダー結果を初回実行回数 (1) ちょうどで表示する
    await expect
      .poll(() => page.getByTestId("select-loader-data").textContent(), { timeout: 10_000 })
      .toContain("runCount: 1 /");
    // 検証: selectActionData は未実行のため undefined
    await expect
      .poll(() => page.getByTestId("select-action-data").textContent(), { timeout: 10_000 })
      .toContain("未実行");

    // 検証: createRouter のコントローラー初期 URL
    await expect
      .poll(() => page.getByTestId("controller-url").textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/`);

    // 実行: engine.go("/b") で購読が働き URL が変わる
    await page.getByTestId("controller-go-b").click();

    // 検証
    await expect
      .poll(() => page.getByTestId("controller-url").textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/b`);

    // 実行: engine.go("/") で戻る
    await page.getByTestId("controller-go-root").click();

    // 検証
    await expect
      .poll(() => page.getByTestId("controller-url").textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/`);
  });

  test("core: formDataToHTMLFormElement のプレビューとファイル付き送信", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/core`);
    const demo = page.getByTestId("fdh-demo");
    await expect.poll(() => demo.isVisible(), { timeout: 10_000 }).toBe(true);
    const buffer = Buffer.from("pera1-lab-upload");
    const size = buffer.byteLength;

    // 実行: プレビュー
    await demo.getByRole("button", { name: "フォームをプレビュー" }).click();

    // 検証: hidden input を含むフォームの HTML が表示される
    const preview = page.getByTestId("fdh-preview");
    await expect.poll(() => preview.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await preview.textContent()).toContain('<input type="hidden" name="message"');

    // 実行: ファイルを添えて実際に送信
    await demo.locator('input[type="file"]').setInputFiles({
      name: "lab-upload.bin",
      mimeType: "application/octet-stream",
      buffer,
    });
    await demo.getByRole("button", { name: "このフォームで送信" }).click();

    // 検証: アクションが multipart を受け取り、メッセージとファイル情報を表示する
    const received = page.getByTestId("fdh-received");
    await expect
      .poll(() => received.textContent(), { timeout: 10_000 })
      .toContain("受信: こんにちは");
    await expect
      .poll(() => received.textContent(), { timeout: 10_000 })
      .toContain(`添付: lab-upload.bin (${size} バイト)`);
    expect(page.url()).toBe(`${BASE_URL}/lab/core`);
  });

  test("errors: エラーバウンダリーがフォールバックと再試行を提供する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);
    await expect
      .poll(() => page.getByTestId("boundary-throw").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 描画中に例外を投げる
    await page.getByTestId("boundary-throw").click();

    // 検証: フォールバックにエラー名とメッセージが出る
    const fallback = page.getByTestId("boundary-fallback");
    await expect.poll(() => fallback.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.getByTestId("boundary-error-name").textContent(), { timeout: 10_000 })
      .toBe("Error");
    await expect
      .poll(() => page.getByTestId("boundary-error-message").textContent(), { timeout: 10_000 })
      .toBe("実験用の例外です。");

    // 実行: リセット
    await fallback.getByRole("button", { name: "もう一度試す" }).click();

    // 検証: 元のボタンが戻る
    await expect
      .poll(() => page.getByTestId("boundary-throw").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(await fallback.count()).toBe(0);
  });

  test("errors: LoaderDataNotFoundError と LoaderConditionError が発火する", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);

    // 検証: ローダーなし階層の useLoaderData
    const notFound = page.getByTestId("loader-data-not-found-fallback");
    await expect.poll(() => notFound.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.getByTestId("loader-data-not-found-name").textContent(), {
        timeout: 10_000,
      })
      .toBe("Pera1LoaderDataNotFoundError");

    // 実行: 壊れた shouldReload の操作列 (/a → /b → 戻る) をボタンで一括実行
    await page.getByTestId("loader-condition-run").click();

    // 検証: キャッシュ再利用の判定時に LoaderConditionError になる
    const condition = page.getByTestId("loader-condition-fallback");
    await expect.poll(() => condition.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.getByTestId("loader-condition-name").textContent(), { timeout: 10_000 })
      .toBe("Pera1LoaderConditionError");
    // 検証: 契約違反の値がラベルではなく PromiseLike (pending の Promise) として記録されている
    await expect
      .poll(() => page.getByTestId("loader-condition-return-value").textContent(), {
        timeout: 10_000,
      })
      .toContain("PromiseLike");
  });

  test("errors: アクションの例外が元 URL に留まりバウンダリーへ届く", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);
    const submit = page.getByTestId("action-error-submit");
    await expect.poll(() => submit.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 必ず例外を投げるアクションを送信する
    await submit.click();

    // 検証: エラー名とメッセージがバウンダリーのフォールバックに表示される
    const fallback = page.getByTestId("action-error-fallback");
    await expect.poll(() => fallback.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.getByTestId("action-error-name").textContent(), { timeout: 10_000 })
      .toBe("Error");
    await expect
      .poll(() => page.getByTestId("action-error-message").textContent(), { timeout: 10_000 })
      .toBe("アクションで想定外の障害が発生しました。");

    // 検証: メインアプリの URL は元のまま動かない
    expect(page.url()).toBe(`${BASE_URL}/lab/errors`);

    // 実行: もう一度試すとミニアプリが作り直される
    await fallback.getByRole("button", { name: "もう一度試す" }).click();
    await expect.poll(() => submit.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await fallback.count()).toBe(0);
  });

  test("errors: UnexpectedValidationError と継承関係を表示する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);
    await expect
      .poll(() => page.getByTestId("unexpected-validation-run").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行
    await page.getByTestId("unexpected-validation-run").click();

    // 検証: name / meta.issues / ValidationErrorBase / ErrorBase
    const result = page.getByTestId("unexpected-validation-result");
    await expect
      .poll(() => result.textContent(), { timeout: 10_000 })
      .toContain("namePera1UnexpectedValidationError");
    const text = await result.textContent();
    expect(text).toContain("meta.issues.length1");
    expect(text).toContain("instanceof ValidationErrorBasetrue");
    expect(text).toContain("instanceof ErrorBasetrue");
  });

  test("errors: UnreachableError の 2 パターンのメッセージ", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);
    await expect
      .poll(() => page.getByTestId("unreachable-run").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行
    await page.getByTestId("unreachable-run").click();

    // 検証
    const result = page.getByTestId("unreachable-result");
    await expect
      .poll(() => result.textContent(), { timeout: 10_000 })
      .toContain("Pera1UnreachableError / 不可能な値に遭遇しました");
    await expect
      .poll(() => result.textContent(), { timeout: 10_000 })
      .toContain("到達できないコードに到達しました");
  });

  test("errors: コンテキスト未供給・Navigation API 非対応・setErrorMessage", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/errors`);

    // 検証: 2 つの MissingError の名前とメッセージ
    const contextMissing = page.getByTestId("context-missing");
    await expect
      .poll(() => contextMissing.textContent(), { timeout: 10_000 })
      .toContain("Pera1RouterContextMissingError");
    const contextText = await contextMissing.textContent();
    expect(contextText).toContain("Pera1RouteContextMissingError");
    expect(contextText).toContain("RouterContext が見つかりません。");

    // 検証: Navigation API 非対応エラー
    await expect
      .poll(() => page.getByTestId("nav-api-error").textContent(), { timeout: 10_000 })
      .toContain("Pera1NavigationApiNotSupportedError");

    // 実行: カスタムメッセージを登録
    await page.getByTestId("set-error-message-override").click();

    // 検証: 差し替えが反映される
    await expect
      .poll(() => page.getByTestId("custom-message").textContent(), { timeout: 10_000 })
      .toBe("実験室の独自メッセージです。");

    // 実行: 既定へ戻す
    await page.getByTestId("set-error-message-restore").click();

    // 検証: 既定メッセージへ復元される
    await expect
      .poll(() => page.getByTestId("custom-message").textContent(), { timeout: 10_000 })
      .toBe("到達できないコードに到達しました");
  });

  test("errors: エラークラス一覧が 9 行表示される", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab/errors`);
    await expect
      .poll(() => page.getByTestId("error-table").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 検証: 行数と代表的なクラス名
    const table = page.getByTestId("error-table");
    expect(await table.locator("tbody tr").count()).toBe(9);
    const text = await table.textContent();
    expect(text).toContain("Pera1UnreachableError");
    expect(text).toContain("Pera1UnexpectedValidationError");
    expect(text).toContain("Pera1LoaderDataNotFoundError");
  });

  test("engine: 操作パネルで URL と履歴エントリーが更新される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/engine`);
    const url = page.getByTestId("engine-url");
    await expect.poll(() => url.textContent(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);

    // 実行と検証: About へ移動
    await page.getByTestId("engine-about").click();
    await expect.poll(() => url.textContent(), { timeout: 10_000 }).toBe(`${BASE_URL}/about`);
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/about");
    await expect
      .poll(() => page.locator('[data-testid="engine-entries"] li').count(), { timeout: 10_000 })
      .toBe(2);
    const lastArgs = page.getByTestId("engine-last-args");
    await expect
      .poll(() => lastArgs.textContent(), { timeout: 10_000 })
      .toContain('"type": "LINK"');
    await expect
      .poll(() => lastArgs.textContent(), { timeout: 10_000 })
      .toContain('"path": "/about"');

    // 実行と検証: 戻る
    await page.getByTestId("engine-back").click();
    await expect.poll(() => url.textContent(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);

    // 実行と検証: 進む
    await page.getByTestId("engine-forward").click();
    await expect.poll(() => url.textContent(), { timeout: 10_000 }).toBe(`${BASE_URL}/about`);

    // 実行と検証: ?force=1 を送るとクエリー付き URL になる
    await page.getByTestId("engine-force").click();
    await expect
      .poll(() => url.textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/about?force=1`);
  });

  test("engine: ホームは戻るでキャッシュされ force で再取得される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/engine`);
    const runs = page.getByTestId("memory-home-runs");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");

    // 実行: ホーム → About → 戻る
    await page.getByTestId("engine-about").click();
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/about");
    await page.getByTestId("engine-back").click();
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/");

    // 検証: キャッシュ再利用でローダーは再実行されない (カウンターは 1 のまま)
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");

    // 実行: force=1 を送る
    await page.getByTestId("engine-force").click();

    // 検証: shouldReload が真になり再実行される
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("2");
  });

  test("engine: ガードのローダーリダイレクトで About へ移動する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/engine`);
    await expect
      .poll(() => page.getByTestId("engine-guard").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: /guard へ移動 (ローダーが /about へ redirect を返す)
    await page.getByTestId("engine-guard").click();

    // 検証: ミニアプリが About を表示する
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/about");
    await expect
      .poll(() => page.getByTestId("engine-url").textContent(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/about`);
    await expect
      .poll(() => page.getByTestId("memory-shell").textContent(), { timeout: 10_000 })
      .toContain("About");
  });

  test("engine: ミニアプリのフォーム送信と空メッセージのエラー", async ({ expect, page }) => {
    // 準備: メモリーエンジンのミニアプリを起動
    await page.goto(`${BASE_URL}/lab/engine`);
    await expect
      .poll(() => page.getByTestId("memory-shell").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await page.getByTestId("engine-form").click();
    const shell = page.getByTestId("memory-shell");
    await expect
      .poll(() => shell.locator('input[name="message"]').isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 空メッセージで送信
    await shell.getByRole("button", { name: "送信" }).click();

    // 検証: アクションのエラーが表示される
    await expect
      .poll(() => shell.getByRole("alert").textContent(), { timeout: 10_000 })
      .toBe("メッセージを入力してください。");

    // 実行: メッセージを入れて送信
    await shell.locator('input[name="message"]').fill("こんにちはメモリー");
    await shell.getByRole("button", { name: "送信" }).click();

    // 検証: 送信結果が表示される
    await expect
      .poll(() => page.getByTestId("memory-form-result").textContent(), { timeout: 10_000 })
      .toBe("送信済み: こんにちはメモリー");
  });

  test("engine: 遅いページで読み込みフォールバックから完了表示に変わる", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/engine`);
    await expect
      .poll(() => page.getByTestId("memory-shell").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 900ms かかるページへ移動する
    await page.getByTestId("engine-slow").click();

    // 検証: ローダーの完了前に読み込み中のフォールバックが見える
    await expect
      .poll(() => page.getByTestId("memory-loading").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/slow");

    // 検証: 完了するとページ内容に置き換わる
    const shell = page.getByTestId("memory-shell");
    await expect.poll(() => shell.textContent(), { timeout: 10_000 }).toContain("遅いページ");
    await expect
      .poll(() => shell.textContent(), { timeout: 10_000 })
      .toContain("900ms 待ってから描画しました");
    expect(await page.getByTestId("memory-loading").count()).toBe(0);
  });

  test("engine: useScrollRestoration がメモリー遷移後に先頭へ戻す", async ({ expect, page }) => {
    // 準備: スクロールが必ず発生するよう小さいビューポートにする
    await page.setViewportSize({ width: 900, height: 400 });
    await page.goto(`${BASE_URL}/lab/engine`);
    await expect
      .poll(() => page.getByTestId("memory-shell").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: ページ下端までスクロールする
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
      .toBeGreaterThan(0);

    // 実行: メモリーエンジン内で About へ遷移する
    await page.getByTestId("engine-about").click();
    await expect
      .poll(() => page.getByTestId("memory-current-path").textContent(), { timeout: 10_000 })
      .toBe("/about");

    // 検証: useScrollRestoration により先頭へスクロールが戻る
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBe(0);
  });

  test("limits: Navigation API 対応チェックと遅延読み込み", async ({ expect, page }) => {
    // 準備: 遅延チャンクのレスポンス URL を収集する
    const chunkUrls: string[] = [];
    page.on("response", (response) => {
      chunkUrls.push(response.url());
    });
    await page.goto(`${BASE_URL}/lab/limits`);

    // 検証: Navigation API のエンジン生成に成功している
    await expect
      .poll(() => page.getByTestId("nav-support-engine").textContent(), { timeout: 10_000 })
      .toBe("生成に成功しました。");

    // 実行: useNavigate で遅延ページを開く
    await page.getByTestId("lazy-navigate").click();

    // 検証: 重たいページが表示され、heavy-page チャンクが読み込まれている
    await expect
      .poll(() => page.getByTestId("heavy-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/lab/limits/heavy`);
    await expect
      .poll(() => chunkUrls.some((url) => url.includes("heavy-page")), { timeout: 10_000 })
      .toBe(true);
  });

  test("limits: 404 リンクと navigation-state を表示する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/limits`);

    // 検証: グローバルな進行状態は idle に落ち着く
    await expect
      .poll(() => page.getByTestId("navigation-state-value").textContent(), { timeout: 10_000 })
      .toBe("idle");

    // 実行: 404 リンクを開く
    await page.getByTestId("notfound-link").click();

    // 検証: 404 画面が表示される
    await expect
      .poll(() => page.getByTestId("not-found-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => page.getByTestId("not-found-path").textContent(), { timeout: 10_000 })
      .toBe("/does-not-exist");
  });

  test("limits: cache-demo のカウンターが履歴をまたいで観察できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/limits`);
    const tasksCount = page.getByTestId("cache-count-tasks");
    await expect.poll(() => tasksCount.textContent(), { timeout: 10_000 }).toBe("0");
    expect(await page.getByTestId("cache-count-memory").textContent()).toBe("0");

    // 実行: 1 回目を開く
    await page.getByRole("link", { name: "1 回目を開く" }).click();
    await expect
      .poll(() => page.getByTestId("tasks-loader-runs").textContent(), { timeout: 10_000 })
      .toBe("1");

    // 検証: 戻るとカウンターが 1 として観察できる
    await page.goBack();
    await expect.poll(() => tasksCount.textContent(), { timeout: 10_000 }).toBe("1");

    // 実行: ?force=1 で再取得
    await page.getByRole("link", { name: "?force=1 で再取得" }).click();
    await expect
      .poll(() => page.getByTestId("tasks-loader-runs").textContent(), { timeout: 10_000 })
      .toBe("2");

    // 検証: カウンターが 2 へ増えている
    await page.goBack();
    await expect.poll(() => tasksCount.textContent(), { timeout: 10_000 }).toBe("2");
  });

  test("limits: missing-features 表を表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/lab/limits`);
    const table = page.getByTestId("missing-features");

    // 検証: 6 行の「ない機能」一覧
    await expect.poll(() => table.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await table.locator("tbody tr").count()).toBe(6);
    const text = await table.textContent();
    expect(text).toContain("SSR (サーバーサイドレンダリング)");
    expect(text).toContain("ルートの遅延読み込み");
    expect(text).toContain("楽観的更新 (optimistic UI)");
  });

  test("375px 幅で主要ページ (heavy 含む) が水平スクロールしない", async ({ expect, page }) => {
    // 準備: 管理画面も確認するため管理者でログインする
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/login`);
    await page.getByTestId("fill-admin").click();
    await page.getByTestId("login-form").getByRole("button", { name: "ログインする" }).click();
    await expect
      .poll(() => page.getByRole("heading", { name: "ダッシュボード" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);

    // 実行と検証: 各ページで document のスクロール幅がビューポートを超えない
    const targets = [
      "/",
      "/projects",
      "/projects/p-router",
      "/search?q=pera1",
      "/archive",
      "/files/a/b/c.txt",
      "/admin",
      "/lab",
      "/lab/matching",
      "/lab/core",
      "/lab/errors",
      "/lab/engine",
      "/lab/limits",
      "/lab/limits/heavy",
      "/does-not-exist",
    ];
    for (const target of targets) {
      await page.goto(`${BASE_URL}${target}`);
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          { timeout: 10_000, message: `${target} が水平スクロールしています。` },
        )
        .toBeLessThanOrEqual(1);
    }
  });

  test("ライトテーマでもコードと結果表示のコントラストが AA を満たす", async ({ expect, page }) => {
    // 準備: ライトテーマをエミュレートする
    await page.emulateMedia({ colorScheme: "light" });

    /**
     * 指定したセレクターの WCAG コントラスト比を計算します。
     *
     * computed style の色は canvas で解決し、半透明の背景はページ背景と合成します。
     */
    async function contrastRatios(selectors: readonly string[]): Promise<Record<string, number>> {
      return page.evaluate((selectorList) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("canvas 2d コンテキストを取得できませんでした。");
        }

        function toRgba(css: string): readonly [number, number, number, number] {
          context!.clearRect(0, 0, 1, 1);
          context!.fillStyle = "#000";
          context!.fillStyle = css;
          context!.fillRect(0, 0, 1, 1);
          const data = context!.getImageData(0, 0, 1, 1).data;

          return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
        }

        function composite(
          foreground: readonly [number, number, number, number],
          background: readonly [number, number, number, number],
        ): readonly [number, number, number] {
          const alpha = foreground[3];
          const mix = (index: number) =>
            foreground[index]! * alpha + background[index]! * (1 - alpha);

          return [mix(0), mix(1), mix(2)];
        }

        function luminance(color: readonly [number, number, number]): number {
          const [r, g, b] = color.map((value) => {
            const channel = value / 255;

            return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          }) as [number, number, number];

          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        const results: Record<string, number> = {};
        for (const selector of selectorList) {
          const element = document.querySelector(selector);
          if (!element) {
            throw new Error(`要素が見つかりません: ${selector}`);
          }

          const style = getComputedStyle(element);
          const pageBackground = toRgba(getComputedStyle(document.body).backgroundColor);
          const background = composite(toRgba(style.backgroundColor), pageBackground);
          const foreground = composite(toRgba(style.color), [
            background[0],
            background[1],
            background[2],
            1,
          ]);
          const lighter = Math.max(luminance(foreground), luminance(background));
          const darker = Math.min(luminance(foreground), luminance(background));
          results[selector] = (lighter + 0.05) / (darker + 0.05);
        }

        return results;
      }, selectors);
    }

    // 実行と検証: Lab のコード・結果表示 (通常サイズの文字は 4.5:1 以上)
    await page.goto(`${BASE_URL}/lab/core`);
    await expect
      .poll(() => page.getByTestId("route-path-demo").isVisible(), { timeout: 10_000 })
      .toBe(true);
    const labRatios = await contrastRatios([".code-block pre", ".lab-output"]);
    expect(labRatios[".code-block pre"]).toBeGreaterThanOrEqual(4.5);
    expect(labRatios[".lab-output"]).toBeGreaterThanOrEqual(4.5);

    // 実行と検証: 危険色を使うバッジとエラー文も 4.5:1 以上
    await page.goto(`${BASE_URL}/projects/p-router`);
    await expect
      .poll(() => page.getByTestId("task-list").isVisible(), { timeout: 10_000 })
      .toBe(true);
    const badgeRatios = await contrastRatios([".badge-danger", ".badge-warning"]);
    expect(badgeRatios[".badge-danger"]).toBeGreaterThanOrEqual(4.5);
    expect(badgeRatios[".badge-warning"]).toBeGreaterThanOrEqual(4.5);
  });

  test("limits: ストレスランナーで100連続navigateの結果が表示される", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/limits`);
    await expect
      .poll(() => page.getByTestId("stress-nav").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 100 連続 navigate を実行する
    await page.getByTestId("stress-nav").click();

    // 検証: 結果表示に 100 回の計測が出る (実装は "100 回: ..." の表記)
    await expect
      .poll(() => page.getByTestId("stress-nav-result").textContent(), { timeout: 10_000 })
      .toContain("100 回:");
  });

  test("limits: 二重送信の結果が表示される", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/limits`);
    await expect
      .poll(() => page.getByTestId("stress-double-submit").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 同じ FormData を 2 回連続で送信する
    await page.getByTestId("stress-double-submit").click();

    // 検証: 送信 2 回の表示が出る
    await expect
      .poll(() => page.getByTestId("stress-submit-result").textContent(), { timeout: 10_000 })
      .toContain("送信 2 回");
  });

  test("limits: 素の<a>でheavyページへ到達できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/limits`);
    await expect
      .poll(() => page.getByTestId("lazy-anchor").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 素の <a> リンクで遅延ページを開く
    await page.getByTestId("lazy-anchor").click();

    // 検証: 重たいページが表示され、URL が /lab/limits/heavy になる
    await expect
      .poll(() => page.getByTestId("heavy-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/lab/limits/heavy`);
  });

  test("matching: static-vs-paramから/projects/newへ到達できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/lab/matching`);
    const section = page.getByTestId("static-vs-param");
    await expect.poll(() => section.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: 静的ルートへの導線を開く
    await section.getByRole("link", { name: "/projects/new (静的が勝つ)" }).click();

    // 検証: 静的ページに到達する (パラメーター扱いにならない)
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/new`);
    await expect
      .poll(() => page.getByTestId("project-new-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
  });
});
