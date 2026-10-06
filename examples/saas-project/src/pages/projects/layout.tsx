import {
  type LoaderFunctionArgs,
  Outlet,
  RedirectResponse,
  redirect,
  useLoaderData,
  useParams,
  useRoutePath,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../../api/auth.js";
import { findProject } from "../../api/projects.js";
import RedirectTo from "../../components/redirect-to.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  const projectId = params["projectId"];
  if (projectId === undefined) {
    throw new Error("projectId が指定されていません。");
  }
  // `/app/projects/new` は静的ルートが優先されますが、詳細度ソート後の
  // マッチ鎖には親として本レイアウトも含まれるため、`new` は透過させます。
  if (projectId === "new") {
    return { projectId, project: undefined, isNewRoute: true as const };
  }
  return { projectId, project: await findProject(projectId), isNewRoute: false as const };
}

export default function ProjectLayout() {
  const params = useParams<"/app/projects/:projectId">();
  const { pathname } = useRoutePath();
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }
  // `/app/projects/new` の描画時は子 (New Project) へ透過させます。
  if (data.isNewRoute) {
    return <Outlet />;
  }
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
  // `/app/projects/:projectId` 単体は overview へ誘導します (描画側誘導)。
  if (pathname === base) {
    return <RedirectTo response={redirect(`${base}/overview`)} />;
  }
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
