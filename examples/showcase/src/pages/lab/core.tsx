import {
  createRouter,
  ErrorBase,
  expectHistoryEntry,
  formDataToHTMLFormElement,
  HistoryEntryIdSchema,
  HistoryEntryUrlSchema,
  redirect,
  RedirectResponse,
  RoutePath,
  selectActionData,
  selectLoaderData,
  UnexpectedValidationError,
  ValidationErrorBase,
} from "@pera1/core";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@pera1/core";
import {
  useActionData,
  useLoaderData,
  useRouteContext,
  useRoutePath,
  useRouterContext,
} from "@pera1/react";
import type { RouterRouteDefinition } from "@pera1/react";
import * as React from "react";
import * as v from "valibot";

import { bumpLoaderRun } from "../../api/metrics.js";
import { CodeBlock } from "../../components/code-block.js";
import { MemoryEngine } from "../../lab/memory-engine.js";

/**
 * コア API ページのローダーです。
 *
 * `request` の形 (method / url / formData) をそのまま画面へ持ち帰り、
 * `RouteRequest` セクションで表示します。
 */
export async function labCoreLoader({ request }: LoaderFunctionArgs) {
  const runCount = bumpLoaderRun("lab-core");

  return {
    request: {
      method: request.method,
      url: request.url.href,
      formDataIsNull: request.formData === null,
    },
    runCount,
    loadedAt: new Date().toISOString(),
  };
}

/**
 * コア API ページのアクションです。
 *
 * `formDataToHTMLFormElement` から multipart で送られてきた値をそのまま
 * 検証し、添付ファイルの有無を結果に含めます。
 */
export async function labCoreAction({ request }: ActionFunctionArgs) {
  const message = String(request.formData.get("message") ?? "").trim();
  if (message === "") {
    return { error: "メッセージを入力してください。" };
  }

  const file = request.formData.get("file");
  if (file instanceof File && file.size > 0) {
    return {
      received: message,
      fileName: file.name,
      size: file.size,
      receivedAt: new Date().toISOString(),
    };
  }

  return { received: message, receivedAt: new Date().toISOString() };
}

// ファイルベースルーティングではモジュールの名前空間が spread されるため、
// `action` / `loader` の名前でもエクスポートしておきます。
export { labCoreAction as action, labCoreLoader as loader };

/**
 * エラーを表示用に正規化します。
 */
type ErrorView = {
  readonly name: string;
  readonly message: string;
  readonly issuesLength: number | null;
  readonly isValidationError: boolean;
  readonly isErrorBase: boolean;
};

function describeError(error: unknown): ErrorView {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);

  return {
    name,
    message,
    issuesLength: error instanceof UnexpectedValidationError ? error.meta.issues.length : null,
    isValidationError: error instanceof ValidationErrorBase,
    isErrorBase: error instanceof ErrorBase,
  };
}

const ROUTE_PATH_CODE = `const path = new RoutePath("/users///profile//?b=2&a=1#section");

path.pathname; // "/users/profile" (連続スラッシュと末尾スラッシュを正規化)
path.search;   // "?a=1&b=2" (search/toString取得時にソート。searchParams自体は順序不定)
path.hash;     // "#section"

path.searchParams.set("page", "2");
path.toString(); // "/users/profile?a=1&b=2&page=2#section"

const copy = path.clone();
copy.pathname = "/renamed"; // 元の path.pathname は変わらない

RoutePath.encode("//items//1//"); // "/items/1"`;

const REDIRECT_CODE = `const response = redirect("/users/profile?id=123&sort=desc#bio");

response instanceof RedirectResponse; // true
response.pathname; // "/users/profile"
response.search;   // "?id=123&sort=desc"
response.hash;     // "#bio"

redirect("/users?z=1&a=2").search; // "?a=2&z=1" (常にソート)`;

const SCHEMA_CODE = `import * as v from "valibot";
import { HistoryEntryIdSchema, HistoryEntryUrlSchema } from "@pera1/core";

v.parse(HistoryEntryIdSchema(), crypto.randomUUID()); // HistoryEntryId
v.safeParse(HistoryEntryIdSchema(), "not-a-uuid").success; // false

const url = v.parse(
  HistoryEntryUrlSchema(),
  "https://example.com/page?c=3&a=1&b=2",
);
url.search; // "?a=1&b=2&c=3"

HistoryEntryIdSchema() === HistoryEntryIdSchema(); // true (シングルトン)`;

