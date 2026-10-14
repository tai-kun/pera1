import {
  type LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useParams,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { listUsers } from "../../../api/auth.js";
import { findProject } from "../../../api/projects.js";
import { ProjectHeaderSkeleton, TaskListSkeleton } from "../../../components/skeleton.js";

/**
 * プロジェクト詳細の共通データを返します。
 *
 * 見つからないプロジェクトは入力不備ではなく URL の誤りなので、例外を投げて
 * エラーバウンダリーの既定 UI に委ねます。
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const id = params["projectId"];
  if (id === undefined) {
    throw new Error("projectId が指定されていません。");
  }

  const project = await findProject(id);
  if (project === undefined) {
    throw new Error(`プロジェクト「${id}」が見つかりません。`);
  }

  const users = await listUsers();
  const owner = users.find((user) => user.id === project.ownerId) ?? null;

  return { project, owner };
}

/**
 * パンくずの現在地（プロジェクト名）だけを描画します。
 *
 * 親レイアウトで `React.use` するとレイアウト全体が suspend してしまうため、
 * 子コンポーネントに分けて `Suspense` の内側で読みます。静的な
 * 「プロジェクト一覧」リンクは親に残し、ここは現在地だけを返します。
 */
function ProjectNameCrumb() {
  const { project } = React.use(useLoaderData<typeof loader>());

  return (
    <li>
      <span aria-current="page">{project.name}</span>
    </li>
  );
}

/**
 * プロジェクトのヘッダーだけを描画します。
 *
 * データ読みを親から分離し、`Suspense` の fallback（`ProjectHeaderSkeleton`）で
 * 骨格を保ちます。`data-testid="project-header"` と文言は維持します。
 */
function ProjectHeader() {
  const { project, owner } = React.use(useLoaderData<typeof loader>());

  return (
    <header className="card project-header" data-testid="project-header">
      <div className="cluster">
        <span className="color-dot" style={{ background: project.color }} aria-hidden="true" />
        <h1 className="page-title">{project.name}</h1>
      </div>
      <p className="page-lead">{project.description}</p>
      <p className="muted">オーナー: {owner?.name ?? "不明"}</p>
    </header>
  );
}

/**
 * `/projects/:projectId` 配下の共通レイアウトです。
 *
 * パンくずとプロジェクトのヘッダーを描画し、タスク一覧やタスク詳細を `Outlet` に流します。
 * データ読みは子コンポーネントに分離し、親の骨格（パンくずの静的部分・サブナビ）は
 * 常時表示します。ヘッダーは `ProjectHeaderSkeleton`、本体は `TaskListSkeleton` で
 * 穴埋めします（ポップコーン UI）。
 */
export default function ProjectLayout() {
  const { projectId } = useParams<"/projects/:projectId">();
  const path = useRoutePath();

  return (
    <section className="stack">
      <nav className="breadcrumb" aria-label="プロジェクト内パンくず">
        <ol>
          <li>
            <a href="/projects">プロジェクト一覧</a>
          </li>
          <li aria-hidden="true">/</li>
          <React.Suspense
            fallback={
              <li aria-hidden="true">
                <span className="skeleton" style={{ width: "6rem", height: "1.25rem" }} />
              </li>
            }
          >
            <ProjectNameCrumb />
          </React.Suspense>
        </ol>
      </nav>

      <React.Suspense fallback={<ProjectHeaderSkeleton />}>
        <ProjectHeader />
      </React.Suspense>

      <nav className="app-nav sub-nav" aria-label="プロジェクト内のタブ">
        <a
          href={`/projects/${projectId}`}
          aria-current={path.pathname.startsWith(`/projects/${projectId}`) ? "page" : undefined}
        >
          タスク
        </a>
      </nav>

      <React.Suspense fallback={<TaskListSkeleton />}>
        <Outlet />
      </React.Suspense>
    </section>
  );
}
