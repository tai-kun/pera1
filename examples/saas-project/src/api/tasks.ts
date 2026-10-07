export type Task = {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
};

const tasksByProject = new Map<string, Task[]>([
  [
    "apollo",
    [
      { id: "apollo-1", title: "要件定義をまとめる", done: true },
      { id: "apollo-2", title: "プロトタイプを構築する", done: false },
      { id: "apollo-3", title: "打ち上げレビューを開く", done: false },
    ],
  ],
  [
    "zephyr",
    [
      { id: "zephyr-1", title: "パフォーマンス計測をする", done: false },
      { id: "zephyr-2", title: "キャッシュ戦略を決める", done: false },
    ],
  ],
  [
    "orion",
    [
      { id: "orion-1", title: "観測会の日程を決める", done: true },
      { id: "orion-2", title: "望遠鏡の在庫を確認する", done: false },
    ],
  ],
]);

export async function listTasks(projectId: string): Promise<Task[]> {
  return tasksByProject.get(projectId) ?? [];
}

export async function toggleTask(projectId: string, taskId: string): Promise<Task[] | undefined> {
  const tasks = tasksByProject.get(projectId);
  if (!tasks) {
    return undefined;
  }

  const next = tasks.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task,
  );
  tasksByProject.set(projectId, next);

  return next;
}