const EXPECT_ENTRY_CODE = `const entry = expectHistoryEntry({
  id: crypto.randomUUID(),
  url: location.origin + "/lab/core",
  index: 0,
}); // HistoryEntry

expectHistoryEntry(null); // null

try {
  expectHistoryEntry({ id: crypto.randomUUID(), url: "not a url", index: 0 });
} catch (error) {
  // error は UnexpectedValidationError
  // error.meta.issues に検証結果が入る
}`;

const FDH_CODE = `const formData = new FormData(form);
const element = formDataToHTMLFormElement(formData);

element.method = "POST";
element.action = "/lab/core";
document.body.append(element);
element.submit();
element.remove(); // 必ず後始末する`;

const CONTROLLER_CODE = `const engine = new MemoryEngine("/");
const controller = createRouter({ engine, routes });

const stop = controller.start();
const unsubscribe = controller.subscribe(() => {
  const snapshot = controller.getSnapshot();
  setUrl(snapshot.currentEntry.url.href);
});

engine.go("/b"); // navigate -> update -> subscribe が呼ばれる

// アンマウント時
unsubscribe();
stop();`;

const SELECTORS_CODE = `function useRawLoaderData() {
  const { loader } = useRouteContext();
  const data = useRouterContext((router) => selectLoaderData(router, loader));
  return data; // NinjaPromise<unknown> | undefined
}

// 解決は React.use に任せる (Suspense と ErrorBoundary へつながる)
const value = React.use(data);`;

/**
 * RoutePath の正規化・クエリー操作・clone を試すセクションです。
 */
function RoutePathDemo() {
  const [input, setInput] = React.useState("/users///profile//?b=2&a=1#section");
  const [path, setPath] = React.useState(() => new RoutePath("/users///profile//?b=2&a=1#section"));

  // clone してから変更しても、元のインスタンスは変化しないことを示します。
  const cloned = path.clone();
  cloned.pathname = "/users/renamed";

  return (
    <section className="card lab-section" data-testid="route-path-demo">
      <h2 className="card-title" id="core-route-path">
        RoutePath — 正規化とクエリー操作
      </h2>
      <p className="muted">
        文字列を渡すだけで、連続スラッシュ・末尾スラッシュ・クエリーの並びが
        正規化されます。ソートするのは`search`/`toString`取得時で、`searchParams`自体は順序不定です。
      </p>
      <div className="lab-controls">
        <label className="field">
          入力パス
          <input
            className="input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setPath(new RoutePath(event.target.value));
            }}
          />
        </label>
        <button
          type="button"
          className="button"
          data-testid="route-path-set-page"
          onClick={() => {
            const next = path.clone();
            next.searchParams.set("page", "2");
            setPath(next);
          }}
        >
          searchParams.set(&quot;page&quot;, &quot;2&quot;)
        </button>
      </div>
      <dl className="kv-table">
        <div>
          <dt>pathname</dt>
          <dd data-testid="route-path-pathname">{path.pathname}</dd>
        </div>
        <div>
          <dt>search</dt>
          <dd data-testid="route-path-search">{path.search || "（なし）"}</dd>
        </div>
        <div>
          <dt>hash</dt>
          <dd data-testid="route-path-hash">{path.hash || "（なし）"}</dd>
        </div>
        <div>
          <dt>toString()</dt>
          <dd data-testid="route-path-string">{path.toString()}</dd>
        </div>
        <div>
          <dt>clone() を pathname 変更後</dt>
          <dd>{cloned.toString()}</dd>
        </div>
        <div>
          <dt>元のインスタンス</dt>
          <dd>{path.toString()}</dd>
        </div>
        <div>
          <dt>RoutePath.encode(&quot;//items//1//&quot;)</dt>
          <dd data-testid="route-path-encoded">{RoutePath.encode("//items//1//")}</dd>
        </div>
      </dl>
      <CodeBlock title="RoutePath" code={ROUTE_PATH_CODE} />
    </section>
  );
}

/**
 * redirect / RedirectResponse の正規化結果を表示します。
 */
