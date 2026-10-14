import { describe } from "vitest";

import { test } from "./_fixtures.js";
import { BASE_URL } from "./_server.js";

/**
 * ショーケースアプリ本体 (Projects/Tasks/検索/認証/管理) の主要フローを検証します。
 *
 * データはインメモリーのため、各テストはページを読み込み直してシード状態から始めます。
 */
describe("ショーケース", () => {
  test("ダッシュボードに統計値と最近のタスクを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/`);

    // 検証: 統計カード (プロジェクト 3 / タスク総数 8 / 未完了 6 / 完了 2)
    await expect
      .poll(() => page.getByTestId("stat-projects").textContent(), { timeout: 10_000 })
      .toBe("3プロジェクト");
    await expect
      .poll(() => page.getByTestId("stat-tasks").textContent(), { timeout: 10_000 })
      .toBe("8タスク総数");
    await expect
      .poll(() => page.getByTestId("stat-open").textContent(), { timeout: 10_000 })
      .toBe("6未完了タスク");
    await expect
      .poll(() => page.getByTestId("stat-done").textContent(), { timeout: 10_000 })
      .toBe("2完了タスク");

    // 検証: 最近のタスク (作成日時の降順で 5 件)
    const recent = page.getByRole("heading", { name: "最近のタスク" });
    await expect.poll(() => recent.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => page.locator("main .list-item").count(), { timeout: 10_000 }).toBe(5);
  });

  test("ナビのアクティブ表示が現在地に追従する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
    const dashboardLink = nav.getByRole("link", { name: "ダッシュボード" });
    const projectsLink = nav.getByRole("link", { name: "プロジェクト" });

    // 検証: ダッシュボードでは「ダッシュボード」だけがアクティブ
    await expect
      .poll(() => dashboardLink.getAttribute("aria-current"), { timeout: 10_000 })
      .toBe("page");
    expect(await projectsLink.getAttribute("aria-current")).toBeNull();

    // 実行: プロジェクト一覧へ移動
    await projectsLink.click();

    // 検証: アクティブが「プロジェクト」へ移り、「ダッシュボード」から外れる
    await expect
      .poll(() => projectsLink.getAttribute("aria-current"), { timeout: 10_000 })
      .toBe("page");
    expect(await dashboardLink.getAttribute("aria-current")).toBeNull();
    expect(page.url()).toBe(`${BASE_URL}/projects`);
  });

  test("useNavigate の関数形式ボタンで検索へ移動する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/`);
    const button = page.getByTestId("navigate-functional");
    await expect.poll(() => button.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行
    await button.click();

    // 検証: URL とルート表示が /search?q=pera1 になる
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/search?q=pera1`);
    await expect
      .poll(() => page.getByRole("heading", { name: "検索", exact: true }).isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => page.getByTestId("route-path").textContent(), { timeout: 10_000 })
      .toBe("/search?q=pera1");
  });

  test("プロジェクト一覧: 3 件表示し空名ではエラーを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/projects`);
    const list = page.getByTestId("project-list");

    // 検証: シードの 3 件
    await expect.poll(() => list.locator("article").count(), { timeout: 10_000 }).toBe(3);
    await expect
      .poll(() => list.getByRole("link", { name: "pera1 ルーター刷新" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect
      .poll(() => list.getByRole("link", { name: "ドキュメントサイト" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect
      .poll(() => list.getByRole("link", { name: "開発者体験の改善" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);

    // 実行: 空名で作成を試みる
    const form = page.getByTestId("project-create-form");
    await form.getByRole("button", { name: "作成する" }).click();

    // 検証: エラーメッセージが表示され、一覧は増えない
    // 一覧は POST 後の再取得で骨格表示に置き換わるため、件数が戻るまで待つ。
    const error = page.getByTestId("project-create-error");
    await expect.poll(() => error.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await error.textContent()).toBe("プロジェクト名を入力してください。");
    await expect.poll(() => list.locator("article").count(), { timeout: 10_000 }).toBe(3);
    expect(page.url()).toBe(`${BASE_URL}/projects`);
  });

  test("プロジェクトを正常に作成すると詳細へリダイレクトする", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects`);
    const form = page.getByTestId("project-create-form");
    await form.locator('input[name="name"]').fill("E2E 新規プロジェクト");
    await form.locator('textarea[name="description"]').fill("E2E テストから作成しました。");

    // 実行
    await form.getByRole("button", { name: "作成する" }).click();

    // 検証: 作成した ID の詳細へ遷移し、ヘッダーに名前が出る
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/p-4`);
    const header = page.getByTestId("project-header");
    await expect.poll(() => header.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await header.textContent()).toContain("E2E 新規プロジェクト");
    expect(await header.textContent()).toContain("E2E テストから作成しました。");
  });

  test("プロジェクト詳細: キーワードとステータスでフィルターしリセットできる", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const runs = page.getByTestId("tasks-loader-runs");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");
    await expect
      .poll(() => page.getByTestId("task-row-t-1").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 検証: 初期表示は 3 件
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(3);

    // 実行: キーワード "children" で絞り込む
    await page.locator('.toolbar input[name="q"]').fill("children");
    await page.getByTestId("filter-submit").click();

    // 検証: 1 件に絞られ、ローダーが再実行される
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("2");
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(1);
    await expect
      .poll(() => page.getByTestId("task-row-t-2").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .toBe(`${BASE_URL}/projects/p-router?q=children`);

    // 実行: リセット
    await page.getByTestId("filter-reset").click();

    // 検証: 3 件へ戻り、ローダーがさらに再実行される
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("3");
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(3);
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/p-router`);

    // 実行: ステータス「完了」で絞り込む
    await page.locator('.toolbar select[name="status"]').selectOption("done");
    await page.getByTestId("filter-submit").click();

    // 検証: 完了の 1 件だけになる
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("4");
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(1);
    await expect
      .poll(() => page.getByTestId("task-row-t-3").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/projects/p-router?status=done`);
  });

  test("プロジェクト詳細: 添付ファイル付きでタスクを追加できる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const form = page.getByTestId("task-create-form");
    await expect.poll(() => form.isVisible(), { timeout: 10_000 }).toBe(true);
    const buffer = Buffer.from("pera1-e2e-attachment");
    const size = buffer.byteLength;

    // 実行: タイトルと添付ファイルを入れて送信
    await form.locator('input[name="title"]').fill("E2E 追加タスク");
    await form.locator('select[name="priority"]').selectOption("high");
    await form.locator('input[type="file"]').setInputFiles({
      name: "e2e-attachment.png",
      mimeType: "image/png",
      buffer,
    });
    await form.getByRole("button", { name: "追加する" }).click();

    // 検証: 成功表示と、ファイル名・サイズ付きで一覧へ現れる
    const ok = page.getByTestId("task-action-ok");
    await expect.poll(() => ok.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await ok.textContent()).toBe("反映しました");
    const row = page.getByTestId("task-row-t-9");
    await expect.poll(() => row.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await row.textContent()).toContain("E2E 追加タスク");
    expect(await row.textContent()).toContain(`添付: e2e-attachment.png（${size} B）`);
    expect(await row.textContent()).toContain("優先度: 高");
    // POST 後の既定の再取得でローダー実行回数が増えている
    await expect
      .poll(() => page.getByTestId("tasks-loader-runs").textContent(), { timeout: 10_000 })
      .toBe("2");
  });

  test("プロジェクト詳細: 空タイトルのタスク追加はエラーになる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const form = page.getByTestId("task-create-form");
    await expect.poll(() => form.isVisible(), { timeout: 10_000 }).toBe(true);

    // 実行: タイトルなしで送信
    await form.getByRole("button", { name: "追加する" }).click();

    // 検証
    const error = page.getByTestId("task-create-error");
    await expect
      .poll(() => error.textContent(), { timeout: 10_000 })
      .toBe("タスク名を入力してください。");
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(3);
  });

  test("プロジェクト詳細: タスクのステータス変更と削除ができる", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const runs = page.getByTestId("tasks-loader-runs");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");
    const row = page.getByTestId("task-row-t-1");
    await expect.poll(() => row.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.getByTestId("task-status-t-1").textContent(), { timeout: 10_000 })
      .toBe("進行中");

    // 実行: t-1 を「完了」へ変更
    await page.getByTestId("task-status-select-t-1").selectOption("done");
    await page.getByTestId("task-status-update-t-1").click();

    // 検証: バッジが完了になり、ローダーが再実行される
    await expect
      .poll(() => page.getByTestId("task-status-t-1").textContent(), { timeout: 10_000 })
      .toBe("完了");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("2");

    // 実行: t-3 を削除
    await page.getByTestId("task-delete-t-3").click();

    // 検証: 行が消え、さらにローダーが再実行される
    await expect.poll(() => page.getByTestId("task-row-t-3").count(), { timeout: 10_000 }).toBe(0);
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("3");
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(2);
  });

  test("タスク詳細: パンくず・完了・再開が機能する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router/tasks/t-1`);

    // 検証: パンくずに一覧とプロジェクトへのリンク、現在のタイトルがある
    // 親の骨格（プロジェクト一覧リンク）は先に表示されるため、現在地の文言まで待つ。
    const breadcrumb = page.getByTestId("project-breadcrumb");
    await expect
      .poll(() => breadcrumb.textContent(), { timeout: 10_000 })
      .toContain("matchRoutes の詳細度ソートを整理する");
    const projectLink = breadcrumb.getByRole("link", { name: "pera1 ルーター刷新" });
    expect(await projectLink.getAttribute("href")).toBe("/projects/p-router");
    const detail = page.getByTestId("task-detail");
    await expect.poll(() => detail.textContent(), { timeout: 10_000 }).toContain("進行中");

    // 実行: 完了にする
    await page.getByTestId("task-done").click();

    // 検証: ステータスが完了になる
    await expect.poll(() => detail.textContent(), { timeout: 10_000 }).toContain("完了");
    await expect
      .poll(() => page.getByText("反映しました").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 未着手へ戻す
    await page.getByTestId("task-reopen").click();

    // 検証: ステータスが未着手に戻る
    await expect.poll(() => detail.textContent(), { timeout: 10_000 }).toContain("未着手");
  });

  test("タスク詳細: 削除するとプロジェクトへリダイレクトする", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router/tasks/t-2`);
    await expect
      .poll(() => page.getByTestId("task-delete").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行
    await page.getByTestId("task-delete").click();

    // 検証: プロジェクトのタスク一覧へ戻り、対象が消えている
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/p-router`);
    await expect.poll(() => page.getByTestId("task-row-t-2").count(), { timeout: 10_000 }).toBe(0);
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(2);
  });

  test("存在しないタスク ID ではエラーバウンダリーを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/projects/p-router/tasks/t-999`);

    // 検証: 再試行ボタン付きのエラーパネルが出る
    await expect
      .poll(() => page.getByRole("heading", { name: "問題が発生しました" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect
      .poll(() => page.getByTestId("error-retry").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(await page.locator(".error-detail").textContent()).toContain(
      "タスク「t-999」が見つかりません。",
    );
  });

  test("存在しないプロジェクト ID ではエラーバウンダリーを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/projects/unknown-id`);

    // 検証
    await expect
      .poll(() => page.getByTestId("error-retry").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(await page.locator(".error-detail").textContent()).toContain(
      "プロジェクト「unknown-id」が見つかりません。",
    );
  });

  test("履歴キャッシュ: 戻るでは再取得せず force で再取得する", async ({ expect, page }) => {
    // 準備: p-router を開くとローダー実行回数は 1
    await page.goto(`${BASE_URL}/projects/p-router`);
    const runs = page.getByTestId("tasks-loader-runs");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");

    // 実行: タスク詳細へ進んでから戻る
    await page.getByRole("link", { name: "children 記法のテストを追加する" }).click();
    const heading = page.getByRole("heading", { name: "children 記法のテストを追加する" });
    await expect.poll(() => heading.isVisible(), { timeout: 10_000 }).toBe(true);
    await page.goBack();

    // 検証: 戻ってもキャッシュが使われ、実行回数は増えない
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/p-router`);
    await expect
      .poll(() => page.getByTestId("task-list").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("1");

    // 実行: ?force=1 付きリンクで強制再取得
    await page.getByTestId("force-reload-link").click();

    // 検証: 実行回数が 2 になる
    await expect.poll(() => page.url(), { timeout: 10_000 }).toContain("force=1");
    await expect.poll(() => runs.textContent(), { timeout: 10_000 }).toBe("2");
  });

  test("検索: 条件付きリンクで件数と空状態を表示する", async ({ expect, page }) => {
    // 準備
    await page.goto(`${BASE_URL}/search`);
    await expect
      .poll(() => page.getByTestId("search-count").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(await page.getByTestId("search-count").textContent()).toBe("全 8 件");

    // 実行: q=pera1 & status=todo のリンクを開く
    await page.getByRole("link", { name: "q=pera1 & status=todo" }).click();

    // 検証: 0 件の空状態と、現在のルート表示
    await expect
      .poll(() => page.getByTestId("search-count").textContent(), { timeout: 10_000 })
      .toBe("全 0 件");
    await expect
      .poll(() => page.getByText("条件に一致するタスクがありません。").isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/search?q=pera1&status=todo`);
    expect(await page.getByTestId("route-path").textContent()).toBe("/search?q=pera1&status=todo");
  });

  test("検索: フォーム送信で URL を replace 更新し見出しへフォーカスする", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/search?q=pera1`);
    await expect
      .poll(() => page.getByTestId("search-count").textContent(), { timeout: 10_000 })
      .toBe("全 0 件");
    const historyBefore = await page.evaluate(() => history.length);

    // 実行: キーワードを入力して検索 (replace 遷移)
    await page.locator('.toolbar input[name="q"]').fill("children");
    await page.getByRole("button", { name: "検索" }).click();

    // 検証: URL と件数・結果が更新される
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"), { timeout: 10_000 })
      .toBe("children");
    await expect
      .poll(() => page.getByTestId("search-count").textContent(), { timeout: 10_000 })
      .toBe("全 1 件");
    await expect
      .poll(() => page.getByRole("link", { name: "children 記法のテストを追加する" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    expect(await page.getByTestId("route-path").textContent()).toBe("/search?q=children");
    expect(await page.locator('.toolbar input[name="q"]').inputValue()).toBe("children");

    // 検証: replace なので履歴は増えず、条件が変わったので見出しへフォーカスが移る
    expect(await page.evaluate(() => history.length)).toBe(historyBefore);
    await expect
      .poll(
        () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null),
        { timeout: 10_000 },
      )
      .toBe("search-heading");
  });

  test("認証: 未ログインで /admin へ行くとログインへ誘導される", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/admin`);

    // 検証: redirectTo に /admin が入ったログイン画面になる
    await expect
      .poll(() => page.getByRole("heading", { name: "ログイン" }).isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/login?redirectTo=%2Fadmin`);
    expect(await page.getByTestId("redirect-to-value").textContent()).toBe("/admin");
  });

  test("認証: 一般メンバーでログインすると /admin からダッシュボードへ送られる", async ({
    expect,
    page,
  }) => {
    // 準備: ガードでログイン画面へ
    await page.goto(`${BASE_URL}/admin`);
    await expect
      .poll(() => page.getByTestId("fill-member").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: メンバーの資格情報でログイン
    await page.getByTestId("fill-member").click();
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: requireRole の forbiddenPath → ログイン済みなので / へ落ち着く
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await expect
      .poll(() => page.getByRole("heading", { name: "ダッシュボード" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("認証: 管理者でログインしロール変更とログアウトができる", async ({ expect, page }) => {
    // 準備: ガード経由でログイン画面へ
    await page.goto(`${BASE_URL}/admin`);
    await expect
      .poll(() => page.getByTestId("fill-admin").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 管理者でログイン
    await page.getByTestId("fill-admin").click();
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: 管理画面にユーザー一覧 (3 名) が表示される
    const table = page.getByTestId("admin-user-list");
    await expect.poll(() => table.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/admin`);
    await expect.poll(() => table.locator("tbody tr").count(), { timeout: 10_000 }).toBe(3);
    const memberRow = page.getByRole("row", { name: /member@example\.com/ });
    const memberRoleCell = page.getByTestId("role-cell-u-member");
    expect(await memberRoleCell.textContent()).toBe("メンバー");

    // 実行: 一般メンバーのロールを管理者へ変更
    await memberRow.locator("select").selectOption("admin");
    await memberRow.getByRole("button", { name: "変更" }).click();

    // 検証: 成功表示と、表のバッジが管理者へ更新される
    await expect
      .poll(() => page.getByTestId("admin-ok").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect.poll(() => memberRoleCell.textContent(), { timeout: 10_000 }).toBe("管理者");

    // 実行: ログアウト
    await page.getByTestId("logout-button").click();

    // 検証: ヘッダーがログインリンクに戻る
    await expect
      .poll(() => page.getByTestId("login-link").isVisible(), { timeout: 10_000 })
      .toBe(true);
    expect(await page.getByTestId("logout-button").count()).toBe(0);
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("open redirect: 外部 URL の redirectTo は / に落ちる", async ({ expect, page }) => {
    // 準備と実行: 外部 URL とプロトコル相対 URL を渡す
    await page.goto(`${BASE_URL}/login?redirectTo=https://evil.com`);

    // 検証: 検証済みの遷移先は / になる
    await expect
      .poll(() => page.getByTestId("redirect-to-value").textContent(), { timeout: 10_000 })
      .toBe("/");
    await page.goto(`${BASE_URL}/login?redirectTo=//evil.com`);
    await expect
      .poll(() => page.getByTestId("redirect-to-value").textContent(), { timeout: 10_000 })
      .toBe("/");

    // 実行: ログインする
    await page.getByTestId("fill-admin").click();
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: 外部サイトへは行かず / に留まる
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    expect(page.url()).not.toContain("evil.com");
  });

  test("特殊ルート: 省略可能パラメーター /archive", async ({ expect, page }) => {
    // 準備と実行: 年なし (全件)
    await page.goto(`${BASE_URL}/archive`);

    // 検証
    await expect
      .poll(() => page.getByTestId("archive-year").textContent(), { timeout: 10_000 })
      .toBe("すべて");
    await expect.poll(() => page.locator("main .list-item").count(), { timeout: 10_000 }).toBe(3);
    await expect
      .poll(() => page.getByRole("link", { name: "pera1 ルーター刷新" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);

    // 実行: 2026 年
    await page.goto(`${BASE_URL}/archive/2026`);

    // 検証: シードはすべて 2026 年なので 3 件のまま
    await expect
      .poll(() => page.getByTestId("archive-year").textContent(), { timeout: 10_000 })
      .toBe("2026");
    await expect.poll(() => page.locator("main .list-item").count(), { timeout: 10_000 }).toBe(3);

    // 実行: プロジェクトのない 2025 年
    await page.goto(`${BASE_URL}/archive/2025`);

    // 検証: 空状態
    await expect
      .poll(() => page.getByText("この年のプロジェクトはありません。").isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect.poll(() => page.locator("main .list-item").count(), { timeout: 10_000 }).toBe(0);
  });

  test("特殊ルート: ワイルドカード /files/*", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/files/a/b/c.txt`);

    // 検証: ワイルドカード全体と、セグメントごとのリンク先
    await expect
      .poll(() => page.getByTestId("wildcard-path").textContent(), { timeout: 10_000 })
      .toBe("a/b/c.txt");
    const segments = page.getByTestId("wildcard-segments");
    await expect.poll(() => segments.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await segments.getByRole("link", { name: "a" }).getAttribute("href")).toBe("/files/a");
    expect(await segments.getByRole("link", { name: "b" }).getAttribute("href")).toBe("/files/a/b");
    expect(await segments.getByRole("link", { name: "c.txt" }).getAttribute("href")).toBe(
      "/files/a/b/c.txt",
    );
  });

  test("特殊ルート: /projects/new は静的にマッチする", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/projects/new`);

    // 検証: プロジェクト詳細ではなく静的ページが表示される
    await expect
      .poll(() => page.getByTestId("project-new-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(
        () => page.getByRole("heading", { name: "新しいプロジェクト（静的ルート）" }).isVisible(),
        { timeout: 10_000 },
      )
      .toBe(true);
    expect(await page.getByTestId("project-header").count()).toBe(0);
    const pageText = await page.getByTestId("project-new-page").textContent();
    expect(pageText).toContain("/projects/new");
  });

  test("404: 未マッチの URL ではパスと復帰リンクを表示する", async ({ expect, page }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/does-not-exist`);

    // 検証: 見出し・リクエストパス・リンク
    await expect
      .poll(() => page.getByRole("heading", { name: "ページが見つかりません" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    expect(await page.getByTestId("not-found-path").textContent()).toBe("/does-not-exist");
    expect(
      await page.getByRole("link", { name: "ダッシュボードへ戻る" }).getAttribute("href"),
    ).toBe("/");
    expect(await page.getByRole("link", { name: "Lab を開く" }).getAttribute("href")).toBe("/lab");

    // 実行: ダッシュボードへ戻る
    await page.getByRole("link", { name: "ダッシュボードへ戻る" }).click();

    // 検証
    await expect
      .poll(() => page.getByRole("heading", { name: "ダッシュボード" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
    expect(page.url()).toBe(`${BASE_URL}/`);
  });

  test("ダッシュボード: useNavigate のオブジェクト形式でクエリーだけ差し替える", async ({
    expect,
    page,
  }) => {
    // 準備と実行
    await page.goto(`${BASE_URL}/`);
    await page.getByTestId("navigate-object").click();

    // 検証: パスはそのまま、クエリーだけが差し替わる
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/?from=quick`);
    await expect
      .poll(() => page.getByRole("heading", { name: "ダッシュボード" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("ナビ: /files 配下でも「ファイル」がアクティブになる", async ({ expect, page }) => {
    // 準備と実行: ワイルドカードの深いパスへ直接アクセスする
    await page.goto(`${BASE_URL}/files/a/b/c.txt`);

    // 検証: match プレフィックスで「ファイル」だけが aria-current を持つ
    await expect
      .poll(() => page.getByRole("link", { name: "ファイル" }).getAttribute("aria-current"), {
        timeout: 10_000,
      })
      .toBe("page");
    expect(
      await page.getByRole("link", { name: "ダッシュボード" }).getAttribute("aria-current"),
    ).toBe(null);
    expect(
      await page.getByRole("link", { name: "Lab", exact: true }).getAttribute("aria-current"),
    ).toBe(null);
  });

  test("プロジェクト新規作成ページから作成すると詳細へリダイレクトする", async ({
    expect,
    page,
  }) => {
    // 準備: 静的ルートの新規作成ページを開く
    await page.goto(`${BASE_URL}/projects/new`);
    await expect
      .poll(() => page.getByTestId("project-new-page").isVisible(), { timeout: 10_000 })
      .toBe(true);
    const form = page.getByTestId("project-new-form");
    await form.locator('input[name="name"]').fill("E2E 静的ページから作成");
    await form.locator('textarea[name="description"]').fill("project-new-page 経由の作成です。");

    // 実行: 送信先 /projects のレイアウトアクションへ POST する
    await form.getByRole("button", { name: "作成する" }).click();

    // 検証: 作成した ID の詳細へ遷移し、ヘッダーに名前と説明が出る
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/projects/p-4`);
    const header = page.getByTestId("project-header");
    await expect.poll(() => header.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await header.textContent()).toContain("E2E 静的ページから作成");
    expect(await header.textContent()).toContain("project-new-page 経由の作成です。");
  });

  test("認証: ログイン失敗でエラーメッセージが出てメール欄が保持される", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/login`);
    await expect
      .poll(() => page.getByTestId("login-form").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 誤った資格情報でログインする
    const email = "wrong@example.com";
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: エラーメッセージが出て、メール欄が保持される
    const error = page.getByTestId("login-error");
    await expect.poll(() => error.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await error.textContent()).toBe("メールアドレスまたはパスワードが正しくありません。");
    await expect
      .poll(() => page.locator('input[name="email"]').inputValue(), { timeout: 10_000 })
      .toBe(email);
    expect(page.url()).toContain("/login");
  });

  test("認証: /login?redirectTo=/login でログインすると / に落ちる", async ({
    expect,
    page,
  }) => {
    // 準備: 自分自身への redirectTo は / に正規化される (D-1 の回帰防止)
    await page.goto(`${BASE_URL}/login?redirectTo=/login`);
    await expect
      .poll(() => page.getByTestId("redirect-to-value").textContent(), { timeout: 10_000 })
      .toBe("/");
    await expect
      .poll(() => page.getByTestId("fill-admin").isVisible(), { timeout: 10_000 })
      .toBe(true);

    // 実行: 管理者でログインする
    await page.getByTestId("fill-admin").click();
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: /login に戻らず / に落ち着く
    await expect.poll(() => page.url(), { timeout: 10_000 }).toBe(`${BASE_URL}/`);
    await expect
      .poll(() => page.getByRole("heading", { name: "ダッシュボード" }).isVisible(), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("認証: 自分自身の降格はエラーになりロールは変わらない", async ({ expect, page }) => {
    // 準備: ガード経由で管理者としてログインする
    await page.goto(`${BASE_URL}/admin`);
    await expect
      .poll(() => page.getByTestId("fill-admin").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await page.getByTestId("fill-admin").click();
    await page.getByRole("button", { name: "ログインする" }).click();

    // 検証: 管理画面に遷移し、自分のロールは管理者である
    const table = page.getByTestId("admin-user-list");
    await expect.poll(() => table.isVisible(), { timeout: 10_000 }).toBe(true);
    const adminRoleCell = page.getByTestId("role-cell-u-admin");
    await expect.poll(() => adminRoleCell.textContent(), { timeout: 10_000 }).toContain("管理者");

    // 実行: 自分自身の行をメンバーへ降格しようとする
    const adminRow = page.getByRole("row", { name: /admin@example\.com/ });
    await adminRow.locator("select").selectOption("member");
    await adminRow.getByRole("button", { name: "変更" }).click();

    // 検証: 自分自身の変更は拒否され、ロール表示は管理者のままである
    const error = page.getByTestId("admin-error");
    await expect.poll(() => error.isVisible(), { timeout: 10_000 }).toBe(true);
    expect(await error.textContent()).toBe("自分自身のロールは変更できません。");
    await expect.poll(() => adminRoleCell.textContent(), { timeout: 10_000 }).toContain("管理者");
  });

  test("特殊ルート: /archive/abcd では空状態または404的表示になりクラッシュしない", async ({
    expect,
    page,
  }) => {
    // 準備: ページ側のハードエラーを監視する
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    // 実行: 4 桁でない年でアーカイブを開く ($year ローダーは例外を投げる)
    await page.goto(`${BASE_URL}/archive/abcd`);

    // 検証: 空状態・404・エラー境界のいずれかが表示され、白紙やハングにならない
    await expect
      .poll(
        async () => {
          const errorVisible = await page
            .getByTestId("error-retry")
            .isVisible()
            .catch(() => false);
          const emptyVisible = await page
            .getByText("この年のプロジェクトはありません。")
            .isVisible()
            .catch(() => false);
          const notFoundVisible = await page
            .getByRole("heading", { name: "ページが見つかりません" })
            .isVisible()
            .catch(() => false);
          const problemVisible = await page
            .getByRole("heading", { name: "問題が発生しました" })
            .isVisible()
            .catch(() => false);

          return errorVisible || emptyVisible || notFoundVisible || problemVisible;
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    // 検証: URL が壊れず同じオリジンに留まり、メインが残っている (クラッシュなし)
    expect(new URL(page.url()).origin).toBe(BASE_URL);
    expect(page.url()).toBe(`${BASE_URL}/archive/abcd`);
    await expect.poll(() => page.getByRole("main").isVisible(), { timeout: 10_000 }).toBe(true);
    expect(pageErrors).toStrictEqual([]);

    // 検証: 既知の年形式エラー・空状態・404 のいずれかの文言を含む
    const body = (await page.getByRole("main").textContent()) ?? "";
    expect(body).toMatch(
      /この年のプロジェクトはありません|ページが見つかりません|問題が発生しました|年は 4 桁/,
    );
  });

  test("プロジェクト詳細: タスク追加ボタンのダブルクリックで1件しか増えない", async ({
    expect,
    page,
  }) => {
    // 準備
    await page.goto(`${BASE_URL}/projects/p-router`);
    const form = page.getByTestId("task-create-form");
    await expect.poll(() => form.isVisible(), { timeout: 10_000 }).toBe(true);
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(3);
    await form.locator('input[name="title"]').fill("E2E ダブルクリック防止");

    // 実行: 追加ボタンをダブルクリックする
    await form.getByRole("button", { name: "追加する" }).dblclick();

    // 検証: 1 件だけ増える (二重送信にならない)
    await expect
      .poll(() => page.locator('[data-testid^="task-row-"]').count(), { timeout: 10_000 })
      .toBe(4);
    expect(await page.getByTestId("task-list").textContent()).toContain("E2E ダブルクリック防止");

    // 検証: 少し待っても 5 件に増えない (遅れて 2 件目が来ないこと)
    await page.waitForTimeout(800);
    expect(await page.locator('[data-testid^="task-row-"]').count()).toBe(4);
  });
});
