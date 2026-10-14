import { matchRoutes, RoutePatternUtils } from "@pera1/core";
import type { Route, RouteParams } from "@pera1/core";
import * as React from "react";

import { CodeBlock } from "../../components/code-block.js";

/**
 * このページはファイルベースルーティングで「モジュール形式」として読み込まれます。
 *
 * `@pera1/vite-plugin` が生成する定義はページモジュールの名前空間を spread し、
 * ファイル構成から決まる `path` で上書きします。
 *
 * ```ts
 * // virtual:pera1/routes (生成物イメージ)
 * import * as route from "/src/pages/lab/matching.tsx";
 * export const routes = [{ ...route, path: "/lab/matching" }];
 * ```
 *
 * `component` プロパティーを書かなくても、`default` エクスポートが
 * コンポーネントとして採用されます。
 */

type DemoComponent = React.ComponentType<{}>;

/**
 * 手で組み立てた正規化済みルートを作ります。
 *
 * `matchRoutes` は「正規化済みで詳細度順に並んだ `Route[]`」を受け取る前提なので、
 * ここでは公開 API (`RoutePatternUtils`) だけでその前提を再現しています。
 * `index` 以外のルートは子への前方一致 (`allowChild: true`) を有効にします。
 */
function demoRoute(path: string): Route<DemoComponent> {
  return {
    path,
    index: false,
    utils: new RoutePatternUtils(path, { allowChild: true }),
    action: undefined,
    loader: undefined,
    component: undefined,
    shouldReload: (args) => args.defaultShouldReload,
  };
}

/**
 * `matchRoutes` プレイグラウンド用のルートです。
 *
 * 詳細度が高い順に手で並べています (`matchRoutes` は並び替えをしません)。
 */
const DEMO_ROUTES: readonly Route<DemoComponent>[] = [
  demoRoute("/projects/:projectId/tasks/:taskId"),
  demoRoute("/projects/new"),
  demoRoute("/projects/:projectId"),
  demoRoute("/projects"),
  demoRoute("/"),
  demoRoute("/*"),
];

const PATTERN_EXAMPLE = `const utils = new RoutePatternUtils("/projects/:projectId", { allowChild: false });

utils.match("/projects/p-1");       // true
utils.parse("/projects/p-1");       // { projectId: "p-1" }
utils.parse("/posts/1");            // RoutePatternMismatchError を投げる
utils.parseSafe("/posts/1");        // null
utils.inject({ projectId: "p-1" }); // "/projects/p-1"
utils.replace("/projects/p-1", { projectId: "p-2" }); // "/projects/p-2"
utils.replaceSafe("/posts/1", { projectId: "p-2" });  // null
utils.replace("/posts/1", { projectId: "p-2" });      // RoutePatternMismatchError を投げる

// インスタンスを作らずに静的メソッドでも呼べる
RoutePatternUtils.parseSafe("/projects/:projectId", "/projects/p-1", { allowChild: false });
// { projectId: "p-1" }`;

const MATCH_ROUTES_EXAMPLE = `const routes = [
  { path: "/projects/:projectId/tasks/:taskId", utils: new RoutePatternUtils(path, { allowChild: true }) },
  { path: "/projects/new", utils: new RoutePatternUtils(path, { allowChild: true }) },
  { path: "/projects/:projectId", utils: new RoutePatternUtils(path, { allowChild: true }) },
  // ... path, index, action, loader, component, shouldReload をそろえる
];

const chain = matchRoutes(routes, new URL("/projects/new", location.origin));
// 子 -> 親の順。静的 "/projects/new" が勝ち、:projectId は除外される`;

/**
 * URL 文字列を `matchRoutes` に渡せる `URL` へ変換します。
 * 入力が壊れていても落ちないように null を返します。
 */
function toUrl(value: string): URL | null {
  try {
    return new URL(value, window.location.origin);
  } catch {
    return null;
  }
}

/**
 * パターンの一致・解析・生成をその場で試すプレイグラウンドです。
 */
