import {
  ErrorBase,
  expectHistoryEntry,
  LoaderConditionError,
  LoaderDataNotFoundError,
  NavigationApiNotSupportedError,
  RouteContextMissingError,
  RouterContextMissingError,
  setErrorMessage,
  UnexpectedValidationError,
  UnreachableError,
  ValidationErrorBase,
} from "@pera1/core";
import type { ShouldReloadFunction } from "@pera1/core";
import { Outlet, Router, useActionData, useLoaderData, useSubmit } from "@pera1/react";
import type { ActionData, RouterRouteDefinition } from "@pera1/react";
import * as React from "react";
import * as v from "valibot";

import { CodeBlock } from "../../components/code-block.js";
import AppErrorBoundary from "../../components/error-boundary.js";
import { safeStringify } from "../../components/inspector.js";
import { MemoryEngine } from "../../lab/memory-engine.js";

/**
 * 表示用にエラーを正規化します。
 */
type ErrorView = {
  readonly name: string;
  readonly message: string;
  readonly issuesLength: number | null;
  readonly isValidationError: boolean;
  readonly isErrorBase: boolean;
};

function describeError(error: unknown): ErrorView {
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    issuesLength: error instanceof UnexpectedValidationError ? error.meta.issues.length : null,
    isValidationError: error instanceof ValidationErrorBase,
    isErrorBase: error instanceof ErrorBase,
  };
}

/**
 * `LoaderConditionError.meta.returnValue` を表示用の文字列にします。
 *
 * `shouldReload` が誤って返してしまった Promise / NinjaPromise は
 * `JSON.stringify` では `{}` になって種別が分からないため、thenable であることを
 * 明示します (NinjaPromise はネイティブの `Promise` ではないため instanceof では
 * 判定できません)。
 */
function describeReturnValue(value: unknown): string {
  if (value instanceof Promise) {
    return "[object Promise] (shouldReload が同期的に返すべきではない thenable)";
  }
  if (typeof (value as { then?: unknown } | null)?.then === "function") {
    return "PromiseLike (shouldReload が同期的に返すべきではない thenable)";
  }

  return safeStringify(value);
}

const BOUNDARY_CODE = `<AppErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>{error instanceof Error ? error.name : "エラー"}</p>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button onClick={reset}>もう一度試す</button>
    </div>
  )}
>
  <CrashOnClick />
</AppErrorBoundary>`;

const LOADER_DATA_CODE = `const routes = [
  // loader を書かない (ローダーなしの階層)
  { path: "/", component: Child },
];

function Child() {
  // RouteContext の loader は undefined のままなので
  // LoaderDataNotFoundError が投げられる
  const data = useLoaderData();
  return <p>{data}</p>;
}`;

const LOADER_CONDITION_CODE = `// shouldReload は「同期的に真偽値」を返す契約です。
// Promise を返すと startLoaders が LoaderConditionError に変換します。
const badShouldReload = (() => Promise.resolve(true));

const routes = [{
  path: "/",
  component: Shell,
  loader: conditionLoader,
  shouldReload: badShouldReload, // 契約違反
  children: [
    { path: "a", component: PageA },
    { path: "b", component: PageB },
  ],
}];

// "/a" でローダーをキャッシュ -> "/b" へ遷移すると再利用判定が走る
engine.go("/a");
engine.go("/b");
engine.go(-1);`;

const VALIDATION_CODE = `try {
  expectHistoryEntry({ id: crypto.randomUUID(), url: "not a url", index: 0 });
} catch (error) {
  if (error instanceof ValidationErrorBase) {
    // meta.issues に valibot の問題点が入る
    console.error(error.meta.issues.length);
  }
}`;

const UNREACHABLE_CODE = `// actual に値がある場合
new UnreachableError({ actual: ["想定外の値" as never] });
// -> "不可能な値に遭遇しました: ..."

// actual が空の場合
new UnreachableError({ actual: [] });
// -> "到達できないコードに到達しました"`;

