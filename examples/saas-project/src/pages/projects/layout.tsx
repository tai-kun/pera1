import {
  type LoaderFunctionArgs,
  Outlet,
  redirectToLogin,
  useLoaderData,
  useParams,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { findProject } from "../../api/projects.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  const projectId = params["projectId"];
  if (projectId === undefined) {
    throw new Error("projectId が指定されていません。");
  }
  // `/app/projects/new` は静的ルートが完全一致した時点で param 兄弟が
  // マッチ鎖から除外されるため (matchRoutes の static 優先)、ここでの
  // `projectId === "new"` 分岐は不要です。
  return { projectId, project: await findProject(projectId) };
}

export default function ProjectLayout() {
  const params = useParams<"/app/projects/:projectId">();
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (!data.project) {
    return (
      <>
        <h2>プロジェクトが見つかりません</h2>
        <p>ID: {data.projectId} のプロジェクトは存在しません。</p>
        <p>
          <a href="/app/projects">一覧に戻る</a>
        </p>
      </>
    );
  }
  const base = `/app/projects/${data.project.id}`;
  // `/app/projects/:projectId` 単体への誘導は `indexRedirect` (routes.tsx) に宣言しています。
  const displayName = data.project.name ?? params.projectId;

  return (
    <section>
      <h2>Project: {displayName}</h2>
      <p>{data.project.description}</p>
      <nav aria-label="プロジェクト">
        <a
          href={`${base}/overview`}
          aria-current={pathname === `${base}/overview` ? "page" : undefined}
        >
          Overview
        </a>
        {" | "}
        <a href={`${base}/tasks`} aria-current={pathname === `${base}/tasks` ? "page" : undefined}>
          Tasks
        </a>
        {" | "}
        <a
          href={`${base}/members`}
          aria-current={pathname === `${base}/members` ? "page" : undefined}
        >
          Members
        </a>
        {" | "}
        <a
          href={`${base}/settings`}
          aria-current={pathname === `${base}/settings` ? "page" : undefined}
        >
          Settings
        </a>
      </nav>
      <Outlet />
    </section>
  );
}