function PatternPlayground() {
  const [pattern, setPattern] = React.useState("/projects/:projectId/tasks/:taskId");
  const [target, setTarget] = React.useState("/projects/p-router/tasks/t-1");
  const [allowChild, setAllowChild] = React.useState(false);

  const utils = new RoutePatternUtils(pattern, { allowChild });
  const matched = utils.match(target);
  const parsed = utils.parseSafe(target);
  // `RouteParams` 型として受ける実演です。不一致のときは空の params になります。
  const parsedParams: RouteParams = parsed ?? {};
  const injected = parsed ? utils.inject(parsed) : null;
  const replaced = utils.replaceSafe(target, { taskId: "t-999" });
  // インスタンスを作らない静的メソッドでも同じ結果が得られます。
  const staticParsed = RoutePatternUtils.parseSafe(pattern, target, { allowChild });

  // 投げる版の parse は、不一致時のエラーメッセージを見せるために try/catch します。
  let strictParse: string;
  let parseError: string;
  try {
    strictParse = JSON.stringify(utils.parse(target));
    parseError = "（エラーなし）";
  } catch (error) {
    strictParse = "—";
    parseError =
      error instanceof Error ? `${error.name}: ${error.message}` : `不明なエラー: ${String(error)}`;
  }

  // replace も不一致時は RoutePatternMismatchError を投げるため、parse と同じく catch します。
  let replaceError: string;
  try {
    utils.replace(target, { taskId: "t-999" });
    replaceError = "（エラーなし）";
  } catch (error) {
    replaceError =
      error instanceof Error ? `${error.name}: ${error.message}` : `不明なエラー: ${String(error)}`;
  }

  return (
    <section className="card lab-section" data-testid="pattern-playground">
      <h2 className="card-title" id="matching-pattern-playground">
        パターンプレイグラウンド
      </h2>
      <p className="muted">
        パターンと対象パスを入力すると、`RoutePatternUtils` の各メソッドの結果が
        リアルタイムで更新されます。`allowChild` を有効にすると前方一致になります。
      </p>
      <div className="lab-controls">
        <label className="field">
          パターン
          <input
            className="input"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            data-testid="pattern-input"
          />
        </label>
        <label className="field">
          対象パス
          <input
            className="input"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            data-testid="pattern-target"
          />
        </label>
        <label className="field" style={{ flex: "0 0 auto" }}>
          <span>オプション</span>
          <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allowChild}
              onChange={(event) => setAllowChild(event.target.checked)}
              data-testid="allow-child"
            />
            allowChild: true
          </span>
        </label>
      </div>
      <div className="lab-result">
        <p>
          match: <strong data-testid="pattern-match">{String(matched)}</strong>
        </p>
        <p>
          parseSafe: <code data-testid="pattern-parse">{JSON.stringify(parsed)}</code>
        </p>
        <p>
          params のキー数 (<code>RouteParams</code>):{" "}
          <strong data-testid="pattern-params-count">{Object.keys(parsedParams).length}</strong>
        </p>
        <p>
          parse (例外あり): <code data-testid="pattern-strict-parse">{strictParse}</code>
        </p>
        <p data-testid="pattern-parse-error">不一致時のエラー: {parseError}</p>
        <p>
          static parseSafe (クラス直呼び):{" "}
          <code data-testid="pattern-static">{JSON.stringify(staticParsed)}</code>
        </p>
        <p>
          inject (parse 結果から生成): <code data-testid="pattern-inject">{injected ?? "—"}</code>
        </p>
        <p>
          replaceSafe (taskId を t-999 に):{" "}
          <code data-testid="pattern-replace">{replaced ?? "null"}</code>
        </p>
        <p data-testid="pattern-replace-error">replace 不一致時のエラー: {replaceError}</p>
      </div>
      <CodeBlock title="RoutePatternUtils" code={PATTERN_EXAMPLE} />
    </section>
  );
}

/**
 * `matchRoutes` に手で組んだルートを渡し、マッチ鎖を表示します。
 */
function MatchRoutesPlayground() {
  const [target, setTarget] = React.useState("/projects/new");
  const url = toUrl(target);
  const chain = url ? matchRoutes(DEMO_ROUTES, url) : null;

  return (
    <section className="card lab-section" data-testid="match-routes-playground">
      <h2 className="card-title" id="matching-match-routes">
        matchRoutes の実演
      </h2>
      <p className="muted">
        詳細度順に並べたルート配列を `matchRoutes` に渡すと、マッチしたルートが 子 →
        親の順で返ります。静的ルートが URL に完全一致した場合、同じ位置の
        パラメータールートはマッチ鎖から取り除かれます。
      </p>
      <div className="lab-controls">
        <label className="field">
          URL
          <input
            className="input"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            data-testid="match-target"
          />
        </label>
      </div>
      <div className="lab-result" data-testid="match-chain">
        {chain === null ? (
          <p className="muted">マッチするルートがありません。</p>
        ) : (
          <ol>
            {chain.map((route) => (
              <li key={`${route.path}:${route.urlPath}`}>
                <code>{route.path}</code>
                {" params: "}
                <code>{JSON.stringify(route.params)}</code>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="lab-note">
        `/projects/p-router` では `:projectId` が、`/projects/new` では静的 `new` が優先され
        `:projectId` が鎖から除外されることを比べてみてください。
      </p>
      <CodeBlock title="matchRoutes" code={MATCH_ROUTES_EXAMPLE} />
    </section>
  );
}

/**
 * アプリ本体の静的優先ルートへの導線です。
 */
function StaticVsParam() {
  return (
    <section className="card lab-section" data-testid="static-vs-param">
      <h2 className="card-title" id="matching-static-vs-param">
        静的 vs パラメーター (メインアプリで確認)
      </h2>
      <p className="muted">
        メインアプリでは `projects/new.tsx` と `projects/$projectId/_layout.tsx` で `/projects/new`
        と `/projects/:projectId` を両方定義しています。 `/projects/new`
        にアクセスすると静的ルートが勝ち、 `new` はプロジェクト ID として扱われません。
      </p>
      <ul className="lab-actions" style={{ listStyle: "none", padding: 0 }}>
        <li>
          <a className="button" href="/projects/new">
            /projects/new (静的が勝つ)
          </a>
        </li>
        <li>
          <a className="button" href="/projects/p-router">
            /projects/p-router (:projectId が使われる)
          </a>
        </li>
      </ul>
    </section>
  );
}

/**
 * `RoutePatternUtils` と `matchRoutes` の実験ページです。
 */
export default function LabMatchingPage() {
  return (
    <div className="lab-page">
      <nav aria-label="このページの目次" className="lab-actions">
        <a href="#matching-pattern-playground">パターンプレイグラウンド</a>
        <a href="#matching-match-routes">matchRoutes の実演</a>
        <a href="#matching-static-vs-param">静的 vs パラメーター (メインアプリで確認)</a>
      </nav>
      <PatternPlayground />
      <MatchRoutesPlayground />
      <StaticVsParam />
    </div>
  );
}
