import {
  type LoaderFunctionArgs,
  redirectToLogin,
  useLoaderData,
  useNavigate,
} from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { createProject } from "../../api/projects.js";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!getCurrentUser()) {
    return redirectToLogin(request);
  }
  return { authenticated: true as const };
}

export default function NewProjectPage() {
  const data = React.use(useLoaderData<typeof loader>());
  if (data === null) {
    return null;
  }

  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (name === "") {
      setError("プロジェクト名を入力してください。");
      return;
    }
    setError(null);
    const project = await createProject(name, description);
    navigate(`/app/projects/${project.id}`);
  }

  return (
    <>
      <h2>New Project</h2>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            プロジェクト名
            <input name="name" type="text" autoComplete="off" />
          </label>
        </p>
        <p>
          <label>
            説明
            <input name="description" type="text" autoComplete="off" />
          </label>
        </p>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit">作成</button>
      </form>
    </>
  );
}
