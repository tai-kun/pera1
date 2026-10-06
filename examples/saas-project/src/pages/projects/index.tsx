import {
  type LoaderFunctionArgs,
  RedirectResponse,
  redirect,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser, loginUrlFor } from "../../api/auth.js";
import { listProjects } from "../../api/projects.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirect(loginUrlFor(request.url.pathname, request.url.search));
  }
  return { projects: await listProjects() };
}

export default function ProjectsPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data instanceof RedirectResponse) {
    // loader の `redirect()` はエンジンが自動遷移させるため、ここでは何も描画しない。
    return null;
  }

  return (
    <>
      <h2>Projects</h2>
      <p>
        <a href="/app/projects/new">New Project</a>
      </p>
      <ul>
        {data.projects.map((project) => (
          <li key={project.id}>
            <a href={`/app/projects/${project.id}`}>{project.name}</a>
            {` - ${project.description}`}
          </li>
        ))}
      </ul>
    </>
  );
}