const CONTEXT_MISSING_CODE = `const routerContext = React.use(RouterContext);
if (!routerContext) {
  // コンテキスト直読みは null チェックが呼び出し側の責任です。
  return <p>Router の外で読み取りました。</p>;
}

// フック版は null チェックが不要な代わりに、未供給なら
// RouterContextMissingError を投げます。
const path = useRoutePath();`;

const NAV_API_CODE = `if (!("navigation" in window)) {
  // BrowserRouter の初期化時に NavigationApiEngine が投げます
  new NavigationApiEngine(); // -> NavigationApiNotSupportedError
}

// 非対応環境では自作エンジンへ差し替えられます (/lab/engine を参照)。
<Router engine={new MemoryEngine("/")} routes={routes} />`;

const SET_MESSAGE_CODE = `const defaultMessage = new UnreachableError({ actual: [] }).message;

setErrorMessage(UnreachableError, "実験室の独自メッセージです。", "ja");
new UnreachableError({ actual: [] }).message;
// -> "実験室の独自メッセージです。"

// 既定に戻す
setErrorMessage(UnreachableError, defaultMessage, "ja");`;

/**
 * ボタンを押すと描画中に例外を投げる子コンポーネントです。
 * (イベントハンドラーの例外はバウンダリーに届かないため、描画で投げます。)
 */
function CrashChild() {
  const [crashed, setCrashed] = React.useState(false);
  if (crashed) {
    throw new Error("実験用の例外です。");
  }

  return (
    <button
      type="button"
      className="button button-danger"
      onClick={() => setCrashed(true)}
      data-testid="boundary-throw"
    >
      例外を投げる
    </button>
  );
}

/**
 * AppErrorBoundary の基本動作を確認します。
 */
function BoundaryDemo() {
  return (
    <section className="card lab-section" data-testid="boundary-demo">
      <h2 className="card-title" id="errors-boundary">
        エラーバウンダリー
      </h2>
      <p className="muted">
        子の描画中に例外が起きると `fallback` が描画され、`reset` で復帰できます。
      </p>
      <AppErrorBoundary
        fallback={(error, reset) => (
          <div className="error-card" data-testid="boundary-fallback">
            <p className="error-name" data-testid="boundary-error-name">
              {describeError(error).name}
            </p>
            <p className="error-message" data-testid="boundary-error-message">
              {describeError(error).message}
            </p>
            <button type="button" className="button" onClick={reset}>
              もう一度試す
            </button>
          </div>
        )}
      >
        <CrashChild />
      </AppErrorBoundary>
      <CodeBlock title="AppErrorBoundary" code={BOUNDARY_CODE} />
    </section>
  );
}

function MissingLoaderChild() {
  // loader が undefined なので、この時点で LoaderDataNotFoundError が投げられます。
  const data = React.use(useLoaderData());
  return <pre className="lab-output">{safeStringify(data)}</pre>;
}

const MISSING_LOADER_ROUTES: readonly RouterRouteDefinition[] = [
  { path: "/", component: MissingLoaderChild },
];

function missingLoaderFallback(error: unknown, reset: () => void) {
  const info = describeError(error);

  return (
    <div className="error-card" data-testid="loader-data-not-found-fallback">
      <p className="error-name" data-testid="loader-data-not-found-name">
        {info.name}
      </p>
      <p className="error-message" data-testid="loader-data-not-found-message">
        {info.message}
      </p>
      <p className="lab-note">
        meta.loader: {error instanceof LoaderDataNotFoundError ? String(error.meta.loader) : "—"}
        （ローダーを持たない階層では `undefined` になります）
      </p>
      <button type="button" className="button" onClick={reset}>
        リセット
      </button>
    </div>
  );
}

/**
 * ローダーのないルート階層で useLoaderData を呼び、バウンダリーで捕捉します。
 */
