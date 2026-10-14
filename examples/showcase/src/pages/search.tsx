import { type LoaderFunctionArgs, useLoaderData, useRoutePath, useSubmit } from "@pera1/react";
import * as React from "react";

import { TASK_STATUS_LABELS, type TaskStatus } from "../api/db.js";
import { listProjects } from "../api/projects.js";
import { searchTasks } from "../api/tasks.js";
import { SearchResultsSkeleton } from "../components/skeleton.js";

/**
 * ステータスに対応するバッジのクラスです。
 */
const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "badge-info",
  doing: "badge-warning",
  done: "badge-success",
};

const STATUS_OPTIONS: readonly TaskStatus[] = ["todo", "doing", "done"];

/**
 * 全プロジェクトをまたいでタスクを検索します。
 *
 * 結果の各タスクには表示用のプロジェクト名を添えます。件数は `results` の長さから
 * そのまま数えます (`total`)。
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const q = (request.url.searchParams.get("q") ?? "").trim();
  const rawStatus = request.url.searchParams.get("status");
  const status: TaskStatus | undefined =
    rawStatus === "todo" || rawStatus === "doing" || rawStatus === "done" ? rawStatus : undefined;

  const [tasks, projects] = await Promise.all([searchTasks({ status, query: q }), listProjects()]);

  const projectNameById = new Map(projects.map((project) => [project.id, project.name] as const));
  const results = tasks.map((task) => ({
    task,
    projectName: projectNameById.get(task.projectId) ?? "不明なプロジェクト",
  }));

  return { q, status, results, total: results.length };
}

/**
 * 直前に画面へ適用した検索条件 (`status:q`) です。
 *
 * `RootLayout` のエラーバウンダリーが履歴エントリー ID を `key` にしているため、
 * 検索のたびにこのコンポーネントは作り直され、`ref` では「初回表示かどうか」を
 * 跨いで覚えられません。モジュールスコープに置くことで、条件が変わった遷移の
 * ときだけ見出しへフォーカスし、初回表示では奪わないようにします。
 */
const lastSearchConditions: { key: string | null } = { key: null };

/**
 * URL から同期で読める初期条件です。
 *
 * 親で `useLoaderData` を読むと親ごと suspend してフォームまで消えるため、
 * フォームの `defaultValue` と `key` は URL（`useRoutePath`）から導きます。
 * ローダーの結果（件数・一覧）は子の `SearchResults` だけが読みます。
 */
function useInitialSearchConditions(): { initialQ: string; initialStatus: string } {
  const path = useRoutePath();
  const initialQ = (path.searchParams.get("q") ?? "").trim();
  const rawStatus = path.searchParams.get("status");
  const initialStatus =
    rawStatus === "todo" || rawStatus === "doing" || rawStatus === "done" ? rawStatus : "";

  return { initialQ, initialStatus };
}

/**
 * 検索結果（件数＋リスト／空状態）だけを描画します。
 *
 * ローダー読みはこの子に限定し、親のフォーム・見出し・保存検索チップは
 * suspend させません。`search-count`・空状態の文言は維持します。
 */
function SearchResults() {
  const { q, results, total } = React.use(useLoaderData<typeof loader>());

  return (
    <>
      <p className="muted" aria-live="polite" data-testid="search-count">
        全 {total} 件
      </p>

      {q === "" ? <p className="muted">キーワードを入力してください。</p> : null}

      {results.length === 0 ? (
        <div className="empty-state" role="status">条件に一致するタスクがありません。</div>
      ) : (
        <ul className="list">
          {results.map(({ task, projectName }) => (
            <li key={task.id} className="list-item">
              <a href={`/projects/${task.projectId}/tasks/${task.id}`}>{task.title}</a>
              <span className={`badge ${STATUS_BADGE[task.status]}`}>
                {TASK_STATUS_LABELS[task.status]}
              </span>
              <span className="muted">{projectName}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * 検索ページです。
 *
 * 検索条件は GET の `useSubmit` で更新し、クエリーの変化が既定の再取得条件になります。
 * 条件が変わったときは見出しへフォーカスを移し、読み上げにも変化を伝えます。
 * フォーム・見出し・保存検索チップは `Suspense` の外に置き、結果部だけを
 * `SearchResultsSkeleton` で穴埋めします（ポップコーン UI）。
 */
export default function SearchPage() {
  const submit = useSubmit();
  const path = useRoutePath();
  const { initialQ, initialStatus } = useInitialSearchConditions();

  // 遷移後のフォーカス管理: 条件が変わるたびに見出しへ移し、初回表示では奪いません。
  // URL 由来の条件で判定するため、ローダーの解決を待ちません。
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    const key = `${initialStatus}:${initialQ}`;
    const changed = lastSearchConditions.key !== null && lastSearchConditions.key !== key;
    lastSearchConditions.key = key;

    if (changed) {
      headingRef.current?.focus();
    }
  }, [initialQ, initialStatus]);

  return (
    <section className="stack" aria-labelledby="search-heading">
      <div>
        <h1
          id="search-heading"
          className="page-title"
          tabIndex={-1}
          ref={headingRef}
          data-testid="search-heading"
        >
          検索
        </h1>
        <p className="page-lead">
          タスク名のキーワードとステータスで全プロジェクトを横断検索します。
        </p>
      </div>

      <form
        key={`${initialStatus}:${initialQ}`}
        className="toolbar"
        data-testid="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const params = new URLSearchParams();
          const query = String(formData.get("q") ?? "").trim();
          const nextStatus = String(formData.get("status") ?? "");
          if (query !== "") {
            params.set("q", query);
          }
          if (nextStatus !== "") {
            params.set("status", nextStatus);
          }

          submit(params, { replace: true });
        }}
      >
        <label className="field">
          キーワード
          <input className="input" name="q" defaultValue={initialQ} placeholder="例: テスト" />
        </label>
        <label className="field">
          ステータス
          <select className="select" name="status" defaultValue={initialStatus}>
            <option value="">すべて</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {TASK_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button button-primary">
          検索
        </button>
      </form>

      <p className="muted">
        <span className="badge">開発者向けメモ</span> 共有用URLのパス:{" "}
        <code data-testid="route-path">{`${path.pathname}${path.search}`}</code>
      </p>

      <section aria-label="保存済みの条件の一覧">
        <h2 id="saved-search-heading">
          保存された検索
        </h2>
        <div className="cluster">
          <a className="chip" href="/search?q=pera1&status=todo">
            q=pera1 &amp; status=todo
          </a>
          <a className="chip" href="/search?q=テスト">
            q=テスト
          </a>
          <a className="chip" href="/search?status=done">
            status=done
          </a>
          <a className="chip" href="/search">
            条件なし
          </a>
        </div>
      </section>

      <React.Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults />
      </React.Suspense>
    </section>
  );
}
