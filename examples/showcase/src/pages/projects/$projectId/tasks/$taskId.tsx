import {
  type ActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useFormAction,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@pera1/react";
import * as React from "react";

import { listUsers } from "../../../../api/auth.js";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "../../../../api/db.js";
import { findProject } from "../../../../api/projects.js";
import { deleteTask, findTask, updateTaskStatus } from "../../../../api/tasks.js";
import { ProjectHeaderSkeleton } from "../../../../components/skeleton.js";

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
 * `intent` だけを持つボタン送信用のフォームデータを作ります。
 */
function intentFormData(intent: string): FormData {
  const formData = new FormData();
  formData.set("intent", intent);

  return formData;
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
 * タスク詳細の表示に必要なデータを返します。
 *
 * タスクが見つからないときは想定外の URL として例外を投げ、エラーバウンダリーに委ねます。
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const taskId = params["taskId"];
  if (taskId === undefined) {
    throw new Error("taskId が指定されていません。");
  }

  const task = await findTask(taskId);
  if (task === undefined) {
    throw new Error(`タスク「${taskId}」が見つかりません。`);
  }

  const [project, users] = await Promise.all([findProject(task.projectId), listUsers()]);
  const assignee =
    task.assigneeId === undefined ? undefined : users.find((user) => user.id === task.assigneeId);

  return { task, project, assignee };
}

/**
 * タスクの完了・再開・削除を処理します。
 *
 * 削除だけは対象プロジェクトのタスク一覧へリダイレクトし、それ以外は同じ画面に
 * `{ ok: true }` を返して表示を更新します。
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const taskId = params["taskId"];
  if (taskId === undefined) {
    throw new Error("taskId が指定されていません。");
  }

  const intent = String(request.formData.get("intent") ?? "");

  if (intent === "delete") {
    // 削除後の遷移先を決めるため、削除前に所属プロジェクトを特定します。
    const task = await findTask(taskId);
    if (task === undefined) {
      return { error: "タスクが見つかりません。" };
    }

    await deleteTask(taskId);

    return redirect(`/projects/${task.projectId}`);
  }

  if (intent === "done" || intent === "reopen") {
    const status: TaskStatus = intent === "done" ? "done" : "todo";
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
      <p className="error-text" role="alert">
        {data.error}
      </p>
    );
  }
  if (data) {
    return (
      <p className="success-text" role="status">
        反映しました
      </p>
    );
  }

  return null;
}

/**
 * 直前に表示したタスク詳細 (`task.id`) です。
 *
 * search.tsx の `lastSearchConditions` と同じ考え方で、表示対象のタスクが
 * 変わった遷移のときだけ見出しへフォーカスし、初回表示では奪いません。
 * `RootLayout` のエラーバウンダリーが履歴エントリー ID を `key` にしているため、
 * 遷移のたびにこのコンポーネントは作り直され、`ref` では初回かどうかを
 * 跨いで覚えられないのでモジュールスコープに置きます。
 */
const lastTaskDetailKey: { key: string | null } = { key: null };

/**
 * パンくずの動的部分（プロジェクトリンク＋現在地）だけを描画します。
 *
 * 親で読むとパンくずの静的部分まで消えるため、子に分けて `Suspense` の内側で読みます。
 */
function TaskBreadcrumbRest() {
  const { task, project } = React.use(useLoaderData<typeof loader>());

  return (
    <>
      <li>
        <a href={`/projects/${task.projectId}`}>{project?.name ?? "不明なプロジェクト"}</a>
      </li>
      <li aria-hidden="true">/</li>
      <li>
        <span aria-current="page">{task.title}</span>
      </li>
    </>
  );
}

/**
 * タスク名の見出しだけを描画します。フォーカス管理もここで行います。
 */
function TaskTitle() {
  const { task } = React.use(useLoaderData<typeof loader>());

  // 遷移後のフォーカス管理: 表示対象のタスクが変わったときだけ見出しへ移し、
  // 初回表示では奪いません (search.tsx の headingRef パターンを踏襲)。
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    const key = task.id;
    const changed = lastTaskDetailKey.key !== null && lastTaskDetailKey.key !== key;
    lastTaskDetailKey.key = key;

    if (changed) {
      headingRef.current?.focus();
    }
  }, [task.id]);

  return (
    <h1 id="task-detail-title" className="page-title" tabIndex={-1} ref={headingRef}>
      {task.title}
    </h1>
  );
}

/**
 * タスクの詳細カードだけを描画します。
 */
function TaskDetailBody() {
  const { task, assignee } = React.use(useLoaderData<typeof loader>());

  return (
    <section className="card" aria-labelledby="task-detail-heading">
      <h2 id="task-detail-heading" className="card-title">
        タスクの詳細
      </h2>
      <dl className="detail-list" data-testid="task-detail">
        <dt>ステータス</dt>
        <dd>
          <span className={`badge ${STATUS_BADGE[task.status]}`}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </dd>
        <dt>優先度</dt>
        <dd>
          <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        </dd>
        <dt>担当者</dt>
        <dd>{assignee?.name ?? "なし"}</dd>
        <dt>作成日時</dt>
        <dd>
          <time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString("ja-JP")}</time>
        </dd>
        <dt>添付ファイル</dt>
        <dd>
          {task.attachment
            ? `${task.attachment.name}（${formatBytes(task.attachment.size)}）`
            : "なし"}
        </dd>
      </dl>
    </section>
  );
}

/**
 * `/projects/:projectId/tasks/:taskId` のタスク詳細ページです。
 *
 * 完了・再開・削除の各ボタンは `useSubmit` でフォームデータを送ります。
 * 削除時はアクションがリダイレクトを返すため、この画面はそのまま置き換わります。
 * ボタン群は `Suspense` の外に置き、パンくず・見出し・詳細だけをスケルトンで
 * 穴埋めします（ポップコーン UI）。
 */
export default function TaskDetailPage() {
  const formAction = useFormAction();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <section className="stack">
      <nav className="breadcrumb" aria-label="タスクのパンくず" data-testid="project-breadcrumb">
        <ol>
          <li>
            <a href="/projects">プロジェクト一覧</a>
          </li>
          <li aria-hidden="true">/</li>
          <React.Suspense
            fallback={
              <li aria-hidden="true">
                <span className="skeleton" style={{ width: "10rem", height: "1.25rem" }} />
              </li>
            }
          >
            <TaskBreadcrumbRest />
          </React.Suspense>
        </ol>
      </nav>

      <div>
        <React.Suspense
          fallback={
            <span className="skeleton" style={{ width: "14rem", height: "2.5rem" }} aria-hidden="true" />
          }
        >
          <TaskTitle />
        </React.Suspense>
      </div>

      <React.Suspense fallback={<ProjectHeaderSkeleton />}>
        <TaskDetailBody />
      </React.Suspense>

      <div className="cluster">
        <button
          type="button"
          className="button button-primary"
          data-testid="task-done"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          onClick={() => submit(intentFormData("done"), { action: formAction })}
        >
          完了にする
        </button>
        <button
          type="button"
          className="button"
          data-testid="task-reopen"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          onClick={() => submit(intentFormData("reopen"), { action: formAction })}
        >
          未着手へ戻す
        </button>
        <button
          type="button"
          className="button button-danger"
          data-testid="task-delete"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          onClick={() => submit(intentFormData("delete"), { action: formAction })}
        >
          削除
        </button>
      </div>
      <TaskActionFeedback />
    </section>
  );
}