function LoaderDataNotFoundDemo() {
  const [engine] = React.useState(() => new MemoryEngine("/"));

  return (
    <section className="card lab-section" data-testid="loader-data-not-found">
      <h2 className="card-title" id="errors-loader-data-not-found">
        LoaderDataNotFoundError
      </h2>
      <p className="muted">
        ローダーを定義していないルートの階層では、`RouteContext` の `loader` が `undefined`
        のままです。その状態で `useLoaderData()` を呼ぶと `LoaderDataNotFoundError` が投げられます。
      </p>
      <AppErrorBoundary fallback={missingLoaderFallback}>
        <React.Suspense fallback={<p className="memory-loading">ミニアプリを読み込み中…</p>}>
          <Router engine={engine} routes={MISSING_LOADER_ROUTES} />
        </React.Suspense>
      </AppErrorBoundary>
      <CodeBlock title="ローダーなし階層" code={LOADER_DATA_CODE} />
    </section>
  );
}

const CONDITION_SLEEP_MS = 60;

async function conditionLoader() {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, CONDITION_SLEEP_MS);
  });

  return { label: "キャッシュ判定用ローダー", loadedAt: new Date().toISOString() };
}

/**
 * 同期真偽値の契約に反し、Promise を返してしまう `shouldReload` です。
 */
const badShouldReload = (() => Promise.resolve(true)) as unknown as ShouldReloadFunction;

function ConditionShell() {
  return <Outlet />;
}

function ConditionPageA() {
  const data = React.use(useLoaderData<typeof conditionLoader>());

  return <p>ローダー完了: {data.label}</p>;
}

function ConditionPageB() {
  return <p>ページ B — ここではローダーを読まないため、判定エラーは表面化しません。</p>;
}

const CONDITION_ROUTES: readonly RouterRouteDefinition[] = [
  {
    path: "/",
    component: ConditionShell,
    loader: conditionLoader,
    shouldReload: badShouldReload,
    children: [
      { path: "a", component: ConditionPageA },
      { path: "b", component: ConditionPageB },
    ],
  },
];

function conditionFallback(error: unknown, reset: () => void) {
  const info = describeError(error);

  return (
    <div className="error-card" data-testid="loader-condition-fallback">
      <p className="error-name" data-testid="loader-condition-name">
        {info.name}
      </p>
      <p className="error-message" data-testid="loader-condition-message">
        {info.message}
      </p>
      <p className="lab-output" data-testid="loader-condition-return-value">
        meta.returnValue:{" "}
        {error instanceof LoaderConditionError ? describeReturnValue(error.meta.returnValue) : "—"}
      </p>
      <button type="button" className="button" onClick={reset}>
        リセット
      </button>
    </div>
  );
}

/**
 * `shouldReload` が Promise を返す契約違反を再現します。
 */
function LoaderConditionDemo() {
  const [engine] = React.useState(() => new MemoryEngine("/"));

  function go(to: string | number) {
    engine.go(to);
  }

  function runSequence() {
    go("/a");
    go("/b");
    go(-1);
  }

  return (
    <section className="card lab-section" data-testid="loader-condition">
      <h2 className="card-title" id="errors-loader-condition">
        LoaderConditionError — shouldReload の契約違反
      </h2>
      <p className="muted">
        `shouldReload` は同期的に真偽値を返す契約です。`/a` と `/b` を包むレイアウト ルートの
        `shouldReload` をわざと Promise を返すように壊してあります。
        ローダーのキャッシュがある状態で遷移すると、再利用の判定時に `LoaderConditionError`
        になります。
      </p>
      <div className="lab-actions">
        <button
          type="button"
          className="button"
          onClick={() => go("/a")}
          data-testid="loader-condition-a"
        >
          /a へ
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go("/b")}
          data-testid="loader-condition-b"
        >
          /b へ
        </button>
        <button
          type="button"
          className="button"
          onClick={() => go(-1)}
          data-testid="loader-condition-back"
        >
          戻る
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={runSequence}
          data-testid="loader-condition-run"
        >
          /a → /b → 戻る を実行
        </button>
      </div>
      <AppErrorBoundary fallback={conditionFallback}>
        <React.Suspense fallback={<p className="memory-loading">ミニアプリを読み込み中…</p>}>
          <Router engine={engine} routes={CONDITION_ROUTES} />
        </React.Suspense>
      </AppErrorBoundary>
      <CodeBlock title="不正な shouldReload" code={LOADER_CONDITION_CODE} />
    </section>
  );
}

