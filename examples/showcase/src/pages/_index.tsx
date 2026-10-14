import { useLoaderData, useNavigate } from "@pera1/react";
import * as React from "react";

import { getCurrentUser, listUsers } from "../api/auth.js";
import { TASK_STATUS_LABELS, type TaskStatus } from "../api/db.js";
import { searchTasks, summarize } from "../api/tasks.js";
import { StatGridSkeleton, TaskListSkeleton } from "../components/skeleton.js";

/**
 * ステータスに対応するバッジのクラスです。
 */
const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "badge-info",
  doing: "badge-warning",
  done: "badge-success",
};

/**
 * ダッシュボードに表示するデータをまとめて取得します。
 *
 * 統計と最近のタスクは並列に取得し、担当者名の解決のためにユーザー一覧も添えます。
 */
export async function loader() {
  const [stats, allTasks, users] = await Promise.all([summarize(), searchTasks({}), listUsers()]);

  return {
    stats,
    recent: allTasks.slice(0, 5),
    users,
    currentUser: getCurrentUser(),
  };
}

/**
 * 導入文（ようこそ…）だけを描画します。
 *
 * 親で `React.use` すると見出しまで巻き添えで消えるため、子に分けて
 * 小さな `Suspense` で読みます。
 */
function DashboardLead() {
  const { currentUser } = React.use(useLoaderData<typeof loader>());
  const userName = currentUser?.name ?? "ゲスト";

  return (
    <p className="page-lead">
      ようこそ、{userName}さん。担当タスクの状況と、チームのプロジェクトの進み具合をひと目で確かめられます。
    </p>
  );
}

/**
 * 統計カードだけを描画します。`stat-*` の testid は維持します。
 */
function DashboardStats() {
  const { stats } = React.use(useLoaderData<typeof loader>());

  return (
    <div className="stat-grid">
      <div className="stat-card" data-testid="stat-projects">
        <span className="stat-value">{stats.projectCount}</span>
        <span className="stat-label">プロジェクト</span>
      </div>
      <div className="stat-card" data-testid="stat-tasks">
        <span className="stat-value">{stats.taskCount}</span>
        <span className="stat-label">タスク総数</span>
      </div>
      <div className="stat-card" data-testid="stat-open">
        <span className="stat-value">{stats.openTaskCount}</span>
        <span className="stat-label">未完了タスク</span>
      </div>
      <div className="stat-card" data-testid="stat-done">
        <span className="stat-value">{stats.doneTaskCount}</span>
        <span className="stat-label">完了タスク</span>
      </div>
    </div>
  );
}

/**
 * 最近のタスクだけを描画します。見出し「最近のタスク」は維持します。
 */
function RecentTasks() {
  const { recent, users } = React.use(useLoaderData<typeof loader>());
  const userNameById = new Map(users.map((user) => [user.id, user.name] as const));

  return (
    <section className="card" aria-labelledby="recent-tasks-heading">
      <h2 id="recent-tasks-heading" className="card-title">
        最近のタスク
      </h2>
      {recent.length === 0 ? (
        <p className="muted" role="status">まだタスクがありません。</p>
      ) : (
        <ul className="list">
          {recent.map((task) => (
            <li key={task.id} className="list-item">
              <a href={`/projects/${task.projectId}/tasks/${task.id}`}>{task.title}</a>
              <span className={`badge ${STATUS_BADGE[task.status]}`}>
                {TASK_STATUS_LABELS[task.status]}
              </span>
              <span className="muted">
                担当:{" "}
                {task.assigneeId === undefined
                  ? "なし"
                  : (userNameById.get(task.assigneeId) ?? "不明")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * アプリの入口となるダッシュボードです。
 *
 * 統計カード、最近のタスク、`useNavigate` の各呼び出し形式を試す導線を並べます。
 * 見出し・クイック操作・Lab 導線は `Suspense` の外に置き、統計と最近のタスクだけを
 * それぞれのスケルトンで穴埋めします（ポップコーン UI）。
 */
export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <section className="stack" aria-labelledby="dashboard-heading">
      <div>
        <h1 id="dashboard-heading" className="page-title">
          ダッシュボード
        </h1>
        <React.Suspense
          fallback={
            <p className="page-lead" aria-hidden="true">
              <span className="skeleton" style={{ width: "70%", height: "1.5rem" }} />
            </p>
          }
        >
          <DashboardLead />
        </React.Suspense>
      </div>

      <React.Suspense fallback={<StatGridSkeleton />}>
        <DashboardStats />
      </React.Suspense>

      <div className="split-grid">
        <React.Suspense fallback={<TaskListSkeleton />}>
          <RecentTasks />
        </React.Suspense>

        <section className="card" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="card-title">
            クイック操作
          </h2>
          <div className="cluster">
            <button type="button" className="button" onClick={() => navigate("/projects")}>
              プロジェクト一覧へ
            </button>
            <button
              type="button"
              className="button"
              data-testid="navigate-functional"
              onClick={() =>
                navigate((path) => {
                  path.pathname = "/search";
                  path.searchParams.set("q", "pera1");
                })
              }
            >
              「pera1」を検索する
            </button>
            <button
              type="button"
              className="button"
              data-testid="navigate-object"
              onClick={() => navigate({ search: "?from=quick" })}
            >
              共有用クエリーを付けて開き直す
            </button>
            <button type="button" className="button button-ghost" onClick={() => navigate(-1)}>
              戻る
            </button>
          </div>
          <p className="cluster">
            <a href="/projects/new">新しいプロジェクト</a>
            <a href="/login">ログイン</a>
          </p>
        </section>
      </div>

      <aside className="card" aria-labelledby="lab-link-heading">
        <p>
          <span className="badge">開発者向け</span>
        </p>
        <h2 id="lab-link-heading" className="card-title">
          ルーター実験室（Lab）
        </h2>
        <p className="muted">
          Pera Tasks を動かしているルーター「pera1」の仕組みを、その場で試せる開発者向けの実験室です。
          マッチングの検証、自作エンジンの動作確認、負荷テストなどをまとめています。
        </p>
        <p>
          <a className="button" href="/lab">
            Lab を開く
          </a>
        </p>
      </aside>
    </section>
  );
}
