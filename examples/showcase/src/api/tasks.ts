import { db, delay, type Task, type TaskPriority, type TaskStatus } from "./db.js";

export type TaskFilters = {
  readonly status?: TaskStatus | undefined;
  readonly query?: string | undefined;
};

/**
 * プロジェクト内のタスクを返します。フィルターは検索フォームから渡されます。
 */
export async function listTasks(
  projectId: string,
  filters: TaskFilters = {},
): Promise<readonly Task[]> {
  await delay();

  return [...db.tasks.values()]
    .filter((task) => task.projectId === projectId)
    .filter((task) => filters.status === undefined || task.status === filters.status)
    .filter((task) => {
      if (filters.query === undefined || filters.query === "") {
        return true;
      }

      return task.title.toLowerCase().includes(filters.query.toLowerCase());
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 1 件のタスクを返します。
 */
export async function findTask(id: string): Promise<Task | undefined> {
  await delay();

  return db.tasks.get(id);
}

/**
 * タスクを作成します。
 *
 * @param assigneeId 担当者のユーザー ID です。未割り当てのときは省略します。
 */
export async function createTask(
  projectId: string,
  title: string,
  priority: TaskPriority,
  attachment: { readonly name: string; readonly size: number } | undefined,
  assigneeId?: string | undefined,
): Promise<Task> {
  await delay();

  if (!db.projects.has(projectId)) {
    throw new Error("プロジェクトが見つかりません。");
  }
  if (title.trim() === "") {
    throw new Error("タスク名を入力してください。");
  }
  if (title.length > 200) {
    throw new Error("タスク名が長すぎます。");
  }
  if (assigneeId !== undefined && !db.users.has(assigneeId)) {
    throw new Error("担当者が見つかりません。");
  }
  if (attachment !== undefined) {
    if (attachment.name.length > 100) {
      throw new Error("添付ファイル名が長すぎます。");
    }
    if (attachment.size > 5 * 1024 * 1024) {
      throw new Error("添付ファイルが大きすぎます。");
    }
  }

  const id = `t-${db.nextTaskId}`;
  db.nextTaskId += 1;
  const task: Task = {
    id,
    projectId,
    title,
    status: "todo",
    priority,
    assigneeId,
    attachment,
    createdAt: new Date().toISOString(),
  };
  db.tasks.set(id, task);

  return task;
}

/**
 * タスクの状態を変更します。
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task | undefined> {
  await delay();

  const task = db.tasks.get(id);
  if (!task) {
    return undefined;
  }

  const updated: Task = { ...task, status };
  db.tasks.set(id, updated);

  return updated;
}

/**
 * タスクを削除します。
 *
 * @returns 削除できたときに `true` を返します。
 */
export async function deleteTask(id: string): Promise<boolean> {
  await delay();

  return db.tasks.delete(id);
}

/**
 * プロジェクトをまたいでタスクを検索します。`/search` で使います。
 */
export async function searchTasks(filters: TaskFilters): Promise<readonly Task[]> {
  await delay();

  return [...db.tasks.values()]
    .filter((task) => filters.status === undefined || task.status === filters.status)
    .filter((task) => {
      if (filters.query === undefined || filters.query === "") {
        return true;
      }

      const query = filters.query.toLowerCase();

      return task.title.toLowerCase().includes(query);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * ダッシュボード用の集計を返します。
 */
export async function summarize(): Promise<{
  readonly projectCount: number;
  readonly taskCount: number;
  readonly openTaskCount: number;
  readonly doneTaskCount: number;
}> {
  await delay();

  const tasks = [...db.tasks.values()];

  return {
    projectCount: db.projects.size,
    taskCount: tasks.length,
    openTaskCount: tasks.filter((task) => task.status !== "done").length,
    doneTaskCount: tasks.filter((task) => task.status === "done").length,
  };
}