const ACTION_ERROR_CODE = `async function crashAction() {
  throw new Error("アクションで想定外の障害が発生しました。");
}

const routes = [{ path: "/", component: CrashForm, action: crashAction }];

// 送信するとアクションが拒否され、useActionData を React.use した場所から
// エラーバウンダリーへ届きます。URL は元のまま変わりません。`;

/**
 * 想定外の障害として例外を投げるアクションです。
 *
 * `guides/mutations.mdx` と `guides/error-handling.mdx` の「ユーザーでは直せない問題は
 * 例外として投げる」「アクションの例外は元 URL に留まりエラーバウンダリーへ届く」という
 * 説明を、そのまま動かして確かめます。
 */
async function crashAction() {
  throw new Error("アクションで想定外の障害が発生しました。");
}

const ACTION_ERROR_ROUTES: readonly RouterRouteDefinition[] = [
  { path: "/", component: ActionErrorForm, action: crashAction },
];

/**
 * 例外を投げるアクションを送信するフォームです。
 */
function ActionErrorForm() {
  const actionData = useActionData<typeof crashAction>();
  const submit = useSubmit();

  return (
    <section className="memory-page">
      <h3>アクションの例外</h3>
      <p className="muted">
        送信ボタンで `action` を実行します。`action` は必ず例外を投げるため、 拒否された
        `useActionData` が外側の `AppErrorBoundary` に受け止められます。
      </p>
      <button
        type="button"
        className="button button-danger"
        data-testid="action-error-submit"
        onClick={() => submit(new FormData(), { action: "/" })}
      >
        アクションを実行する
      </button>
      {actionData ? <ActionErrorData actionData={actionData} /> : null}
    </section>
  );
}

/**
 * 拒否されたアクションデータを `React.use` する子コンポーネントです。
 */
function ActionErrorData({ actionData }: { readonly actionData: ActionData<typeof crashAction> }) {
  // ここでの拒否がエラーバウンダリーへ伝わります。
  const data = React.use(actionData);

  return <p>{String(data)}</p>;
}

/**
 * アクション例外デモ用のミニアプリです。
 *
 * `key` で作り直すと `MemoryEngine` も新しくなり、拒否済みのアクションデータが
 * 残らない状態から再試行できます。
 */
function ActionErrorApp() {
  const [engine] = React.useState(() => new MemoryEngine("/"));

  return (
    <React.Suspense fallback={<p className="memory-loading">ミニアプリを読み込み中…</p>}>
      <Router engine={engine} routes={ACTION_ERROR_ROUTES} />
    </React.Suspense>
  );
}

/**
 * メモリーエンジン上でアクションの例外とバウンダリーの連携を実演します。
 */
