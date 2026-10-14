import { selectActionData, selectLoaderData } from "@pera1/core";
import {
  RouteContext,
  RouterContext,
  useActionData,
  useFormAction,
  useNavigation,
  useParams,
  useRouteContext,
  useRoutePath,
  useRouterContext,
} from "@pera1/react";
import * as React from "react";

import { safeStringify } from "../../components/inspector.js";

/**
 * 公開 API と「このショーケースのどこで実演しているか」の対応表です。
 *
 * レビュー時に API の網羅漏れを検出できるよう、`@pera1/react` と `@pera1/core` の
 * 公開 API をすべて列挙しています。
 */
type ApiRow = {
  readonly library: "react" | "core";
  readonly api: string;
  readonly usage: string;
  readonly href: string | null;
};

const API_ROWS: readonly ApiRow[] = [
  { library: "react", api: "BrowserRouter", usage: "アプリ全体の起動 (main.tsx)", href: "/" },
  {
    library: "react",
    api: "Router",
    usage: "自作エンジン（/lab/engine）。エラー実験内のミニアプリでも使用",
    href: "/lab/engine",
  },
  { library: "react", api: "Outlet", usage: "root / projects / lab の各レイアウト", href: "/lab" },
  {
    library: "react",
    api: "RouteContext",
    usage: "インスペクターで React.use 直読み",
    href: "/lab",
  },
  {
    library: "react",
    api: "RouterContext",
    usage: "インスペクターで React.use 直読み",
    href: "/lab",
  },
  {
    library: "react",
    api: "useLoaderData",
    usage: "コア API ページのローダー結果",
    href: "/lab/core",
  },
  {
    library: "react",
    api: "useActionData",
    usage: "コア API のフォーム送信結果",
    href: "/lab/core",
  },
  {
    library: "react",
    api: "useNavigate",
    usage: "ストレスランナー・遅延読み込み",
    href: "/lab/limits",
  },
  {
    library: "react",
    api: "useSubmit",
    usage: "メモリーエンジンの送信・二重送信（/lab/limitsでも実演）",
    href: "/lab/engine",
  },
  { library: "react", api: "useParams", usage: "インスペクターのフック一覧", href: "/lab" },
  { library: "react", api: "useFormAction", usage: "インスペクターのフック一覧", href: "/lab" },
  { library: "react", api: "useRoutePath", usage: "Lab レイアウトの現在地表示", href: "/lab" },
  {
    library: "react",
    api: "useRouteContext",
    usage: "インスペクター・セレクター",
    href: "/lab/core",
  },
  {
    library: "react",
    api: "useRouterContext",
    usage: "インスペクター・キャッシュ表示（/lab/coreのセレクターでも使用）",
    href: "/lab/limits",
  },
  { library: "react", api: "useNavigation", usage: "進行状態のライブ表示", href: "/lab/limits" },
  {
    library: "react",
    api: "useScrollRestoration",
    usage: "メモリーエンジン配下レイアウト",
    href: "/lab/engine",
  },

  { library: "core", api: "createRouter", usage: "コントローラー単体の生成", href: "/lab/core" },
  { library: "core", api: "matchRoutes", usage: "マッチ鎖の組み立て", href: "/lab/matching" },
  {
    library: "core",
    api: "initLoaders",
    usage: "メモリーエンジンの初期ロード",
    href: "/lab/engine",
  },
  {
    library: "core",
    api: "startLoaders",
    usage: "メモリーエンジンの再取得判定",
    href: "/lab/engine",
  },
  {
    library: "core",
    api: "startAction",
    usage: "メモリーエンジンのフォーム送信",
    href: "/lab/engine",
  },
  {
    library: "core",
    api: "selectLoaderData",
    usage: "独自フック useRawLoaderData",
    href: "/lab/core",
  },
  {
    library: "core",
    api: "selectActionData",
    usage: "アクション結果のセレクター購読",
    href: "/lab/core",
  },
  {
    library: "core",
    api: "toNavigateArgs",
    usage: "最後の NavigateArgs の表示",
    href: "/lab/engine",
  },
  { library: "core", api: "toSubmitArgs", usage: "memoryEngine.send の内部", href: "/lab/engine" },
  {
    library: "core",
    api: "NavigationApiEngine",
    usage: "BrowserRouter の既定エンジン",
    href: "/lab/limits",
  },
  {
    library: "core",
    api: "IEngine / 関連型",
    usage: "メモリーエンジンの実装契約",
    href: "/lab/engine",
  },
  {
    library: "core",
    api: "expectHistoryEntry",
    usage: "履歴エントリーの検証（/lab/coreでも実演）",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "HistoryEntryIdSchema",
    usage: "UUID スキーマとシングルトン",
    href: "/lab/core",
  },
  { library: "core", api: "HistoryEntryUrlSchema", usage: "URL 正規化スキーマ", href: "/lab/core" },
  { library: "core", api: "RoutePath", usage: "パスの正規化とクエリー操作", href: "/lab/core" },
  {
    library: "core",
    api: "RoutePatternUtils",
    usage: "パターンプレイグラウンド",
    href: "/lab/matching",
  },
  {
    library: "core",
    api: "RouteRequest",
    usage: "ローダー / アクションの request",
    href: "/lab/core",
  },
  { library: "core", api: "redirect", usage: "リダイレクト応答の生成", href: "/lab/core" },
  {
    library: "core",
    api: "RedirectResponse",
    usage: "正規化結果の instanceof 確認",
    href: "/lab/core",
  },
  {
    library: "core",
    api: "formDataToHTMLFormElement",
    usage: "multipart の実送信",
    href: "/lab/core",
  },
  { library: "core", api: "ErrorBase", usage: "エラー一覧の instanceof 判定", href: "/lab/errors" },
  {
    library: "core",
    api: "ValidationErrorBase",
    usage: "検証系エラーの基底確認",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "setErrorMessage",
    usage: "メッセージの差し替えと復元",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "UnreachableError",
    usage: "到達不能コードの生成実験",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "LoaderConditionError",
    usage: "不正な shouldReload の再現",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "LoaderDataNotFoundError",
    usage: "ローダーなし階層で useLoaderData",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "RouterContextMissingError",
    usage: "インスタンスとメッセージ表示",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "RouteContextMissingError",
    usage: "インスタンスとメッセージ表示",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "UnexpectedValidationError",
    usage: "expectHistoryEntry の失敗",
    href: "/lab/errors",
  },
  {
    library: "core",
    api: "NavigationApiNotSupportedError",
    usage: "対応チェックと try/catch",
    href: "/lab/limits",
  },
  { library: "core", api: "redirectToLogin", usage: "ログイン誘導 (メインアプリ)", href: "/login" },
  {
    library: "core",
    api: "sanitizeRedirectTo",
    usage: "open redirect 防止 (メインアプリ)",
    href: "/login",
  },
  { library: "core", api: "requireRole", usage: "管理者ガード (メインアプリ)", href: "/admin" },
  {
    library: "core",
    api: "REDIRECT_TO_PARAM",
    usage: "redirectTo のクエリー名 (メインアプリ)",
    href: "/login",
  },
  {
    library: "core",
    api: "LoaderFunctionArgs ほか型",
    usage:
      "LoaderFunctionArgs / ActionFunctionArgs / RouteParams / LoaderData / ActionData / RouteDefinitionObject / ShouldReloadFunctionArgs",
    href: null,
  },
];

