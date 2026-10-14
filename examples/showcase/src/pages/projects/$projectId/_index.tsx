import {
  type ActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type ShouldReloadFunctionArgs,
  useActionData,
  useFormAction,
  useLoaderData,
  useNavigation,
  useParams,
  useRoutePath,
  useSubmit,
} from "@pera1/react";
import * as React from "react";

import { listUsers } from "../../../api/auth.js";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  db,
  type TaskPriority,
  type TaskStatus,
} from "../../../api/db.js";
import { bumpLoaderRun } from "../../../api/metrics.js";
import {
  createTask,
  deleteTask,
  findTask,
  listTasks,
  updateTaskStatus,
} from "../../../api/tasks.js";
import { TaskListSkeleton } from "../../../components/skeleton.js";

/**
 * セレクトボックスの選択肢です。表示文言は API 層のラベル定数を使います。
 */
const STATUS_OPTIONS: readonly TaskStatus[] = ["todo", "doing", "done"];
const PRIORITY_OPTIONS: readonly TaskPriority[] = ["low", "normal", "high"];

/**
 * ステータスと優先度に対応するバッジのクラスです。
 */
const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "badge-info",
  doing: "badge-warning",
  done: "badge-success",
};
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "badge",
  normal: "badge-info",
  high: "badge-danger",
};

/**
 * クエリーの値をステータスとして検証します。許可された値以外は「指定なし」として扱います。
 */
function parseStatus(value: string | null): TaskStatus | undefined {
  return value === "todo" || value === "doing" || value === "done" ? value : undefined;
}

/**
 * 添付ファイルのサイズを読みやすい表記にします。
 */
function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

/**
 * プロジェクト内のタスク一覧を返します。
 *
 * 実行回数は「履歴エントリー単位のキャッシュ」の教材です。戻る・進むで再取得が
 * 起こらないときは回数が増えず、`?force=1` や POST の後は増えます。
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const projectId = params["projectId"];
  if (projectId === undefined) {
    throw new Error("projectId が指定されていません。");
  }

  const status = parseStatus(request.url.searchParams.get("status"));
  const q = (request.url.searchParams.get("q") ?? "").trim();
  const runCount = bumpLoaderRun(`tasks:${projectId}`);

  const [tasks, users] = await Promise.all([
    listTasks(projectId, { status, query: q }),
    listUsers(),
  ]);

  return { tasks, users, runCount, filters: { status, q } };
}

/**
 * タスク一覧の再取得条件をカスタマイズします。
 *
 * - GET: `?force=1` が付いていれば常に再取得し、それ以外は既定の判定に従います。
 * - POST: データ更新直後のため既定の判定 (常に `true`) に従います。
 */
export function shouldReload(args: ShouldReloadFunctionArgs): boolean {
  if (args.triggerMethod === "GET") {
    return args.currentUrl.searchParams.get("force") === "1" ? true : args.defaultShouldReload;
  }

  return args.defaultShouldReload;
}

/**
 * タスクの追加・削除・状態変更を処理します。
 *
 * 入力不備は `{ error }`、成功は `{ ok: true }` を返します。成功後に画面遷移は
 * しませんが、POST 後の既定の再取得で一覧が最新化されます。
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const projectId = params["projectId"];
  if (projectId === undefined) {
    throw new Error("projectId が指定されていません。");
  }

  const formData = request.formData;
  const intent = String(formData.get("intent") ?? "");

  if (intent === "add") {
    const title = String(formData.get("title") ?? "").trim();
    if (title === "") {
      return { error: "タスク名を入力してください。" };
    }
    if (title.length > 200) {
      return { error: "タスク名が長すぎます。" };
    }

    if (!db.projects.has(projectId)) {
      return { error: "プロジェクトが見つかりません。" };
    }

    const rawPriority = String(formData.get("priority") ?? "");
    const priority: TaskPriority =
      rawPriority === "low" || rawPriority === "high" ? rawPriority : "normal";

    const rawAssignee = String(formData.get("assigneeId") ?? "");
    const assigneeId = rawAssignee === "" ? undefined : rawAssignee;
    if (assigneeId !== undefined && !db.users.has(assigneeId)) {
      return { error: "担当者が見つかりません。" };
    }

    const file = formData.get("attachment");
    const attachment =
      file instanceof File && file.size > 0 ? { name: file.name, size: file.size } : undefined;
    if (attachment !== undefined) {
      if (attachment.name.length > 100) {
        return { error: "添付ファイル名が長すぎます。" };
      }
      if (attachment.size > 5 * 1024 * 1024) {
        return { error: "添付ファイルが大きすぎます。" };
      }
    }

    try {
      await createTask(projectId, title, priority, attachment, assigneeId);
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "タスクの作成に失敗しました。" };
    }

    return { ok: true };
  }

  if (intent === "delete") {
    const taskId = String(formData.get("taskId") ?? "");
    if (taskId === "") {
      return { error: "削除するタスクが指定されていません。" };
    }

    const task = await findTask(taskId);
    if (task === undefined || task.projectId !== projectId) {
      return { error: "タスクが見つかりません。" };
    }

    const deleted = await deleteTask(taskId);
    if (!deleted) {
      return { error: "タスクが見つかりません。" };
    }

    return { ok: true };
  }

  if (intent === "status") {
    const taskId = String(formData.get("taskId") ?? "");
    const status = parseStatus(String(formData.get("status") ?? ""));
    if (taskId === "" || status === undefined) {
      return { error: "タスクと変更後の状態を指定してください。" };
    }

    const task = await findTask(taskId);
    if (task === undefined || task.projectId !== projectId) {
      return { error: "タスクが見つかりません。" };
    }

    const updated = await updateTaskStatus(taskId, status);
    if (updated === undefined) {
      return { error: "タスクが見つかりません。" };
    }

    return { ok: true };
  }

  return { error: "不明な操作です。" };
}

/**
 * アクション結果の表示です。`React.use` を呼ぶ部分を子コンポーネントに分けます。
 */