function ActionErrorDemo() {
  const [attempt, setAttempt] = React.useState(0);

  return (
    <section className="card lab-section" data-testid="action-error">
      <h2 className="card-title" id="errors-action-error">
        アクションの例外 — 元 URL に留まりバウンダリーへ
      </h2>
      <p className="muted">
        `action` が例外を投げると、遷移は確定せず元の URL に留まります。拒否された `useActionData`
        を `React.use` しているコンポーネントから、外側の `AppErrorBoundary` へ届きます。
      </p>
      <AppErrorBoundary
        key={attempt}
        fallback={(error, reset) => (
          <div className="error-card" data-testid="action-error-fallback">
            <p className="error-name" data-testid="action-error-name">
              {describeError(error).name}
            </p>
            <p className="error-message" data-testid="action-error-message">
              {describeError(error).message}
            </p>
            <button
              type="button"
              className="button"
              onClick={() => {
                reset();
                // 拒否済みのデータはストアに残るため、ミニアプリごと作り直します。
                setAttempt((count) => count + 1);
              }}
            >
              もう一度試す
            </button>
          </div>
        )}
      >
        <ActionErrorApp key={attempt} />
      </AppErrorBoundary>
      <CodeBlock title="例外を投げるアクション" code={ACTION_ERROR_CODE} />
    </section>
  );
}

/**
 * expectHistoryEntry の検証失敗をバウンダリーではなく try/catch で扱います。
 */
function UnexpectedValidationDemo() {
  const [view, setView] = React.useState<ErrorView | null>(null);

  function run() {
    try {
      expectHistoryEntry({ id: crypto.randomUUID(), url: "not a url", index: 0 });
      setView(null);
    } catch (error) {
      setView(describeError(error));
    }
  }

  return (
    <section className="card lab-section" data-testid="unexpected-validation">
      <h2 className="card-title" id="errors-unexpected-validation">
        UnexpectedValidationError
      </h2>
      <p className="muted">
        `expectHistoryEntry` は形式が不正な入力に `UnexpectedValidationError` を
        投げます。`ValidationErrorBase` と `ErrorBase` の両方を継承しています。
      </p>
      <div className="lab-actions">
        <button
          type="button"
          className="button"
          onClick={run}
          data-testid="unexpected-validation-run"
        >
          不正な URL で検証する
        </button>
      </div>
      {view ? (
        <dl className="kv-table" data-testid="unexpected-validation-result">
          <div>
            <dt>name</dt>
            <dd>{view.name}</dd>
          </div>
          <div>
            <dt>message</dt>
            <dd>{view.message}</dd>
          </div>
          <div>
            <dt>meta.issues.length</dt>
            <dd>{view.issuesLength ?? "—"}</dd>
          </div>
          <div>
            <dt>instanceof ValidationErrorBase</dt>
            <dd>{String(view.isValidationError)}</dd>
          </div>
          <div>
            <dt>instanceof ErrorBase</dt>
            <dd>{String(view.isErrorBase)}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">まだ実行していません。</p>
      )}
      <CodeBlock title="try/catch" code={VALIDATION_CODE} />
    </section>
  );
}

/**
 * UnreachableError の 2 パターンのメッセージを確認します。
 */
function UnreachableDemo() {
  const [views, setViews] = React.useState<{ withValue: ErrorView; empty: ErrorView } | null>(null);

  function run() {
    setViews({
      withValue: describeError(new UnreachableError({ actual: ["想定外の値" as never] })),
      empty: describeError(new UnreachableError({ actual: [] })),
    });
  }

  return (
    <section className="card lab-section" data-testid="unreachable">
      <h2 className="card-title" id="errors-unreachable">
        UnreachableError
      </h2>
      <p className="muted">
        網羅性チェックをすり抜けた値を記録するためのエラーです。 `actual`
        が空かどうかでメッセージが変わります。
      </p>
      <div className="lab-actions">
        <button type="button" className="button" onClick={run} data-testid="unreachable-run">
          2 パターン生成する
        </button>
      </div>
      {views ? (
        <dl className="kv-table" data-testid="unreachable-result">
          <div>
            <dt>actual: [&quot;想定外の値&quot;]</dt>
            <dd>
              {views.withValue.name} / {views.withValue.message}
            </dd>
          </div>
          <div>
            <dt>actual: []</dt>
            <dd>
              {views.empty.name} / {views.empty.message}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="muted">まだ生成していません。</p>
      )}
      <CodeBlock title="UnreachableError" code={UNREACHABLE_CODE} />
    </section>
  );
}