/**
 * `RouteContext` を `React.use` で直接読み、生の値を表示します。
 *
 * フック (useRouteContext) と違い、コンテキスト直読みは「未供給なら null」を
 * 返すため、null チェックの責務が読み取り側にあります。
 */
function InspectorRoute() {
  const route = React.use(RouteContext);
  if (!route) {
    return <p data-testid="inspector-route">未供給 (Router の外で読み取りました)</p>;
  }

  return (
    <dl className="kv-table" data-testid="inspector-route">
      <div>
        <dt>path</dt>
        <dd>{route.path}</dd>
      </div>
      <div>
        <dt>index</dt>
        <dd>{String(route.index)}</dd>
      </div>
      <div>
        <dt>urlPath</dt>
        <dd>{route.urlPath}</dd>
      </div>
      <div>
        <dt>params</dt>
        <dd>{safeStringify(route.params)}</dd>
      </div>
      <div>
        <dt>utils.route</dt>
        <dd>{route.utils.route}</dd>
      </div>
      <div>
        <dt>loader?.name</dt>
        <dd>{route.loader?.name ?? "undefined"}</dd>
      </div>
      <div>
        <dt>action?.name</dt>
        <dd>{route.action?.name ?? "undefined"}</dd>
      </div>
    </dl>
  );
}