function TaskActionFeedback() {
  const actionData = useActionData<typeof action>();
  if (!actionData || actionData.status !== "fulfilled") {
    return null;
  }

  return <TaskActionFeedbackText actionData={actionData} />;
}

/**
 * アクション結果の本文です。
 */
function TaskActionFeedbackText({
  actionData,
}: {
  readonly actionData: ActionData<typeof action>;
}) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p className="error-text" role="alert" data-testid="task-create-error">
        {data.error}
      </p>
    );
  }
  if (data) {
    return (
      <p className="success-text" role="status" data-testid="task-action-ok">
        反映しました
      </p>
    );
  }

  return null;
}

/**
 * URL から同期で読める絞り込み条件です。
 *
 * 親でローダーを読むとツールバーまで巻き添えで消えるため、`defaultValue` と
 * `key` は `useRoutePath` から導きます。一覧の実データは子の `TaskListSection`
 * だけが読みます。
 */
function useInitialFilters(): { initialQ: string; initialStatus: string } {
  const path = useRoutePath();
  const initialQ = (path.searchParams.get("q") ?? "").trim();
  const rawStatus = path.searchParams.get("status");
  const initialStatus =
    rawStatus === "todo" || rawStatus === "doing" || rawStatus === "done" ? rawStatus : "";

  return { initialQ, initialStatus };
}

/**
 * タスク一覧（実行回数＋カード）だけを描画します。
 *
 * `tasks-loader-runs`・`task-row-*` の testid は維持します。
 */
