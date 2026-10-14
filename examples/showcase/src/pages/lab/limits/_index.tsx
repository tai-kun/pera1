import { NavigationApiEngine } from "@pera1/core";
import {
  useNavigate,
  useNavigation,
  useRoutePath,
  useRouterContext,
  useSubmit,
} from "@pera1/react";
import * as React from "react";

import { loaderRunCount } from "../../../api/metrics.js";
import { CodeBlock } from "../../../components/code-block.js";

const NAV_SUPPORT_CODE = `// BrowserRouter は内部で Navigation API のエンジンを生成します。
// 未対応ブラウザーでは初期化時に NavigationApiNotSupportedError になります。
const engine = new NavigationApiEngine();

// 非対応環境の代替: 自作エンジンを <Router> に渡す
<Router engine={new MemoryEngine("/")} routes={routes} />`;

const SSR_CODE = `// pera1 は document / window / navigation を前提にしています。
// サーバーでは BrowserRouter を描画できません。
//
// 代替: メタフレームワークで初期 HTML を返し、
// クライアントで <BrowserRouter> をマウントしてハイドレートします。`;

const LAZY_CODE = `// pera1 に標準の遅延読み込みはありません。
// React.lazy をルート定義で使えるようにする小さなラッパーです。
export function lazyPage(importer) {
  const Lazy = React.lazy(importer);

  return function LazyPage() {
    return (
      <React.Suspense fallback={<p role="status">遅延チャンクを読み込み中…</p>}>
        <Lazy />
      </React.Suspense>
    );
  };
}

// src/pages/lab/limits/heavy.tsx (ファイルベースルート)
const HeavyPage = lazyPage(() => import("../../../lab/heavy-page.js"));
export default HeavyPage;`;

const TYPE_CODE = `// params は RouteParams<string> になり、値は string | undefined です。
const params = useParams();
params.projectId; // string | undefined

// パターンを型引数に渡すと、キーと必須性が確定します。
// 型引数はキャストであり実行時保証はない。誤ったパターンでは undefined になり得る。
const { projectId } = useParams<"/projects/:projectId">();
projectId; // string (| undefined を含まない)

// ワイルドカードは "*" キーです。
const { "*": rest } = useParams<"/files/*">();
rest; // string

// "*?" では string | undefined になる (例: useParams<"/files/*?">() の "*" は string | undefined)。`;

const CACHE_CODE = `// ローダーの結果は履歴エントリー ID ごとに保存されます。
//   /projects/p-router      1 回目 -> runCount 1
//   タスク詳細へ進んで戻る    -> キャッシュ再利用で runCount は増えない
//   /projects/p-router?force=1 -> shouldReload が true を返して runCount 2

function tasksShouldReload({ currentUrl, defaultShouldReload }) {
  return currentUrl.searchParams.get("force") === "1" ? true : defaultShouldReload;
}`;

const STRESS_CODE = `// 同期ループで 100 回 navigate する (replace)
for (let i = 0; i < 100; i++) {
  navigate("/lab/limits?stress=" + i, { replace: true });
}

// 3 件積んでから Back/Forward を 50 往復
navigate("/lab/limits?h=0");
navigate("/lab/limits?h=1");
navigate("/lab/limits?h=2");
for (let i = 0; i < 50; i++) {
  navigate(-1);
  navigate(1);
}`;

/**
 * Navigation API の対応状況を確認します。
 */