/**
 * コンテキスト未供給エラーの通知内容を確認します。
 */
function ContextMissingDemo() {
  const routerMissing = new RouterContextMissingError();
  const routeMissing = new RouteContextMissingError();

  return (
    <section className="card lab-section" data-testid="context-missing">
      <h2 className="card-title" id="errors-context-missing">
        RouterContextMissingError / RouteContextMissingError
      </h2>
      <p className="muted">
        メインアプリでは常に `Router` 配下でフックを呼ぶため、 `RouterContextMissingError` /
        `RouteContextMissingError` は実発火しません。 このセクションはインスタンスの `name` /
        `message` を確認するもので、 実際に投げられるのは `Router` の外でフックを呼んだときです。
        あわせて `React.use(RouterContext)` が `null` を返す場合の扱いを確認します。
      </p>
      <dl className="kv-table">
        <div>
          <dt>RouterContextMissingError</dt>
          <dd>
            {routerMissing.name} / {routerMissing.message}
          </dd>
        </div>
        <div>
          <dt>RouteContextMissingError</dt>
          <dd>
            {routeMissing.name} / {routeMissing.message}
          </dd>
        </div>
      </dl>
      <CodeBlock title="Router の外での読み取り" code={CONTEXT_MISSING_CODE} />
    </section>
  );
}

/**
 * Navigation API 非対応環境のエラーを確認します。
 */
function NavApiErrorDemo() {
  const error = new NavigationApiNotSupportedError();

  return (
    <section className="card lab-section" data-testid="nav-api-error">
      <h2 className="card-title" id="errors-nav-api">
        NavigationApiNotSupportedError
      </h2>
      <p className="muted">
        メインアプリは Navigation API に対応したブラウザーで動かす前提のため、
        `NavigationApiNotSupportedError` は実発火しません。ここではインスタンスの `name` / `message`
        を確認します。未対応環境では `BrowserRouter` が内部で生成する `NavigationApiEngine`
        の初期化時に投げられます。 実際の対応チェックは「限界」ページで試せます。
      </p>
      <dl className="kv-table">
        <div>
          <dt>name</dt>
          <dd>{error.name}</dd>
        </div>
        <div>
          <dt>message</dt>
          <dd>{error.message}</dd>
        </div>
      </dl>
      <p>
        <a href="/lab/limits">→ 限界ページの対応チェックへ</a>
      </p>
      <CodeBlock title="NavigationApiNotSupportedError" code={NAV_API_CODE} />
    </section>
  );
}

/**
 * setErrorMessage の差し替えと復元を試します。
 */
function SetErrorMessageDemo() {
  const defaultMessageRef = React.useRef<string | null>(null);
  if (defaultMessageRef.current === null) {
    // オーバーライド前に既定メッセージを控えておきます。
    defaultMessageRef.current = new UnreachableError({ actual: [] }).message;
  }

  const [message, setMessage] = React.useState<string | null>(null);

  function override() {
    setErrorMessage(UnreachableError, "実験室の独自メッセージです。", "ja");
    setMessage(new UnreachableError({ actual: [] }).message);
  }

  function restore() {
    const fallback = defaultMessageRef.current;
    if (fallback !== null) {
      setErrorMessage(UnreachableError, fallback, "ja");
      setMessage(new UnreachableError({ actual: [] }).message);
    }
  }

  return (
    <section className="card lab-section" data-testid="set-error-message">
      <h2 className="card-title" id="errors-set-error-message">
        setErrorMessage — メッセージの差し替え
      </h2>
      <p className="muted">
        クラスごとに任意の言語のメッセージを登録できます。
        既定値はオーバーライド前に控えておき、ボタンで復元します。
      </p>
      <div className="lab-actions">
        <button
          type="button"
          className="button"
          onClick={override}
          data-testid="set-error-message-override"
        >
          独自メッセージを登録
        </button>
        <button
          type="button"
          className="button"
          onClick={restore}
          data-testid="set-error-message-restore"
        >
          既定に戻す
        </button>
      </div>
      <p>
        UnreachableError の現在のメッセージ:{" "}
        <strong data-testid="custom-message">{message ?? "（未変更）"}</strong>
      </p>
      <CodeBlock title="setErrorMessage" code={SET_MESSAGE_CODE} />
    </section>
  );
}

