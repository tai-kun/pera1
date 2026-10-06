import {
  type LoaderFunctionArgs,
  type ShouldReloadFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../../api/auth.js";
import { findProject } from "../../api/projects.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  const projectId = params["projectId"];
  if (projectId === undefined) {
    throw new Error("projectId が指定されていません。");
  }
  if (projectId === "new") {
    return { projectId, project: undefined };
  }
  return { projectId, project: await findProject(projectId) };
}

export function shouldReload(args: ShouldReloadFunctionArgs) {
  if (args.defaultShouldReload) {
    return true;
  }
  return args.currentParams["projectId"] !== args.prevParams["projectId"];
}

export default function ProjectSettingsPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }
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
      <h3>Project Settings</h3>
      <p>プロジェクト名: {data.project.name}</p>
      <p>説明: {data.project.description}</p>
      <p>このデモでは設定の変更は無効です。</p>
    </>
  );
}
