import { type LoaderFunctionArgs, redirectToLogin, useLoaderData } from "@pera1/react";
import * as React from "react";

import { getCurrentUser } from "../../api/auth.js";
import { findProject } from "../../api/projects.js";
import { listTasks, toggleTask } from "../../api/tasks.js";

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
    return { projectId, project: undefined, tasks: [] };
  }

  return { projectId, project, tasks: await listTasks(projectId) };
}

export default function TasksPage() {
  const data = React.use(useLoaderData<typeof loader>());
  const [tasks, setTasks] = React.useState(data.tasks);
  React.useEffect(() => {
    setTasks(data.tasks);
  }, [data]);

  if (!data.project) {
    return (
      <>
        <h3>プロジェクトが見つかりません</h3>
        <p>ID: {data.projectId} のプロジェクトは存在しません。</p>
      </>
    );
  }

  const projectId = data.projectId;

  async function handleToggle(taskId: string) {
    const next = await toggleTask(projectId, taskId);
    if (next) {
      setTasks(next);
    }
  }

  return (
    <>
      <h3>Tasks</h3>
      <p>プロジェクト: {data.project.name}</p>
      {tasks.length === 0 ? (
        <p>タスクがありません。</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => void handleToggle(task.id)}
                />
                {task.title}
                {task.done ? " (完了)" : ""}
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