type ErrorTableRow = {
  readonly label: string;
  readonly name: string;
  readonly isErrorBase: string;
};

/**
 * 全エラークラスの名前と ErrorBase 判定を組み立てます。
 */
function buildErrorRows(): readonly ErrorTableRow[] {
  const rows: ErrorTableRow[] = [];

  function add(label: string, instance: Error | null) {
    rows.push({
      label,
      name: instance ? instance.name : "（基底クラス）",
      isErrorBase: instance ? String(instance instanceof ErrorBase) : "—",
    });
  }

  const invalid = v.safeParse(v.string(), 1);

  add("ErrorBase", null);
  add("ValidationErrorBase", null);
  add("UnreachableError", new UnreachableError({ actual: [] }));
  if (!invalid.success) {
    add(
      "UnexpectedValidationError",
      new UnexpectedValidationError({ issues: invalid.issues, value: invalid.output }),
    );
  }
  add(
    "LoaderConditionError",
    new LoaderConditionError({
      url: "https://example.com/lab/errors",
      shouldReload: () => true,
      returnValue: Promise.resolve(true),
    }),
  );
  add("LoaderDataNotFoundError", new LoaderDataNotFoundError({ loader: undefined }));
  add("RouterContextMissingError", new RouterContextMissingError());
  add("RouteContextMissingError", new RouteContextMissingError());
  add("NavigationApiNotSupportedError", new NavigationApiNotSupportedError());

  return rows;
}

/**
 * エラークラスの一覧表です。
 */
function ErrorTable() {
  const rows = React.useMemo(() => buildErrorRows(), []);

  return (
    <section className="card lab-section" data-testid="error-table">
      <h2 className="card-title" id="errors-error-table">
        エラークラス一覧
      </h2>
      <p className="muted">
        すべてのエラーは `ErrorBase` を継承しています。 `UnexpectedValidationError` だけは
        `ValidationErrorBase` を挟みます。
      </p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="エラークラス一覧">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">クラス</th>
              <th scope="col">name</th>
              <th scope="col">instanceof ErrorBase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  <code>{row.name}</code>
                </td>
                <td>{row.isErrorBase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * エラー講座のページです。
 */
export default function LabErrorsPage() {
  return (
    <div className="lab-page">
      <nav aria-label="このページの目次" className="lab-actions">
        <a href="#errors-boundary">エラーバウンダリー</a>
        <a href="#errors-loader-data-not-found">LoaderDataNotFoundError</a>
        <a href="#errors-loader-condition">LoaderConditionError — shouldReload の契約違反</a>
        <a href="#errors-action-error">アクションの例外 — 元 URL に留まりバウンダリーへ</a>
        <a href="#errors-unexpected-validation">UnexpectedValidationError</a>
        <a href="#errors-unreachable">UnreachableError</a>
        <a href="#errors-context-missing">
          RouterContextMissingError / RouteContextMissingError
        </a>
        <a href="#errors-nav-api">NavigationApiNotSupportedError</a>
        <a href="#errors-set-error-message">setErrorMessage — メッセージの差し替え</a>
        <a href="#errors-error-table">エラークラス一覧</a>
      </nav>
      <BoundaryDemo />
      <LoaderDataNotFoundDemo />
      <LoaderConditionDemo />
      <ActionErrorDemo />
      <UnexpectedValidationDemo />
      <UnreachableDemo />
      <ContextMissingDemo />
      <NavApiErrorDemo />
      <SetErrorMessageDemo />
      <ErrorTable />
    </div>
  );
}
