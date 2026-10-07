import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { listMembers } from "../../api/members.js";
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
  const project = await findProject(projectId);
  if (!project) {
    return { projectId, project: undefined, members: [] };
  }
  return { projectId, project, members: await listMembers(projectId) };
}

export default function MembersPage() {
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
      <h3>Members</h3>
      <p>プロジェクト: {data.project.name}</p>
      <ul>
        {data.members.map((member) => (
          <li key={member.id}>
            {member.name} ({member.email}) - {member.role}
          </li>
        ))}
      </ul>
    </>
  );
}