function RedirectDemo() {
  const [input, setInput] = React.useState("/users/profile?id=123&sort=desc#bio");
  const response = redirect(input);

  return (
    <section className="card lab-section" data-testid="redirect-demo">
      <h2 className="card-title" id="core-redirect">
        redirect / RedirectResponse
      </h2>
      <p className="muted">
        `redirect` は `RoutePath` と同じ規則でリダイレクト先を正規化します。
        アクションやローダーから返すと、エンジンが自動で遷移させます。
      </p>
      <div className="lab-controls">
        <label className="field">
          リダイレクト先
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
      </div>
      <dl className="kv-table">
        <div>
          <dt>instanceof RedirectResponse</dt>
          <dd>{String(response instanceof RedirectResponse)}</dd>
        </div>
        <div>
          <dt>pathname</dt>
          <dd data-testid="redirect-pathname">{response.pathname}</dd>
        </div>
        <div>
          <dt>search</dt>
          <dd data-testid="redirect-search">{response.search || "（なし）"}</dd>
        </div>
        <div>
          <dt>hash</dt>
          <dd data-testid="redirect-hash">{response.hash || "（なし）"}</dd>
        </div>
        <div>
          <dt>redirect(&quot;/users?z=1&amp;a=2&quot;).search</dt>
          <dd>{redirect("/users?z=1&a=2").search}</dd>
        </div>
      </dl>
      <CodeBlock title="redirect" code={REDIRECT_CODE} />
    </section>
  );
}

/**
 * 履歴エントリースキーマとシングルトン性を確認します。
 */
function SchemaDemo() {
  const idSchema = HistoryEntryIdSchema();
  const validId = v.parse(idSchema, crypto.randomUUID());
  const invalidId = v.safeParse(idSchema, "not-a-uuid");
  const url = v.parse(HistoryEntryUrlSchema(), "https://example.com/page?c=3&a=1&b=2");
  const singleton = HistoryEntryIdSchema() === HistoryEntryIdSchema();

  return (
    <section className="card lab-section" data-testid="schema-demo">
      <h2 className="card-title" id="core-schema">
        履歴エントリースキーマ (valibot)
      </h2>
      <p className="muted">
        `valibot` の `parse` / `safeParse` をそのまま使えます。
        スキーマ関数はシングルトンを返すため、呼ぶたびに作り直されません。
      </p>
      <dl className="kv-table">
        <div>
          <dt>v.parse(HistoryEntryIdSchema(), UUID)</dt>
          <dd data-testid="schema-valid-id">{validId}</dd>
        </div>
        <div>
          <dt>v.safeParse(HistoryEntryIdSchema(), &quot;not-a-uuid&quot;)</dt>
          <dd data-testid="schema-invalid-id">
            {invalidId.success ? "成功 (想定外)" : `失敗 (issues: ${invalidId.issues.length})`}
          </dd>
        </div>
        <div>
          <dt>v.parse(HistoryEntryUrlSchema(), ...).search</dt>
          <dd data-testid="schema-url-search">{url.search}</dd>
        </div>
        <div>
          <dt>HistoryEntryIdSchema() === HistoryEntryIdSchema()</dt>
          <dd data-testid="schema-singleton">{String(singleton)}</dd>
        </div>
      </dl>
      <CodeBlock title="スキーマ" code={SCHEMA_CODE} />
    </section>
  );
}

/**
 * expectHistoryEntry の成功・null・失敗を並べます。
 */
