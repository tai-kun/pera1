import {
  type ActionData,
  useActionData,
  useFormAction,
  useLoaderData,
  useNavigation,
} from "@pera1/react";
import * as React from "react";

import type { action as projectsAction, loader as projectsLoader } from "./_layout.js";
import { ProjectListSkeleton } from "../../components/skeleton.js";

/**
 * 作成フォームのエラー表示です。
 *
 * `useActionData` はアクション未実行の履歴エントリーでは `undefined` を返すため、
 * `React.use` を呼ぶ部分を子コンポーネントへ分けます。
 */
function CreateProjectError() {
  const actionData = useActionData<typeof projectsAction>();
  if (!actionData || actionData.status !== "fulfilled") {
    return null;
  }

  return <CreateProjectErrorText actionData={actionData} />;
}

/**
 * 作成フォームのエラー本文です。
 */
function CreateProjectErrorText({
  actionData,
}: {
  readonly actionData: ActionData<typeof projectsAction>;
}) {
  const data = React.use(actionData);
  if (data && "error" in data) {
    return (
      <p className="error-text" role="alert" data-testid="project-create-error">
        {data.error}
      </p>
    );
  }

  return null;
}

/**
 * プロジェクトの一覧だけを描画します。
 *
 * ローダー読みはこの子に限定し、親の作成フォームは suspend させません。
 */
function ProjectList() {
  const { projects, users } = React.use(useLoaderData<typeof projectsLoader>());
  const userNameById = new Map(users.map((user) => [user.id, user.name] as const));

  return (
    <div className="stack" data-testid="project-list">
      {projects.length === 0 ? (
        <div className="empty-state" role="status">
          プロジェクトがまだありません。このページのフォームから作成できます。
        </div>
      ) : (
        projects.map((project) => {
          const percent =
            project.taskCount === 0
              ? 0
              : Math.round((project.doneTaskCount / project.taskCount) * 100);

          return (
            <article key={project.id} className="card project-card">
              <div className="cluster">
                <span
                  className="color-dot"
                  style={{ background: project.color }}
                  aria-hidden="true"
                />
                <h2 className="card-title">
                  <a href={`/projects/${project.id}`}>{project.name}</a>
                </h2>
              </div>
              <p className="muted">{project.description}</p>
              <div
                className="progress"
                role="progressbar"
                aria-label={`${project.name} の進捗`}
                aria-valuemin={0}
                aria-valuemax={project.taskCount}
                aria-valuenow={project.doneTaskCount}
              >
                <span style={{ width: `${percent}%` }} />
              </div>
              <p className="muted">
                完了 {project.doneTaskCount} / {project.taskCount} 件（未完了{" "}
                {project.openTaskCount} 件）
              </p>
              <p className="muted">オーナー: {userNameById.get(project.ownerId) ?? "不明"}</p>
            </article>
          );
        })
      )}
    </div>
  );
}

/**
 * `/projects` の一覧ページです。
 *
 * 自前のローダーを持たず、親 (`/projects` レイアウト) の `projectsLoader` を
 * 親ローダー継承で受け取ります。子にローダーがなければ親のデータが見える、
 * という pera1 の継承規則の実演です。
 * 作成フォームは `Suspense` の外に置き、一覧だけを `ProjectListSkeleton` で
 * 穴埋めします。作成中のボタン表示（領域限定の良い例）は維持します。
 */
export default function ProjectsPage() {
  const formAction = useFormAction();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="split-grid">
      <React.Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList />
      </React.Suspense>

      <form
        className="card form-stack"
        method="post"
        action={formAction}
        data-testid="project-create-form"
      >
        <h2 className="card-title">プロジェクトを追加</h2>
        <label className="field">
          プロジェクト名
          <input className="input" name="name" placeholder="例: 新しい企画" />
        </label>
        <label className="field">
          説明
          <textarea
            className="textarea"
            name="description"
            rows={3}
            placeholder="任意で入力できます"
          />
        </label>
        <CreateProjectError />
        <button type="submit" className="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? "作成中…" : "作成する"}
        </button>
      </form>
    </div>
  );
}