function NavSupportDemo() {
  const [check] = React.useState(() => {
    const inWindow = "navigation" in window;
    try {
      new NavigationApiEngine();

      return { inWindow, engine: "生成に成功しました。" };
    } catch (error) {
      const name = error instanceof Error ? error.name : typeof error;

      return { inWindow, engine: `生成に失敗しました (${name})。` };
    }
  });

  return (
    <section className="card lab-section" data-testid="nav-support">
      <h2 className="card-title" id="limits-nav-support">
        Navigation API が必須
      </h2>
      <dl className="kv-table">
        <div>
          <dt>&quot;navigation&quot; in window</dt>
          <dd>{String(check.inWindow)}</dd>
        </div>
        <div>
          <dt>new NavigationApiEngine()</dt>
          <dd data-testid="nav-support-engine">{check.engine}</dd>
        </div>
      </dl>
      <p className="muted">
        未対応環境では `NavigationApiNotSupportedError` が投げられます。
        自作エンジンへ差し替えれば、その環境でも動作させられます。
      </p>
      <p>
        <a href="/lab/engine">→ 自作エンジンの実験へ</a>
      </p>
      <CodeBlock title="対応チェック" code={NAV_SUPPORT_CODE} />
    </section>
  );
}

/**
 * SSR 非対応の説明カードです。
 */
function SsrNote() {
  return (
    <section className="card lab-section" data-testid="ssr-note">
      <h2 className="card-title" id="limits-ssr">
        SSR には非対応
      </h2>
      <p className="muted">
        pera1 はブラウザーの Navigation API と DOM を前提とした SPA 専用です。
        サーバーサイドレンダリングには対応していません。 メタフレームワークで初期 HTML
        を返したい場合は、クライアント側で `BrowserRouter`
        をマウントしてハイドレートする構成にします。
      </p>
      <CodeBlock title="SSR の代替" code={SSR_CODE} />
    </section>
  );
}

/**
 * 404 画面の確認です。
 *
 * `notFoundComponent` は「どのルートにもマッチしなかったとき」に描画されますが、
 * `/` を前方一致の親レイアウト (`src/pages/_layout.tsx`) にすると全 URL がマッチ鎖に乗るため、
 * この構成では発火しません。実際の 404 は `_layout.tsx` が `outlet` の不在を
 * 検出して描画しています。ここではその落とし穴ごと実演します。
 */
function NotFoundDemo() {
  return (
    <section className="card lab-section" data-testid="notfound-demo">
      <h2 className="card-title" id="limits-notfound">
        404 の落とし穴 (catch-all レイアウト)
      </h2>
      <p className="muted">
        `BrowserRouter` には `notFoundComponent` を渡していますが、`/` の親レイアウト
        (`_layout.tsx`) が全 URL に前方一致するため、未マッチでもマッチ鎖が途切れず
        `notFoundComponent` は呼ばれません。このアプリでは `_layout.tsx` が `outlet === null`
        を検出して 404 を描画しています。次のリンクで実際の画面を確認できます。
      </p>
      <p>
        <a className="button" href="/does-not-exist" data-testid="notfound-link">
          /does-not-exist を開く
        </a>
      </p>
    </section>
  );
}

/**
 * ルートの遅延読み込みは標準機能ではないことを確認します。
 */
function LazyDemo() {
  const navigate = useNavigate();

  return (
    <section className="card lab-section" data-testid="lazy-demo">
      <h2 className="card-title" id="limits-lazy">
        ルート遅延読み込みは標準でない
      </h2>
      <p className="muted">
        pera1 の `component` は同期的な参照を前提としています。 `React.lazy` のラッパー (`lazyPage`)
        を併用して、チャンク分割と `Suspense` フォールバックを実現しています。
      </p>
      <div className="lab-actions">
        <button
          type="button"
          className="button"
          onClick={() => navigate("/lab/limits/heavy")}
          data-testid="lazy-navigate"
        >
          useNavigate で開く
        </button>
        <a className="button button-ghost" href="/lab/limits/heavy" data-testid="lazy-anchor">
          素の &lt;a&gt; で開く
        </a>
      </div>
      <CodeBlock title="lazyPage" code={LAZY_CODE} />
    </section>
  );
}

/**
 * 型の広がりと回避策の説明です。
 */
