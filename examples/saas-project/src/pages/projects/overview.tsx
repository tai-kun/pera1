import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
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
  // `/app/projects/new` は static 優先で本ルート自体がマッチしないため、`projectId === "new"` の分岐は不要です。
  return { projectId, project: await findProject(projectId) };
}

export default function OverviewPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (!data.project) {
    return (
      <>
        <h3>プロジェクトが見つかりません</h3>
        <p>ID: {data.projectId} のプロジェクトは存在しません。</p>
      </>
    );
  }

  return (
    <>
      <h3>Overview</h3>
      <p>プロジェクト名: {data.project.name}</p>
      <p>説明: {data.project.description}</p>
      <p>ID: {data.project.id}</p>
    </>
  );
}