function TaskListSection() {
  const { projectId } = useParams<"/projects/:projectId">();
  const { tasks, users, runCount } = React.use(useLoaderData<typeof loader>());
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const userNameById = new Map(users.map((user) => [user.id, user.name] as const));

  return (
    <>
      <p className="muted">
        ローダー実行回数: <strong data-testid="tasks-loader-runs">{runCount}</strong>
      </p>
      <p className="muted" aria-live="polite" data-testid="task-filter-count">
        全 {tasks.length} 件
      </p>

      <section className="card" aria-labelledby="task-list-heading">
        <h2 id="task-list-heading" className="card-title">
          タスク一覧
        </h2>
        {tasks.length === 0 ? (
          <div className="empty-state" role="status">条件に一致するタスクがありません。</div>
        ) : (
          <ul className="task-list" data-testid="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-row" data-testid={`task-row-${task.id}`}>
                <div className="task-main">
                  <a className="task-title" href={`/projects/${projectId}/tasks/${task.id}`}>
                    {task.title}
                  </a>
                  <div className="cluster">
                    <span
                      className={`badge ${STATUS_BADGE[task.status]}`}
                      data-testid={`task-status-${task.id}`}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                    <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>
                      優先度: {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className="muted">
                      担当:{" "}
                      {task.assigneeId === undefined
                        ? "なし"
                        : (userNameById.get(task.assigneeId) ?? "不明")}
                    </span>
                    {task.attachment ? (
                      <span className="muted">
                        添付: {task.attachment.name}（{formatBytes(task.attachment.size)}）
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="task-actions">
                  <form
                    className="cluster"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      formData.set("intent", "status");
                      formData.set("taskId", task.id);
                      submit(formData);
                    }}
                  >
                    <select
                      className="select"
                      name="status"
                      defaultValue={task.status}
                      aria-label={`${task.title} の状態`}
                      data-testid={`task-status-select-${task.id}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="button"
                      data-testid={`task-status-update-${task.id}`}
                      disabled={isSubmitting}
                      aria-disabled={isSubmitting}
                    >
                      更新
                    </button>
                  </form>
                  <button
                    type="button"
                    className="button button-danger"
                    data-testid={`task-delete-${task.id}`}
                    disabled={isSubmitting}
                    aria-disabled={isSubmitting}
                    onClick={() => {
                      const formData = new FormData();
                      formData.set("intent", "delete");
                      formData.set("taskId", task.id);
                      submit(formData);
                    }}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * タスク追加フォームだけを描画します。
 *
 * 担当者一覧はローダーから読むため、子に分けて `Suspense` で読みます。
 * ツールバーと同様、親は suspend させません。
 */
function TaskCreateSection() {
  const { users } = React.use(useLoaderData<typeof loader>());
  const formAction = useFormAction();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <form
      className="card form-stack"
      method="post"
      action={formAction}
      data-testid="task-create-form"
    >
      <h2 className="card-title">タスクを追加</h2>
      <input type="hidden" name="intent" value="add" />
      <div className="form-row">
        <label className="field">
          タスク名
          <input className="input" name="title" placeholder="例: レビューを依頼する" />
        </label>
        <label className="field">
          優先度
          <select className="select" name="priority" defaultValue="normal">
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          担当者
          <select className="select" name="assigneeId" defaultValue="">
            <option value="">担当なし</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          添付ファイル
          <input className="input" type="file" name="attachment" />
        </label>
      </div>
      <button
        type="submit"
        className="button button-primary"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
      >
        追加する
      </button>
    </form>
  );
}

/**
 * `/projects/:projectId` のタスク一覧ページです。
 *
 * フィルターは GET の `useSubmit`、追加・状態変更・削除は POST の `useSubmit` で送ります。
 * どちらも送信先は現在のルート (`useFormAction`) です。
 * ツールバーフォームは `Suspense` の外に置き、一覧だけを `TaskListSkeleton` で
 * 穴埋めします。「更新中…」のテキストバナーはやめ、カード上の薄いプログレス表示
 * （`aria-busy`＋`visually-hidden` の status）にします。
 */
export default function ProjectPage() {
  const { projectId } = useParams<"/projects/:projectId">();
  const submit = useSubmit();
  const navigation = useNavigation();
  const { initialQ, initialStatus } = useInitialFilters();

  const isBusy = navigation.state !== "idle";

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const query = String(formData.get("q") ?? "").trim();
    const status = String(formData.get("status") ?? "");
    if (query !== "") {
      params.set("q", query);
    }
    if (status !== "") {
      params.set("status", status);
    }

    submit(params, { replace: true });
  }

  function handleFilterReset() {
    submit(new URLSearchParams(), { replace: true });
  }

  return (
    <section className="stack">
      <form
        key={`${initialStatus}:${initialQ}`}
        className="toolbar"
        data-testid="toolbar"
        aria-busy={isBusy}
        onSubmit={handleFilterSubmit}
      >
        <label className="field">
          キーワード
          <input
            className="input"
            name="q"
            defaultValue={initialQ}
            placeholder="タスク名で絞り込む"
          />
        </label>
        <label className="field">
          ステータス
          <select className="select" name="status" defaultValue={initialStatus}>
            <option value="">すべて</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button button-primary" data-testid="filter-submit">
          絞り込む
        </button>
        <button
          type="button"
          className="button button-ghost"
          data-testid="filter-reset"
          onClick={handleFilterReset}
        >
          リセット
        </button>
        {isBusy ? (
          // レイアウトのガタつき防止のため、フロー外のオーバーレイで重ねる。
          // テキストは visually-hidden（占有高さゼロ）、バーは絶対配置で
          // フォームの高さを変えない。
          <span role="status" className="toolbar-progress">
            <span className="visually-hidden">更新中…</span>
            <span className="pending-bar-inline" aria-hidden="true">
              <span className="pending-bar-fill" />
            </span>
          </span>
        ) : null}
      </form>

      <TaskActionFeedback />

      <React.Suspense fallback={<TaskListSkeleton />}>
        <TaskListSection />
      </React.Suspense>

      <React.Suspense
        fallback={
          <div role="status">
            <span className="visually-hidden">タスク追加フォームを読み込み中</span>
            <div className="card form-stack" aria-hidden="true" style={{ minHeight: "16rem" }}>
              <span className="skeleton" style={{ width: "8rem", height: "1.5rem" }} />
              <span className="skeleton" style={{ width: "100%", height: "3rem" }} />
              <span className="skeleton" style={{ width: "60%", height: "3rem" }} />
            </div>
          </div>
        }
      >
        <TaskCreateSection />
      </React.Suspense>

      <section className="card" aria-labelledby="reload-note-heading">
        <h3 id="reload-note-heading" className="card-title">
          再取得の仕組み
        </h3>
        <p>
          追加・変更・削除後は一覧が自動で最新になります。{" "}
          <span className="badge">開発者向けメモ</span> 以下は再取得の実装メモです。
        </p>
        <p className="muted">
          POST（追加・状態変更・削除）の後は `shouldReload` の既定値が真になるため、必ずローダーが
          再実行されます (上の「ローダー実行回数」が増えます)。
        </p>
        <p className="muted">
          GET では既定の判定が使われますが、{" "}
          <a href={`/projects/${projectId}?force=1`} data-testid="force-reload-link">
            ?force=1 付きのリンク
          </a>{" "}
          を開くと強制的に再取得します。
        </p>
      </section>
    </section>
  );
}