function TypeWidening() {
  return (
    <section className="card lab-section" data-testid="type-widening">
      <h2 className="card-title" id="limits-type-widening">
        型の広がり (params は string | undefined)
      </h2>
      <p className="muted">
        ルート定義とコンポーネントは別ファイルになりがちで、`useParams()` は
        パターンを型として知りません。そのため値は `string | undefined` になります。
        型引数にパターン文字列を渡すとキーを確定できます。
      </p>
      <CodeBlock title="useParams の型" code={TYPE_CODE} />
    </section>
  );
}

/**
 * グローバルな進行状態のライブ表示です。
 */
function NavigationStateDemo() {
  const navigation = useNavigation();

  return (
    <section className="card lab-section" data-testid="navigation-state">
      <h2 className="card-title" id="limits-navigation-state">
        グローバルな進行状態 (useNavigation)
      </h2>
      <p>
        現在の state: <strong data-testid="navigation-state-value">{navigation.state}</strong>
      </p>
      <p className="muted">
        `loading` / `submitting` / `idle` の 3 状態です。遅いローダーや遅延チャンクへ 移動すると
        `loading` を観察できます (完了すると `idle` に戻ります)。 全画面での表示は root レイアウトの
        `PendingBar` が担っています。リンクを踏むとこのセクションはアンマウントされるため、`loading`瞬間は移動先ページ上端のPendingBar（細いバー）で観察してください。
      </p>
      <ul>
        <li>
          <a href="/projects/p-router">/projects/p-router (タスク一覧のローダー)</a>
        </li>
        <li>
          <a href="/lab/limits/heavy">/lab/limits/heavy (遅延チャンクと重い描画)</a>
        </li>
      </ul>
    </section>
  );
}

/**
 * 履歴エントリー単位のキャッシュを観察します。
 */
function CacheDemo() {
  const [, bump] = React.useReducer((count: number) => count + 1, 0);
  const tasksRuns = loaderRunCount("tasks:p-router");
  const memoryHomeRuns = loaderRunCount("memory-home");
  const entryId = useRouterContext((router) => router.currentEntry.id);
  const entryUrl = useRouterContext((router) => router.currentEntry.url.href);

  return (
    <section className="card lab-section" data-testid="cache-demo">
      <h2 className="card-title" id="limits-cache">
        履歴エントリー単位のキャッシュ (限界値の観察)
      </h2>
      <p className="muted">
        ローダーの結果は履歴エントリー ID ごとに保存されます。同じ URL に戻っても、
        データは「エントリー」に紐づくため、キャッシュが再利用されればカウンターは
        増えません。再取得の可否は `shouldReload` が決めます。
      </p>
      <dl className="kv-table">
        <div>
          <dt>loaderRunCount(&quot;tasks:p-router&quot;)</dt>
          <dd data-testid="cache-count-tasks">{tasksRuns}</dd>
        </div>
        <div>
          <dt>loaderRunCount(&quot;memory-home&quot;)</dt>
          <dd data-testid="cache-count-memory">{memoryHomeRuns}</dd>
        </div>
        <div>
          <dt>現在のエントリー (id / url)</dt>
          <dd data-testid="cache-entry">
            {entryId} / {entryUrl}
          </dd>
        </div>
      </dl>
      <p className="muted">
        `memory-home` は `/lab/engine` のミニアプリ側のカウンターです。`/lab/engine`でホーム⇔Aboutを往復後にここへ戻ると変化します。
      </p>
      <ol className="lab-note">
        <li>`/projects/p-router` を開く (1 回目、カウンターが増えます)</li>
        <li>タスク詳細へ進む</li>
        <li>戻る — キャッシュ再利用でカウンターは増えません</li>
        <li>`/projects/p-router?force=1` を開く — `shouldReload` により増えます</li>
      </ol>
      <div className="lab-actions">
        <a className="button" href="/projects/p-router">
          1 回目を開く
        </a>
        <a className="button button-ghost" href="/projects/p-router?force=1">
          ?force=1 で再取得
        </a>
        <a className="button button-ghost" href="/projects/p-router/tasks/t-1">
          タスク詳細へ
        </a>
        <button type="button" className="button" onClick={bump}>
          カウンターを再読み込み
        </button>
      </div>
      <p className="lab-note">
        `bumpLoaderRun` はローダー実行時に呼ばれるカウンターです。このページは
        再レンダリングのたびに `loaderRunCount` を読み直して表示しています。
      </p>
      <CodeBlock title="shouldReload とキャッシュ" code={CACHE_CODE} />
    </section>
  );
}

