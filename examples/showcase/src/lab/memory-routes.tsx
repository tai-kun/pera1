import { redirect } from "@pera1/core";
import type { ActionFunctionArgs, ShouldReloadFunctionArgs } from "@pera1/core";
import type { ActionData, RouteDefinitionObject, RouterRouteDefinition } from "@pera1/react";
import {
  Outlet,
  useActionData,
  useLoaderData,
  useNavigate,
  useRoutePath,
  useScrollRestoration,
  useSubmit,
} from "@pera1/react";
import * as React from "react";

import { bumpLoaderRun } from "../api/metrics.js";

/**
 * フォームルートの定義です。`RouteDefinitionObject` 型の実演として注釈します。
 */
const memoryFormRoute = {
  path: "form",
  component: MemoryForm,
  action: memoryFormAction,
} satisfies RouteDefinitionObject;

/**
 * メモリーエンジン用のデモアプリのルート定義です。
 *
 * この Router は `<Router engine={memoryEngine}>` で描画されるため、
 * 画面内の `<a>` リンクはブラウザーの Navigation API (外側の BrowserRouter) に
 * 横取りされます。メモリーエンジン自身の履歴を動かすには `useNavigate` や
 * `useSubmit` を使います。この違い自体が Lab の教材です。
 */
export const MEMORY_ROUTES: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    component: MemoryLayout,
    loader: memoryShellLoader,
    children: [
      {
        index: true,
        component: MemoryHome,
        loader: memoryHomeLoader,
        shouldReload: memoryHomeShouldReload,
      },
      {
        path: "about",
        component: MemoryAbout,
      },
      memoryFormRoute,
      {
        path: "guard",
        component: MemoryGuard,
        loader: memoryGuardLoader,
      },
      {
        path: "slow",
        component: MemorySlow,
        loader: memorySlowLoader,
      },
    ],
  },
];

/**
 * 疑似 API の遅延です。メモリーエンジンでも Suspense が働くことを観察できます。
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function memoryShellLoader() {
  await sleep(120);

  return { app: "メモリールーター", loadedAt: new Date().toISOString() };
}

async function memoryHomeLoader() {
  const runCount = bumpLoaderRun("memory-home");
  await sleep(300);

  return { runCount, message: "ホームのローダーが完了しました。" };
}

/**
 * メモリーエンジン版の `shouldReload` です。
 *
 * クエリーの `force=1` を付けた遷移では必ず再取得します。
 */
function memoryHomeShouldReload({
  currentUrl,
  defaultShouldReload,
}: ShouldReloadFunctionArgs): boolean {
  return currentUrl.searchParams.get("force") === "1" ? true : defaultShouldReload;
}

async function memoryGuardLoader() {
  await sleep(150);

  // ローダーのリダイレクトはエンジンが検知して自動遷移します。
  return redirect("/about");
}

async function memorySlowLoader() {
  await sleep(900);

  return { finishedAt: new Date().toISOString() };
}

async function memoryFormAction({ request }: ActionFunctionArgs) {
  const message = String(request.formData.get("message") ?? "").trim();
  if (message === "") {
    return { error: "メッセージを入力してください。" };
  }

  await sleep(250);

  return { message, receivedAt: new Date().toISOString() };
}

/**
 * メモリーエンジン側の共通レイアウトです。
 * `useScrollRestoration` はネストした RouterContext を購読して動作します。
 */
function MemoryLayout() {
  const data = React.use(useLoaderData<typeof memoryShellLoader>());
  useScrollRestoration(true);
  const path = useRoutePath();

  return (
    <div className="memory-shell" data-testid="memory-shell">
      <div className="memory-toolbar">
        <span className="badge badge-info">{data.app}</span>
        <code data-testid="memory-current-path">{path.toString()}</code>
      </div>
      <MemoryNav />
      <React.Suspense fallback={<p className="memory-loading">メモリーエンジンが読み込み中…</p>}>
        <Outlet />
      </React.Suspense>
    </div>
  );
}

/**
 * メモリーエンジンの履歴を動かすナビゲーションです。
 */
function MemoryNav() {
  const navigate = useNavigate();

  return (
    <nav className="memory-nav" aria-label="メモリーエンジンのナビゲーション">
      <button type="button" onClick={() => navigate("/")}>
        ホーム
      </button>
      <button type="button" onClick={() => navigate("/about")}>
        About
      </button>
      <button type="button" onClick={() => navigate("/form")}>
        フォーム
      </button>
      <button type="button" onClick={() => navigate("/slow")}>
        遅いページ
      </button>
      <button type="button" onClick={() => navigate("/guard")}>
        ガード (リダイレクト)
      </button>
    </nav>
  );
}

function MemoryHome() {
  const data = React.use(useLoaderData<typeof memoryHomeLoader>());

  return (
    <section className="memory-page">
      <h3>メモリールーター ホーム</h3>
      <p>{data.message}</p>
      <p>
        ローダー実行回数: <strong data-testid="memory-home-runs">{data.runCount}</strong>
      </p>
    </section>
  );
}

function MemoryAbout() {
  return (
    <section className="memory-page">
      <h3>About</h3>
      <p>
        Navigation API を使わず、`IEngine` の契約だけで履歴とデータを管理しています。
        ローダーのリダイレクトは「ガード」から試せます。
      </p>
    </section>
  );
}

function MemoryGuard() {
  // このコンポーネントはリダイレクトにより描画されません。
  return <p>ガードを通過しました。</p>;
}

function MemorySlow() {
  const data = React.use(useLoaderData<typeof memorySlowLoader>());

  return (
    <section className="memory-page">
      <h3>遅いページ</h3>
      <p>900ms 待ってから描画しました（完了: {data.finishedAt}）。</p>
    </section>
  );
}

function MemoryForm() {
  const actionData = useActionData<typeof memoryFormAction>();
  const submit = useSubmit();

  return (
    <section className="memory-page">
      <h3>プログラム送信のフォーム</h3>
      <p className="muted">
        メモリーエンジンでは素の form 送信も外側の Navigation API に届くため、 `useSubmit`
        からメモリーエンジンへ送信します。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget), { action: "/form" });
        }}
      >
        <label>
          メッセージ
          <input name="message" placeholder="こんにちは" />
        </label>
        <button type="submit">送信</button>
      </form>
      {actionData ? <MemoryActionData actionData={actionData} /> : null}
    </section>
  );
}

function MemoryActionData({ actionData }: { actionData: ActionData<typeof memoryFormAction> }) {
  const data = React.use(actionData);

  if (data && "error" in data) {
    return <p role="alert">{data.error}</p>;
  }
  if (data) {
    return (
      <p className="memory-result" data-testid="memory-form-result">
        送信済み: {data.message}
      </p>
    );
  }

  return null;
}
