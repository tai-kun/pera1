import { toNavigateArgs } from "@pera1/core";
import type { NavigateOptions, NavigateTo } from "@pera1/core";
import { Router } from "@pera1/react";
import type { RouterRouteDefinition } from "@pera1/react";
import * as React from "react";

import { CodeBlock } from "../../components/code-block.js";
import AppErrorBoundary from "../../components/error-boundary.js";
import { safeStringify } from "../../components/inspector.js";
import { memoryEngine } from "../../lab/memory-engine.js";
import { MEMORY_ROUTES } from "../../lab/memory-routes.js";

/**
 * ルートコンポーネントを `Suspense` で包むラッパーを作ります。
 *
 * なぜ必要か: `MemoryLayout` は自分自身のローダー (`memoryShellLoader`) を
 * レンダリングの先頭で `React.use` するため、そのサスペンドを捕まえられる境界は
 * 「レイアウトの外側」にしか置けません。境界が `Router` の外側にあると、React は
 * まだコミットしていない `Router` ごと再試行で作り直し、`createRouter` が毎回
 * `init` をやり直してローダーが永遠に解決しません。
 *
 * そこで境界を `Router` が描画するコンポーネントの直上 (Router の出力の内側) に
 * 置きます。こうすると `Router` はフォールバック付きでコミットされ、再試行では
 * 解決済みの `NinjaPromise` がストアから読めるため、ミニアプリが表示されます。
 */
function withSuspense(Component: React.ComponentType<{}>): React.ComponentType<{}> {
  function SuspenseBoundary() {
    return (
      <React.Suspense
        fallback={
          <p className="memory-loading" data-testid="memory-loading">
            メモリーエンジンを読み込み中…
          </p>
        }
      >
        <Component />
      </React.Suspense>
    );
  }

  return SuspenseBoundary;
}

/**
 * `MEMORY_ROUTES` の各コンポーネントを `withSuspense` で包んだ派生ルートです。
 */
function wrapRoutes(routes: readonly RouterRouteDefinition[]): readonly RouterRouteDefinition[] {
  return routes.map((route) => ({
    ...route,
    component: route.component ? withSuspense(route.component) : undefined,
    children: route.children ? wrapRoutes(route.children) : undefined,
  }));
}

const MEMORY_ROUTES_WITH_BOUNDARY = wrapRoutes(MEMORY_ROUTES);

const ENGINE_CODE = `interface IEngine<TComponent = any> {
  init(args: IEngine.InitArgs<TComponent>): IEngine.InitReturn<TComponent>;
  start(args: IEngine.StartArgs<TComponent>): IEngine.StartReturn;
  submit(args: IEngine.SubmitArgs): void;
  navigate(args: IEngine.NavigateArgs): void;
}

// MemoryEngine が内部で組み合わせている公開 API:
//   matchRoutes         -> URL をルートへ照合する
//   initLoaders         -> 初回表示のローダー起動
//   startLoaders        -> 遷移時の再取得判定 (キャッシュ再利用)
//   startAction         -> FORM_DATA 送信時のアクション起動
//   expectHistoryEntry  -> 履歴エントリーの検証
//   toNavigateArgs      -> useNavigate 相当の入力正規化
//   toSubmitArgs        -> useSubmit 相当の入力正規化

// 重要: メモリーエンジンの画面内では <a href="/..."> を置いても、
// 外側の BrowserRouter (Navigation API) にクリックを横取りされます。
// メモリーエンジン自身の履歴を動かすには useNavigate / useSubmit を使います。`;

/**
 * メモリーエンジンを直接操作するパネルです。
 *
 * このパネル自体はメイン Router 配下で動いているため、状態は `memoryEngine` を
 * 直接参照し、操作のたびに `useReducer` の bump で再描画して追従させます。
 * `memoryEngine` (MemoryEngine) に `subscribe` はないため、常駐ポーリング
 * (`setInterval`) ではなく操作後の再描画と `visibilitychange` での再描画にします。
 */