function ExpectEntryDemo() {
  const entry = expectHistoryEntry({
    id: crypto.randomUUID(),
    url: `${window.location.origin}/lab/core`,
    index: 0,
  });
  const nullResult = expectHistoryEntry(null);

  let invalid: ErrorView | null = null;
  try {
    expectHistoryEntry({ id: crypto.randomUUID(), url: "not a url", index: 0 });
  } catch (error) {
    invalid = describeError(error);
  }

  return (
    <section className="card lab-section" data-testid="expect-entry-demo">
      <h2 className="card-title" id="core-expect-entry">
        expectHistoryEntry — 検証とブランド型
      </h2>
      <p className="muted">
        {"`{ id, url, index }` を検証し、確定した `HistoryEntry` へ変換します。"}
        引数自体が`null`/`undefined`のときは`null`を返します（`url`・`index`の検証詳細はコード参照）。
      </p>
      <dl className="kv-table">
        <div>
          <dt>正常な入力</dt>
          <dd data-testid="expect-valid">
            url = {entry.url.href} / index = {entry.index}
          </dd>
        </div>
        <div>
          <dt>null を渡した結果</dt>
          <dd data-testid="expect-null">{nullResult === null ? "null" : "HistoryEntry"}</dd>
        </div>
      </dl>
      {invalid ? (
        <dl className="kv-table" data-testid="expect-invalid">
          <div>
            <dt>name</dt>
            <dd>{invalid.name}</dd>
          </div>
          <div>
            <dt>message</dt>
            <dd>{invalid.message}</dd>
          </div>
          <div>
            <dt>meta.issues.length</dt>
            <dd>{invalid.issuesLength ?? "—"}</dd>
          </div>
          <div>
            <dt>instanceof ValidationErrorBase</dt>
            <dd>{String(invalid.isValidationError)}</dd>
          </div>
          <div>
            <dt>instanceof ErrorBase</dt>
            <dd>{String(invalid.isErrorBase)}</dd>
          </div>
        </dl>
      ) : null}
      <CodeBlock title="expectHistoryEntry" code={EXPECT_ENTRY_CODE} />
    </section>
  );
}

/**
 * `useActionData` でアクション結果を表示する部品です。
 */
function CoreActionData() {
  const actionData = useActionData<typeof labCoreAction>();

  if (!actionData) {
    return <p className="muted">アクションはまだ実行されていません。</p>;
  }

  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p className="error-text" role="alert">
        {data.error}
      </p>
    );
  }
  if (data) {
    const attachment =
      "fileName" in data && data.fileName
        ? ` / 添付: ${data.fileName} (${data.size} バイト)`
        : " / 添付なし";

    return (
      <p className="success-text" data-testid="fdh-received">
        受信: {data.received}
        {attachment}
      </p>
    );
  }

  return null;
}

/**
 * formDataToHTMLFormElement のプレビューと実送信を試します。
 */
function FormDataDemo() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  function buildData(): FormData | null {
    return formRef.current ? new FormData(formRef.current) : null;
  }

  function handlePreview() {
    const data = buildData();
    if (!data) {
      return;
    }

    setPreview(formDataToHTMLFormElement(data).outerHTML);
  }

  function handleSubmit() {
    const data = buildData();
    if (!data) {
      return;
    }

    const element = formDataToHTMLFormElement(data);
    element.method = "POST";
    element.action = "/lab/core";
    document.body.append(element);
    element.submit();
    // 送信後は必ず後始末します (DOM に残すと多重送信やスタイル汚染の原因になります)。
    element.remove();
  }

  return (
    <section className="card lab-section" data-testid="fdh-demo">
      <h2 className="card-title" id="core-form-data">
        formDataToHTMLFormElement — multipart 送信
      </h2>
      <p className="muted">
        `ReadonlyFormData` から非表示の `HTMLFormElement` を組み立てます。
        実際に送信すると、ファイルを含む multipart/form-data がアクションへ届きます。
      </p>
      <form ref={formRef} className="form-stack" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          メッセージ
          <input className="input" name="message" defaultValue="こんにちは" />
        </label>
        <label className="field">
          添付ファイル
          <input className="input" type="file" name="file" />
        </label>
        <div className="form-row">
          <button type="button" className="button" onClick={handlePreview}>
            フォームをプレビュー
          </button>
          <button type="button" className="button button-primary" onClick={handleSubmit}>
            このフォームで送信
          </button>
        </div>
      </form>
      {preview ? (
        <pre className="lab-output" data-testid="fdh-preview">
          {preview}
        </pre>
      ) : (
        <p className="muted">プレビューすると生成された form の outerHTML を表示します。</p>
      )}
      <CoreActionData />
      <CodeBlock title="formDataToHTMLFormElement" code={FDH_CODE} />
    </section>
  );
}

function ControllerPageA() {
  return <p>ページ A</p>;
}

function ControllerPageB() {
  return <p>ページ B</p>;
}

/**
 * コントローラーデモ用の小さなローダーです。
 */
function controllerLoader() {
  return { page: "A", loadedAt: new Date().toISOString() };
}

/**
 * `createRouter` に渡す最小のルート定義です。
 */