/**
 * ストレスランナーの結果です。
 *
 * root レイアウトのエラーバウンダリーは `key={entryId}` で遷移のたびに
 * 作り直されるため、コンポーネントの state では結果を保持できません。
 * 再マウント後も表示できるよう、モジュールスコープに置いています。
 */
let stressNavResult: string | null = null;
let stressHistoryResult: string | null = null;
let stressDoubleSubmitResult: string | null = null;

/**
 * 連打・往復・二重送信のストレスランナーです。
 */
function StressRunner() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const path = useRoutePath();
  const [, bump] = React.useReducer((count: number) => count + 1, 0);
  const [errorCount, setErrorCount] = React.useState(0);

  // ページ内で発生した例外と未処理の rejection を数えます (0 件が正常)。
  React.useEffect(() => {
    function handleError() {
      setErrorCount((count) => count + 1);
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, []);

  function runStressNav() {
    const start = performance.now();
    for (let index = 0; index < 100; index += 1) {
      navigate(`/lab/limits?stress=${index}`, { replace: true });
    }
    stressNavResult = `100 回: ${(performance.now() - start).toFixed(1)}ms`;
    bump();
  }

  function runStressHistory() {
    // まず 3 件積んでから、戻る/進むを 50 往復します。
    navigate("/lab/limits?h=0");
    navigate("/lab/limits?h=1");
    navigate("/lab/limits?h=2");
    const start = performance.now();
    for (let index = 0; index < 50; index += 1) {
      navigate(-1);
      navigate(1);
    }
    stressHistoryResult = `50 往復 (100 回): ${(performance.now() - start).toFixed(1)}ms`;
    bump();
  }

  function runDoubleSubmit() {
    const data = new FormData();
    data.set("intent", "noop");
    // 同じ FormData を 2 回連続で送ります (URL は変わらない無害な操作)。
    submit(data);
    submit(data);
    stressDoubleSubmitResult = "送信 2 回";
    bump();
  }

  return (
    <section className="card lab-section" data-testid="stress-runner">
      <h2 className="card-title" id="limits-stress">
        ストレスランナー (限界に挑む)
      </h2>
      <p className="muted">
        高速な連続遷移と履歴の往復、二重送信を実行し、例外が出ないことを確認します。
      </p>
      <div className="stress-grid">
        <div className="lab-result">
          <button type="button" className="button" onClick={runStressNav} data-testid="stress-nav">
            100 連続 navigate
          </button>
          <p className="stress-result" data-testid="stress-nav-result">
            {stressNavResult ? `${stressNavResult} / 最終: ${path.toString()}` : "未実行"}
          </p>
        </div>
        <div className="lab-result">
          <button
            type="button"
            className="button"
            onClick={runStressHistory}
            data-testid="stress-history"
          >
            Back/Forward 50 往復
          </button>
          <p className="stress-result" data-testid="stress-history-result">
            {stressHistoryResult ? `${stressHistoryResult} / 最終: ${path.toString()}` : "未実行"}
          </p>
        </div>
        <div className="lab-result">
          <button
            type="button"
            className="button"
            onClick={runDoubleSubmit}
            data-testid="stress-double-submit"
          >
            二重送信
          </button>
          <p className="stress-result" data-testid="stress-submit-result">
            {stressDoubleSubmitResult ?? "未実行"}
          </p>
        </div>
        <div className="lab-result">
          <p className="lab-result-label">ページ内のエラー件数</p>
          <p className="stress-result" data-testid="stress-error-count">
            {errorCount} 件
          </p>
        </div>
      </div>
      <CodeBlock title="ストレスランナー" code={STRESS_CODE} />
    </section>
  );
}

/**
 * pera1 にない機能と代替手段の一覧です。
 */
function MissingFeatures() {
  const rows = [
    {
      feature: "SSR (サーバーサイドレンダリング)",
      why: "Navigation API と DOM が前提",
      alternative: "クライアントでハイドレート",
      href: null,
    },
    {
      feature: "グローバルな pending 表示",
      why: "遷移状態だけを `useNavigation` が返す",
      alternative: "PendingBar をレイアウトに置く",
      href: "/lab/limits",
    },
    {
      feature: "ルートの遅延読み込み",
      why: "`component` は同期参照のみ",
      alternative: "lazyPage (React.lazy) で包む",
      href: "/lab/limits",
    },
    {
      feature: "Navigation API 以外の既定エンジン",
      why: "対応ブラウザーが前提",
      alternative: "自作エンジンを `Router` に渡す",
      href: "/lab/engine",
    },
    {
      feature: "完全な型推論",
      why: "useParams はパターンを知らない",
      alternative: "`useParams<TPath>()` を使う",
      href: "/lab/limits",
    },
    {
      feature: "楽観的更新 (optimistic UI)",
      why: "アクション完了後に再取得する設計",
      alternative: "手動でローカル状態を持つ",
      href: "/lab/core",
    },
  ] as const;

  return (
    <section className="card lab-section" data-testid="missing-features">
      <h2 className="card-title" id="limits-missing-features">
        このパッケージにない機能
      </h2>
      <p className="muted">
        pera1 は小さい API 面を保つために、いくつかの機能を意図的に持っていません。
        実務では次の代替手段を組み合わせます。
      </p>
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label="このパッケージにない機能"
      >
        <table className="table">
          <thead>
            <tr>
              <th scope="col">ない機能</th>
              <th scope="col">理由</th>
              <th scope="col">代替手段</th>
              <th scope="col">リンク</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td>{row.why}</td>
                <td>{row.alternative}</td>
                <td>{row.href ? <a href={row.href}>実演へ</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * pera1 の限界を実演するページです。
 *
 * `/lab/limits` (`lab/limits/_index.tsx`) と `/lab/limits/heavy`
 * (`lab/limits/heavy.tsx`) はどちらも Lab レイアウト直下の兄弟ルートです。
 * heavy は limits の子にはならず、遅延チャンクとして読み込まれます。
 */
export default function LabLimitsPage() {
  return (
    <div className="lab-page">
      <nav aria-label="このページの目次" className="lab-actions">
        <a href="#limits-nav-support">Navigation API が必須</a>
        <a href="#limits-ssr">SSR には非対応</a>
        <a href="#limits-notfound">404 の落とし穴 (catch-all レイアウト)</a>
        <a href="#limits-lazy">ルート遅延読み込みは標準でない</a>
        <a href="#limits-type-widening">型の広がり (params は string | undefined)</a>
        <a href="#limits-navigation-state">グローバルな進行状態 (useNavigation)</a>
        <a href="#limits-cache">履歴エントリー単位のキャッシュ (限界値の観察)</a>
        <a href="#limits-stress">ストレスランナー (限界に挑む)</a>
        <a href="#limits-missing-features">このパッケージにない機能</a>
      </nav>
      <NavSupportDemo />
      <SsrNote />
      <NotFoundDemo />
      <LazyDemo />
      <TypeWidening />
      <NavigationStateDemo />
      <CacheDemo />
      <StressRunner />
      <MissingFeatures />
    </div>
  );
}