function EnginePanel() {
  const [, bump] = React.useReducer((count: number) => count + 1, 0);
  const [lastArgs, setLastArgs] = React.useState<string>("（まだ操作していません）");

  // 操作後に予約した遅延再描画のタイマーです (アンマウント時に破棄します)。
  const pendingTimers = React.useRef<number[]>([]);
  React.useEffect(() => {
    const timers = pendingTimers.current;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        bump();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      timers.length = 0;
    };
  }, []);

  // 操作直後の再描画に加え、非同期に確定する遷移 (ローダーのリダイレクトなど) を
  // 拾うため、操作を起点とする一度きりの遅延再描画を予約します。
  // 常駐の `setInterval` と違い、操作がなければタイマーは残りません。
  function bumpSoon() {
    bump();
    pendingTimers.current.push(window.setTimeout(bump, 350));
    pendingTimers.current.push(window.setTimeout(bump, 1000));
  }

  function go(to: NavigateTo | number, options?: NavigateOptions) {
    // `toNavigateArgs` の実演: フックと同じ入力がどう正規化されるかを表示します。
    setLastArgs(safeStringify(toNavigateArgs(to, options)));
    memoryEngine.go(to, options);
    bumpSoon();
  }

  const entries = memoryEngine.getEntries();
  const url = memoryEngine.currentEntry.url.href;

  return (
    <section className="card lab-section" data-testid="engine-panel">
      <h2 className="card-title" id="engine-operation">
        操作パネル
      </h2>
      <p className="muted">
        ボタンは `memoryEngine` の `go` / `send` を直接呼びます。
        下のミニアプリはメモリーエンジンの履歴で動き、メインアプリの URL は変わりません。
      </p>
      <div className="lab-actions">
        <button type="button" className="button" onClick={() => go("/")} data-testid="engine-home">
          ホーム
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go("/about")}
          data-testid="engine-about"
        >
          About
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go("/form")}
          data-testid="engine-form"
        >
          フォーム
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go("/slow")}
          data-testid="engine-slow"
        >
          遅いページ
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go("/guard")}
          data-testid="engine-guard"
        >
          ガード (リダイレクト)
        </button>
        <button type="button" className="button" onClick={() => go(-1)} data-testid="engine-back">
          戻る
        </button>
        <button type="button" className="button" onClick={() => go(1)} data-testid="engine-forward">
          進む
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => {
            // `send` は内部で `toSubmitArgs` を通して GET 遷移に変換します。
            memoryEngine.send(new URLSearchParams({ force: "1" }));
            bumpSoon();
          }}
          data-testid="engine-force"
        >
          ?force=1 を送る
        </button>
      </div>
      <dl className="kv-table">
        <div>
          <dt>currentEntry.url.href</dt>
          <dd data-testid="engine-url">{url}</dd>
        </div>
      </dl>
      <div>
        <p className="lab-result-label">履歴エントリー (メモリー上)</p>
        <ol className="memory-entries" data-testid="engine-entries">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={entry.current ? "memory-entry is-current" : "memory-entry"}
            >
              <span>#{entry.index}</span>
              {entry.current ? <span className="lab-badge">現在</span> : null}
              <code>{entry.href}</code>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="lab-result-label">最後の NavigateArgs (toNavigateArgs の結果)</p>
        <pre className="lab-output" data-testid="engine-last-args">
          {lastArgs}
        </pre>
      </div>
    </section>
  );
}

/**
 * 自作エンジン (メモリーエンジン) の実験ページです。
 */
export default function LabEnginePage() {
  return (
    <div className="lab-page">
      <nav aria-label="このページの目次" className="lab-actions">
        <a href="#engine-operation">操作パネル</a>
        <a href="#engine-mini-app">メモリーエンジンのミニアプリ</a>
        <a href="#engine-how-it-works">仕組み</a>
      </nav>
      <EnginePanel />
      <section className="card lab-section" data-testid="engine-app">
        <h2 className="card-title" id="engine-mini-app">
          メモリーエンジンのミニアプリ
        </h2>
        <p className="muted">
          {"`<Router engine={memoryEngine} routes={MEMORY_ROUTES}>` は、Navigation API を"}
          一切使わず `IEngine` の契約だけで動いています。`useScrollRestoration` も この
          RouterContext を購読しています。
        </p>
        <AppErrorBoundary
          fallback={(error, reset) => (
            <div className="error-card">
              <p className="error-name">{error instanceof Error ? error.name : typeof error}</p>
              <p className="error-message">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <button type="button" className="button" onClick={reset}>
                リセット
              </button>
            </div>
          )}
        >
          <React.Suspense
            fallback={<p className="memory-loading">メモリーエンジンを読み込み中…</p>}
          >
            <Router engine={memoryEngine} routes={MEMORY_ROUTES_WITH_BOUNDARY} />
          </React.Suspense>
        </AppErrorBoundary>
      </section>
      <section className="card lab-section">
        <h2 className="card-title" id="engine-how-it-works">
          仕組み
        </h2>
        <p className="muted">
          `init` / `start` / `submit` / `navigate` の 4 メソッドが `IEngine` の契約です。
          メモリーエンジンは履歴を配列で持ち、ブラウザーの履歴には一切触れません。
        </p>
        <CodeBlock title="IEngine と組み合わせ" code={ENGINE_CODE} />
      </section>
    </div>
  );
}