const CONTROLLER_ROUTES: readonly RouterRouteDefinition[] = [
  { index: true, path: "/", component: ControllerPageA, loader: controllerLoader },
  { path: "b", component: ControllerPageB },
];

/**
 * `createRouter` が返すコントローラーを直接操作して、購読の動きを確かめます。
 */
function ControllerDemo() {
  // StrictMode の二重初期化は許容します (デモ用途で、破棄された側は使われません)。
  const [demo] = React.useState(() => {
    const engine = new MemoryEngine("/");
    const controller = createRouter<React.ComponentType<{}>>({
      engine,
      routes: CONTROLLER_ROUTES,
    });

    return { engine, controller };
  });

  const [url, setUrl] = React.useState(() => demo.controller.getSnapshot().currentEntry.url.href);
  const [entryId, setEntryId] = React.useState(() => demo.controller.getSnapshot().currentEntry.id);
  const [routeCount, setRouteCount] = React.useState(
    () => demo.controller.getRoutes()?.length ?? 0,
  );

  React.useEffect(() => {
    function sync() {
      const snapshot = demo.controller.getSnapshot();
      setUrl(snapshot.currentEntry.url.href);
      setEntryId(snapshot.currentEntry.id);
      setRouteCount(demo.controller.getRoutes()?.length ?? 0);
    }

    sync();
    const unsubscribe = demo.controller.subscribe(sync);
    const stop = demo.controller.start();

    return () => {
      unsubscribe();
      stop();
    };
  }, [demo]);

  return (
    <section className="card lab-section" data-testid="controller-demo">
      <h2 className="card-title" id="core-controller">
        createRouter — コントローラー単体の購読
      </h2>
      <p className="muted">
        React の `Router` が内部で使っているコントローラーを直接生成し、 `start` / `subscribe` /
        `getSnapshot` / `getRoutes` の関係を観察します。下のコードは要点のみ抜粋です（`getSnapshot`/`getRoutes`取得と`useEffect`内`subscribe→start`＋クリーンアップの全体は本ファイル参照）。
      </p>
      <dl className="kv-table">
        <div>
          <dt>getSnapshot().currentEntry.url.href</dt>
          <dd data-testid="controller-url">{url}</dd>
        </div>
        <div>
          <dt>getSnapshot().currentEntry.id</dt>
          <dd data-testid="controller-entry-id">{entryId}</dd>
        </div>
        <div>
          <dt>getRoutes()?.length</dt>
          <dd data-testid="controller-route-count">{routeCount}</dd>
        </div>
      </dl>
      <div className="lab-actions">
        <button
          type="button"
          className="button"
          data-testid="controller-go-b"
          onClick={() => demo.engine.go("/b")}
        >
          engine.go(&quot;/b&quot;)
        </button>
        <button
          type="button"
          className="button"
          data-testid="controller-go-root"
          onClick={() => demo.engine.go("/")}
        >
          engine.go(&quot;/&quot;)
        </button>
      </div>
      <CodeBlock title="createRouter" code={CONTROLLER_CODE} />
    </section>
  );
}

type RawLoaderData = ReturnType<typeof selectLoaderData>;
type RawActionData = ReturnType<typeof selectActionData>;

/**
 * `useLoaderData` の中身と同じ選択を `selectLoaderData` で組み立てます。
 */
function useRawLoaderData(): RawLoaderData {
  const { loader } = useRouteContext();

  return useRouterContext((router) => selectLoaderData(router, loader));
}

/**
 * `selectActionData` を直接使うためのフックです。
 */
function useRawActionData(): RawActionData {
  const { action } = useRouteContext();

  return useRouterContext((router) => selectActionData(router, action));
}

function RawLoaderValue({ data }: { readonly data: NonNullable<RawLoaderData> }) {
  const value = React.use(data) as Awaited<ReturnType<typeof labCoreLoader>>;

  return (
    <pre className="lab-output">
      runCount: {value.runCount} / loadedAt: {value.loadedAt}
    </pre>
  );
}

function RawActionValue({ data }: { readonly data: NonNullable<RawActionData> }) {
  const value = React.use(data) as Awaited<ReturnType<typeof labCoreAction>>;

  if (value && "error" in value) {
    return <p className="error-text">{value.error}</p>;
  }
  if (value) {
    return (
      <p className="success-text">
        受信: {value.received}
        {"fileName" in value && value.fileName ? ` / 添付: ${value.fileName}` : ""}
      </p>
    );
  }

  return null;
}

