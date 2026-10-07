import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../api/auth.js";
import { listProjects } from "../api/projects.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = getCurrentUser();
  if (!user) {
    return redirectToLogin(request);
  }

  return { user, projects: await listProjects() };
}

export default function DashboardPage() {
  const data = React.use(useLoaderData<typeof loader>());

  return (
    <>
      <h2>Dashboard</h2>
      <p>ようこそ、{data.user.name}さん。</p>
      <p>プロジェクト数: {data.projects.length}</p>
      <ul>
        {data.projects.map((project) => (
          <li key={project.id}>
            <a href={`/app/projects/${project.id}`}>{project.name}</a>
          </li>
        ))}
      </ul>
    </>
  );
}