/**
 * `RouterContext` を `React.use` で直接読み、スナップショットを表示します。
 *
 * `routerRef.current` がフレームワーク非依存の `RouterSnapshot` です。
 */
function InspectorRouter() {
  const router = React.use(RouterContext);
  if (!router) {
    return <p data-testid="inspector-router">未供給 (Router の外で読み取りました)</p>;
  }

  return (
    <dl className="kv-table" data-testid="inspector-router">
      <div>
        <dt>currentEntry.url.href</dt>
        <dd>{router.routerRef.current.currentEntry.url.href}</dd>
      </div>
      <div>
        <dt>subscribe</dt>
        <dd>{typeof router.subscribe === "function" ? "関数あり" : "なし"}</dd>
      </div>
    </dl>
  );
}

/**
 * 公開フックの戻り値を一覧表示します。
 */
function InspectorHooks() {
  const route = useRouteContext();
  const href = useRouterContext((router) => router.currentEntry.url.href);
  const path = useRoutePath();
  const params = useParams();
  const navigation = useNavigation();
  const formAction = useFormAction();

  return (
    <div
      className="table-wrap"
      tabIndex={0}
      role="region"
      aria-label="公開フックの戻り値"
    >
      <table className="table" data-testid="inspector-hooks">
        <tbody>
          <tr>
            <th scope="row">useRouteContext().urlPath</th>
            <td data-testid="hooks-route-url-path">{route.urlPath}</td>
          </tr>
          <tr>
            <th scope="row">useRouterContext((r) =&gt; r.currentEntry.url.href)</th>
            <td data-testid="hooks-entry-href">{href}</td>
          </tr>
          <tr>
            <th scope="row">useRoutePath().toString()</th>
            <td data-testid="hooks-route-path">{path.toString()}</td>
          </tr>
          <tr>
            <th scope="row">useParams()</th>
            <td data-testid="hooks-params">{safeStringify(params)}</td>
          </tr>
          <tr>
            <th scope="row">useNavigation().state</th>
            <td data-testid="hooks-navigation-state">{navigation.state}</td>
          </tr>
          <tr>
            <th scope="row">useFormAction()</th>
            <td data-testid="hooks-form-action">{formAction}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type RawLoaderData = ReturnType<typeof selectLoaderData>;

/**
 * `useLoaderData` が内部で行っているのと同じ選択を、`selectLoaderData` を使って
 * 自前で組み立てるフックです。
 *
 * ルートコンテキストの `loader` は親から継承されているため、Lab ページでも
 * root レイアウトのローダー結果を参照できます。
 */
function useRawLoaderData(): RawLoaderData {
  const { loader } = useRouteContext();

  return useRouterContext((router) => selectLoaderData(router, loader));
}

/**
 * `selectActionData` を直接使うためのフックです。
 */
function useRawActionData(): ReturnType<typeof selectActionData> {
  const { action } = useRouteContext();

  return useRouterContext((router) => selectActionData(router, action));
}

function InheritedLoaderValue({ data }: { readonly data: NonNullable<RawLoaderData> }) {
  const value = React.use(data);

  return <pre className="lab-output">{safeStringify(value)}</pre>;
}

function InheritedLoaderView() {
  const data = useRawLoaderData();

  return (
    <div className="lab-result" data-testid="inspector-inherited-loader">
      {data ? (
        <React.Suspense fallback={<p className="muted">親ローダーの解決を待っています…</p>}>
          <InheritedLoaderValue data={data} />
        </React.Suspense>
      ) : (
        <p className="muted">ローダーデータが見つかりませんでした。</p>
      )}
    </div>
  );
}

function ActionDataPresence() {
  const actionData = useActionData();

  return (
    <p className="lab-output" data-testid="inspector-action-data">
      {actionData
        ? `実行済み (status: ${actionData.status})`
        : "undefined — このページではまだアクションを実行していません。"}
    </p>
  );
}

/**
 * Lab の入口ページです。API の実演マップと、現在のルーター状態を生で見る
 * ライブインスペクターを提供します。
 */
export default function LabIndexPage() {
  const rawActionData = useRawActionData();
  const route = useRouteContext();

  return (
    <div className="lab-page">
      <section className="card lab-section" aria-labelledby="lab-api-map">
        <h2 className="card-title" id="lab-api-map">
          API 機能マップ
        </h2>
        <p className="muted">
          `@pera1/react` と `@pera1/core` の公開 API をすべて列挙し、このショーケースの
          どこで実演しているかを示します。リンクからその場所へ直接移動できます。
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-labelledby="lab-api-map"
        >
          <table className="table api-map" data-testid="api-map">
            <thead>
              <tr>
                <th scope="col">API</th>
                <th scope="col">実演場所</th>
                <th scope="col">リンク</th>
              </tr>
            </thead>
            <tbody>
              {API_ROWS.map((row) => (
                <tr key={`${row.library}:${row.api}`}>
                  <td>
                    <span className={`badge badge-${row.library === "react" ? "info" : "success"}`}>
                      @pera1/{row.library}
                    </span>{" "}
                    {row.api}
                  </td>
                  <td>{row.usage}</td>
                  <td>{row.href ? <a href={row.href}>{row.href}</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card lab-section" aria-labelledby="lab-inspector">
        <h2 className="card-title" id="lab-inspector">
          ライブインスペクター
        </h2>
        <p className="muted">
          コンテキストを `React.use` で直接読み、現在のルートとルーターの生の状態を表示します。
          フック版の戻り値も並べて比較できます。
        </p>
        <div className="inspector-grid">
          <article className="card">
            <h3>RouteContext (直接読み)</h3>
            <InspectorRoute />
          </article>
          <article className="card">
            <h3>RouterContext (直接読み)</h3>
            <InspectorRouter />
          </article>
          <article className="card">
            <h3>公開フックの戻り値</h3>
            <InspectorHooks />
          </article>
        </div>
      </section>

      <section className="card lab-section" aria-labelledby="lab-inherit">
        <h2 className="card-title" id="lab-inherit">
          親ローダーの継承と selectLoaderData
        </h2>
        <p className="muted">
          `RouteContext` の `loader` は「自分のルートのローダー、なければ親のローダー」を
          指します。そのためこのページ自身にローダーがなくても、root レイアウトの ローダー結果を
          `selectLoaderData` で取り出せます。
        </p>
        <div className="split-grid">
          <div className="lab-result" data-testid="inspector-raw-loader-source">
            <p className="lab-result-label">選択対象 (useRouteContext().loader)</p>
            <code>{route.loader?.name || "undefined (継承されたローダー)"}</code>
          </div>
          <div>
            <p className="lab-result-label">selectLoaderData の結果 (React.use で解決)</p>
            <InheritedLoaderView />
          </div>
        </div>
        <h3>useActionData() の場合</h3>
        <p className="muted">
          アクションは「実行されるまでストアに存在しない」ため、`selectActionData` は `undefined`
          を返します。未実行と未定義の違いを表示で確認できます (ここに `actionData`
          を表示しています: status = {rawActionData?.status ?? "undefined"})。
        </p>
        <ActionDataPresence />
      </section>
    </div>
  );
}