/**
 * selectLoaderData / selectActionData によるセレクター購読のデモです。
 */
function SelectorsDemo() {
  const rawLoader = useRawLoaderData();
  const rawAction = useRawActionData();

  return (
    <section className="card lab-section" data-testid="selectors-demo">
      <h2 className="card-title" id="core-selectors">
        selectLoaderData / selectActionData
      </h2>
      <p className="muted">
        `useLoaderData` / `useActionData` が内部で使っているセレクターを直接呼び、
        このページ自身のローダー結果とアクション結果を購読します。
      </p>
      <h3>selectLoaderData (このページのローダー)</h3>
      <div className="lab-result" data-testid="select-loader-data">
        {rawLoader ? (
          <React.Suspense fallback={<p className="muted">ローダーの解決を待っています…</p>}>
            <RawLoaderValue data={rawLoader} />
          </React.Suspense>
        ) : (
          <p className="muted">ローダーデータが見つかりません。</p>
        )}
      </div>
      <h3>selectActionData (このページのアクション)</h3>
      <div className="lab-result" data-testid="select-action-data">
        {rawAction ? (
          <React.Suspense fallback={<p className="muted">アクションの解決を待っています…</p>}>
            <RawActionValue data={rawAction} />
          </React.Suspense>
        ) : (
          <p className="muted">未実行のため undefined です。</p>
        )}
      </div>
      <CodeBlock title="独自フック" code={SELECTORS_CODE} />
    </section>
  );
}

/**
 * ローダー / アクションが受け取る RouteRequest を表示します。
 */
function RequestInfo({ data }: { readonly data: Awaited<ReturnType<typeof labCoreLoader>> }) {
  return (
    <section className="card lab-section" data-testid="request-info">
      <h2 className="card-title" id="core-request">
        RouteRequest — ローダーが受け取る引数
      </h2>
      <dl className="kv-table">
        <div>
          <dt>request.method</dt>
          <dd data-testid="request-method">{data.request.method}</dd>
        </div>
        <div>
          <dt>request.url.href</dt>
          <dd data-testid="request-url">{data.request.url}</dd>
        </div>
        <div>
          <dt>request.formData</dt>
          <dd data-testid="request-form-data">
            {data.request.formDataIsNull ? "null (GET のため)" : "値あり"}
          </dd>
        </div>
        <div>
          <dt>loader runCount / loadedAt</dt>
          <dd>
            {data.runCount} / {data.loadedAt}
          </dd>
        </div>
      </dl>
      <p className="muted">
        `formDataToHTMLFormElement` で POST 送信すると、アクション側の `request` は `method` が
        `"POST"` になり、`formData` に送信内容が入ります。
        送信結果は「formDataToHTMLFormElement」セクションに表示されます。
      </p>
    </section>
  );
}

/**
 * コア API の実験ページです。
 */
export default function LabCorePage() {
  const data = React.use(useLoaderData<typeof labCoreLoader>());
  const path = useRoutePath();

  return (
    <div className="lab-page">
      <nav aria-label="このページの目次" className="lab-actions">
        <a href="#core-route-path">RoutePath — 正規化とクエリー操作</a>
        <a href="#core-redirect">redirect / RedirectResponse</a>
        <a href="#core-schema">履歴エントリースキーマ (valibot)</a>
        <a href="#core-expect-entry">expectHistoryEntry — 検証とブランド型</a>
        <a href="#core-form-data">formDataToHTMLFormElement — multipart 送信</a>
        <a href="#core-controller">createRouter — コントローラー単体の購読</a>
        <a href="#core-selectors">selectLoaderData / selectActionData</a>
        <a href="#core-request">RouteRequest — ローダーが受け取る引数</a>
      </nav>
      <p className="lab-note">
        現在のパス: <code>{path.toString()}</code> / ローダー実行回数:{" "}
        <strong>{data.runCount}</strong> (POST のたびに再実行されます)
      </p>
      <RoutePathDemo />
      <RedirectDemo />
      <SchemaDemo />
      <ExpectEntryDemo />
      <FormDataDemo />
      <ControllerDemo />
      <SelectorsDemo />
      <RequestInfo data={data} />
    </div>
  );
}
