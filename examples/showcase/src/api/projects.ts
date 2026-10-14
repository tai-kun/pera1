import { getCurrentUser } from "./auth.js";
import { db, delay, type Project, type User } from "./db.js";

/**
 * タスク件数を含むプロジェクトの集計ビューです。
 */
export type ProjectSummary = Project & {
  readonly taskCount: number;
  readonly openTaskCount: number;
  readonly doneTaskCount: number;
};

/**
 * タスク件数を添えたプロジェクト一覧を返します。
 */
export async function listProjectSummaries(): Promise<readonly ProjectSummary[]> {
  const projects = await listProjects();

  return projects.map((project) => {
    const tasks = [...db.tasks.values()].filter((task) => task.projectId === project.id);

    return {
      ...project,
      taskCount: tasks.length,
      openTaskCount: tasks.filter((task) => task.status !== "done").length,
      doneTaskCount: tasks.filter((task) => task.status === "done").length,
    };
  });
}

/**
 * 作成日時の降順でプロジェクト一覧を返します。
 */
export async function listProjects(): Promise<readonly Project[]> {
  await delay();

  return [...db.projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 1 件のプロジェクトを返します。
 */
export async function findProject(id: string): Promise<Project | undefined> {
  await delay();

  return db.projects.get(id);
}

/**
 * プロジェクトを作成します。
 *
 * @param name プロジェクト名です。空文字は呼び出し側で弾いてください。
 * @param description 説明文です。
 */
export async function createProject(name: string, description: string): Promise<Project> {
  await delay();

  if (name.trim() === "") {
    throw new Error("プロジェクト名を入力してください。");
  }
  if (name.length > 200) {
    throw new Error("プロジェクト名が長すぎます。");
  }
  if (description.length > 2000) {
    throw new Error("説明が長すぎます。");
  }

  const owner: User | null = getCurrentUser();
  const id = `p-${db.nextProjectId}`;
  db.nextProjectId += 1;
  const project: Project = {
    id,
    name,
    description,
    color: pickColor(id),
    ownerId: owner?.id ?? "u-admin",
    createdAt: new Date().toISOString(),
  };
  db.projects.set(id, project);

  return project;
}

/**
 * 年で絞り込んだプロジェクトを返します。`/archive/:year?` のデモで使います。
 */
export async function listProjectsByYear(year: number | undefined): Promise<readonly Project[]> {
  const projects = await listProjects();
  if (year === undefined) {
    return projects;
  }

  return projects.filter((project) => new Date(project.createdAt).getFullYear() === year);
}

/**
 * ID からプロジェクトのテーマカラーを決めます。作成順に色が循環します。
 */
function pickColor(id: string): string {
  const palette = ["#6366f1", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];
  const index = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return palette[index % palette.length]!;
}
