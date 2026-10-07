import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { listProjects } from "../../api/projects.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  return { projects: await listProjects() };
}

export default function ProjectsPage() {
  const data = React.use(useLoaderData<typeof loader>());
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
